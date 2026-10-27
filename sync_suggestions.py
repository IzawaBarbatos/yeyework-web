# -*- coding: utf-8 -*-
r"""
意见征集数据转换：SeaTable / CSV -> suggestions.json

用法：
    # 从 SeaTable API 读取（每日 GitHub Actions 用这个）
    python sync_suggestions.py --seatable

    # 本地 CSV 兜底
    python sync_suggestions.py 导出文件.csv
    python sync_suggestions.py 导出文件.csv --dry-run

SeaTable 环境变量：
    SEATABLE_API_TOKEN    只读 API Token
    SEATABLE_BASE_UUID    表格 base_uuid
    SEATABLE_TABLE        表名，默认「内容征集」
    SEATABLE_SERVER       服务地址，默认 https://cloud.seatable.cn

规则：
- 按「项目」字段分流到 yybld / yyzct
- 有「审核状态」字段时，仅保留审核通过的行
- 已有条目按记录 ID 保留编号；新条目按项目分配 B-001 / Z-001
- 全量重建：对应项目的公示列表会按本次数据重建
- 只依赖标准库
"""

import argparse
import csv
import datetime
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_JSON = os.path.join(SCRIPT_DIR, "suggestions.json")
DEFAULT_SEATABLE_SERVER = "https://cloud.seatable.cn"

# SeaTable 字段名（与表内实际列名保持一致）
SEATABLE_COLS = {
    "project": "项目",
    "type": "内容类型",
    "content": "想添加的内容",
    "date": "提交时间",
    "audit": "审核状态",
    "source_id": "_id",
}

PROJECT_KEYS = {"便利店": "yybld", "中餐厅": "yyzct"}
TYPE_GROUPS = [
    ("食品·饮料 / 菜品·主食", ("食品", "饮料", "菜品", "主食")),
    ("家具 / 建材 / 装饰", ("家具", "建材", "装饰")),
    ("玩法·功能", ("玩法", "功能")),
]

# 表头别名，按优先级匹配；匹配后会标记为已占用，避免「内容类型」被当成「内容」
HEADER_ALIASES = {
    "project": ["项目", "所属项目"],
    "type": ["内容类型", "类型"],
    "content": ["想添加的内容", "添加内容", "建议内容", "内容"],
    "date": ["提交时间", "提交日期", "时间", "日期"],
    "source_id": ["答卷id", "答卷编号", "序号", "id"],
    "audit": ["审核状态", "审核结果", "审核"],
}

APPROVED_WORDS = ("有效", "通过", "采纳", "是", "y", "yes", "true", "1")
REJECTED_WORDS = ("无效", "不通过", "未通过", "未审核", "待审核", "否", "n", "no", "false", "0")


def norm_header(value):
    """去掉 BOM、题号前缀与空白，统一小写。"""
    s = str(value or "").lstrip("\ufeff").strip()
    s = re.sub(r"^\d+\s*[、.．]\s*", "", s)
    return s.replace(" ", "").replace("\u3000", "").lower()


def pick_column(headers, aliases, used):
    """先精确匹配，再包含匹配；返回原始表头名。"""
    for alias in aliases:
        for h in headers:
            if h in used:
                continue
            if norm_header(h) == alias:
                used.add(h)
                return h
    for alias in aliases:
        for h in headers:
            if h in used:
                continue
            if alias in norm_header(h):
                used.add(h)
                return h
    return ""


def map_columns(headers):
    used = set()
    cols = {}
    # 先占用更具体的列，避免「内容类型」抢走「内容」
    for key in ("project", "type", "source_id", "date", "audit", "content"):
        cols[key] = pick_column(headers, HEADER_ALIASES[key], used)
    return cols


def read_csv(path):
    for enc in ("utf-8-sig", "gbk", "utf-16"):
        try:
            with open(path, "r", newline="", encoding=enc) as f:
                reader = csv.DictReader(f)
                return list(reader), (reader.fieldnames or [])
        except UnicodeDecodeError:
            continue
    raise SystemExit("[!] 无法识别 CSV 编码，请用 Excel 另存为 UTF-8 CSV 后重试")


def fetch_seatable_rows(server, base_uuid, table_name, token):
    """分页读取 SeaTable 记录；只读 Token 即可。"""
    base = server.rstrip("/")
    # SeaTable 5.3+ 统一走 api-gateway；convert_keys=true 让字段按中文列名返回
    endpoint = "%s/api-gateway/api/v2/dtables/%s/rows/" % (base, urllib.parse.quote(base_uuid))
    rows = []
    start = 0
    limit = 1000
    while True:
        query = urllib.parse.urlencode({
            "table_name": table_name,
            "limit": limit,
            "start": start,
            "convert_keys": "true",
        })
        req = urllib.request.Request(endpoint + "?" + query, headers={
            "Authorization": "Token " + token,
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            raise SystemExit("[!] SeaTable API 请求失败 (%s)：%s" % (e.code, detail))
        except (urllib.error.URLError, ValueError) as e:
            raise SystemExit("[!] SeaTable API 连接失败：%s" % e)

        batch = payload.get("rows")
        if batch is None and isinstance(payload.get("data"), dict):
            batch = payload["data"].get("rows")
        if not isinstance(batch, list):
            raise SystemExit("[!] SeaTable 返回格式异常：%s" % str(payload)[:300])
        rows.extend(batch)
        if len(batch) < limit:
            break
        start += len(batch)
    return rows


def map_project(value):
    s = str(value or "").strip()
    for name, key in PROJECT_KEYS.items():
        if name in s or key in s.lower():
            return key
    return ""


def map_type(value):
    s = str(value or "").strip()
    for name, words in TYPE_GROUPS:
        if any(w in s for w in words):
            return name
    return s


def normalize_date(value):
    # SeaTable 可能返回毫秒/秒时间戳
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        ts = float(value)
        if ts > 1e12:
            ts /= 1000.0
        try:
            return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
        except (OSError, ValueError, OverflowError):
            return ""
    s = str(value or "").strip()
    if re.fullmatch(r"\d{10,13}", s):
        return normalize_date(int(s))
    m = re.search(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if not m:
        return ""
    return "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3)))


def normalize_content(value):
    lines = [ln.strip() for ln in str(value or "").splitlines()]
    return "\n".join([ln for ln in lines if ln])


def is_approved(value):
    s = str(value or "").strip().lower()
    if not s:
        return False
    # 先判否定词：避免「未通过」因为包含「通过」被误判为通过
    if any(w in s for w in REJECTED_WORDS):
        return False
    if any(w in s for w in APPROVED_WORDS):
        return True
    return False


def make_key(project, source_id, content, date):
    raw = "%s|%s|%s|%s" % (project, source_id, content, date)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def load_existing(path):
    if not os.path.exists(path):
        return {"updated_at": "", "projects": {"yybld": [], "yyzct": []}}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return {"updated_at": "", "projects": {"yybld": [], "yyzct": []}}
    data.setdefault("projects", {})
    data["projects"].setdefault("yybld", [])
    data["projects"].setdefault("yyzct", [])
    return data


def next_id_number(items, prefix):
    nums = []
    for it in items:
        m = re.match(r"^%s-(\d+)$" % prefix, str(it.get("id", "")))
        if m:
            nums.append(int(m.group(1)))
    return (max(nums) + 1) if nums else 1


def make_item(project, type_name, content, date, key, item_id):
    return {
        "id": item_id,
        "date": date,
        "type": type_name,
        "content": content,
        "key": key,
    }


def main():
    parser = argparse.ArgumentParser(description="SeaTable / CSV -> suggestions.json")
    parser.add_argument("csv_path", nargs="?", help="CSV 文件；使用 --seatable 时可省略")
    parser.add_argument("--seatable", action="store_true", help="从 SeaTable API 读取")
    parser.add_argument("--json", default=DEFAULT_JSON, help="输出 JSON 路径")
    parser.add_argument("--dry-run", action="store_true", help="只统计，不写文件")
    args = parser.parse_args()

    if args.seatable:
        token = os.environ.get("SEATABLE_API_TOKEN", "").strip()
        base_uuid = os.environ.get("SEATABLE_BASE_UUID", "").strip()
        table_name = (os.environ.get("SEATABLE_TABLE", "").strip() or "内容征集")
        server = (os.environ.get("SEATABLE_SERVER", "").strip() or DEFAULT_SEATABLE_SERVER)
        if not token or not base_uuid:
            raise SystemExit("[!] 请设置 SEATABLE_API_TOKEN 和 SEATABLE_BASE_UUID")
        rows = fetch_seatable_rows(server, base_uuid, table_name, token)
        cols = dict(SEATABLE_COLS)
        if rows:
            keys = set(rows[0].keys())
            required = [cols["project"], cols["content"], cols["audit"]]
            missing_fields = [k for k in required if k not in keys]
            if missing_fields:
                raise SystemExit("[!] SeaTable 表格缺少字段：%s" % "、".join(missing_fields))
        print("[i] SeaTable 读取到 %d 条记录" % len(rows))
        has_audit = bool(cols["audit"])
    else:
        if not args.csv_path:
            parser.error("需要 CSV 文件，或使用 --seatable")
        if args.csv_path.lower().endswith((".xlsx", ".xls")):
            raise SystemExit("[!] 请先用 Excel / WPS 将导出文件另存为 CSV（UTF-8），再运行本脚本")
        rows, headers = read_csv(args.csv_path)
        cols = map_columns(headers)
        missing = [name for name in ("project", "content") if not cols.get(name)]
        if missing:
            raise SystemExit("[!] 缺少必要列：%s\n检测到的表头：%s" % ("、".join(missing), headers))
        has_audit = bool(cols["audit"]) and any(str(r.get(cols["audit"], "")).strip() for r in rows)
        if not has_audit:
            print("[i] 未检测到有效的审核状态列：CSV 中全部行都按「已通过」处理，请确认导出前已剔除无效答卷")

    existing = load_existing(args.json)
    existing_by_key = {}
    for key, items in existing["projects"].items():
        for it in items:
            if it.get("key"):
                existing_by_key[it["key"]] = it

    counts = {"yybld": 0, "yyzct": 0}
    skipped = 0
    new_by_project = {"yybld": [], "yyzct": []}
    next_num = {
        "yybld": next_id_number(existing["projects"]["yybld"], "B"),
        "yyzct": next_id_number(existing["projects"]["yyzct"], "Z"),
    }

    for row in rows:
        project = map_project(row.get(cols["project"], ""))
        content = normalize_content(row.get(cols["content"], ""))
        if not project or not content:
            skipped += 1
            continue
        if has_audit and not is_approved(row.get(cols["audit"], "")):
            skipped += 1
            continue
        if len(content) > 500:
            print("[!] 跳过超长内容（>500 字）：%s" % content[:30])
            skipped += 1
            continue

        type_name = map_type(row.get(cols["type"], "")) or "未分类"
        date = normalize_date(row.get(cols["date"], ""))
        source_id = str(row.get(cols["source_id"], "")).strip() if cols["source_id"] else ""
        key = make_key(project, source_id, content, date)

        old = existing_by_key.get(key)
        if old:
            item_id = old.get("id") or ("%s-%03d" % ("B" if project == "yybld" else "Z", next_num[project]))
            if not old.get("id"):
                next_num[project] += 1
        else:
            item_id = "%s-%03d" % ("B" if project == "yybld" else "Z", next_num[project])
            next_num[project] += 1

        new_by_project[project].append(make_item(project, type_name, content, date, key, item_id))
        counts[project] += 1

    for key in ("yybld", "yyzct"):
        # 同一次导出里出现重复行时按 key 去重
        dedup = {}
        for it in new_by_project[key]:
            dedup[it["key"]] = it
        items = list(dedup.values())
        items.sort(key=lambda it: (it.get("date", ""), it.get("id", "")), reverse=True)
        existing["projects"][key] = items

    existing["updated_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("[=] 便利店 %d 条，中餐厅 %d 条，跳过 %d 条" % (counts["yybld"], counts["yyzct"], skipped))
    if args.dry_run:
        print("[i] dry-run：未写入 %s" % args.json)
        return

    with open(args.json, "w", encoding="utf-8", newline="\n") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("[+] 已写入 %s" % args.json)


if __name__ == "__main__":
    main()
