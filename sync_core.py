# -*- coding: utf-8 -*-
r"""椰椰工坊 · 项目资料库 —— 资产扫描通用内核。

把「扫描资源 → 归纳条目 → 分类」的通用管线抽出，供各项目复用。
项目间的差异（命名空间 / 分组规则 / 中文名词典 / 权威配置解析 / 分类表 / 资源链）
全部由 sync_specs.py 中的 spec 提供，本模块不感知任何具体项目。
"""

import os
import re
import json
import base64
import datetime

MAX_ICON_BYTES = 64 * 1024  # 单张条目图标 base64 体积上限，超出则退回分类图标
MAX_TEX_BYTES = 48 * 1024   # 单张贴图缩略图 base64 体积上限，超出则只展示路径


def size_str(sz):
    return f"{sz / 1024:.1f} KB" if sz >= 1024 else f"{sz} B"


def mtime_str(fp):
    return datetime.datetime.fromtimestamp(os.path.getmtime(fp)).strftime("%Y-%m-%d %H:%M:%S")


def load_json(fp):
    try:
        with open(fp, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def scan_project(workspace_dir, spec):
    """扫描单个项目，返回 (项目元信息 dict, 条目列表 list)。

    spec 需提供：key / name / rel_dir / norm_id / label_group / anim_group / group_stem /
    tex_group / build_stem_cn / parse_authoritative / categories / classify /
    cn_fallback / share_model_field / anim_self_include / entity_def_via_group_stem /
    protected_stems / scan_tex_dirs / def_labels / head / chains / chain_categories。
    """
    key = spec["key"]
    project_dir = os.path.join(workspace_dir, spec["rel_dir"])
    bp_dir = os.path.join(project_dir, "behavior_pack")
    rp_dir = os.path.join(project_dir, "resource_pack")

    norm_id = spec["norm_id"]
    group_stem = spec["group_stem"]
    label_group = spec["label_group"]
    anim_group = spec["anim_group"]
    tex_group = spec["tex_group"]
    ns_prefix = key + ":"

    def rel_proj(fp):
        """返回从项目目录下一级开始的相对路径，形如 \\resource_pack\\models\\..."""
        return "\\" + os.path.relpath(fp, project_dir).replace("/", "\\")

    print(f"[*] [{key}] 扫描工程: {project_dir}")

    # ── 1. 中文名池（语言包 + 人工补全，由 spec 决定解析口径） ──
    stem_to_cn = spec["build_stem_cn"](rp_dir)
    print(f"[*] [{key}] 中文名池: {len(stem_to_cn)}")

    # ── 2. 权威配置（脚本内显式映射，优先于目录遍历） ──
    food_stems, anim_use, share_targets = spec["parse_authoritative"](
        bp_dir, rp_dir, {"group_stem": group_stem, "load_json": load_json, "norm_id": norm_id})
    print(f"[*] [{key}] 权威配置: 食品链 {len(food_stems)} / 动画引用 {len(anim_use)}")

    # ── 3. 行为包内容注册表 ──
    item_stems, block_entity_stems, block_stems, entity_stems = set(), set(), set(), set()

    items_beh = os.path.join(bp_dir, "netease_items_beh")
    if os.path.isdir(items_beh):
        for f in os.listdir(items_beh):
            if f.endswith(".json"):
                item_stems.add(group_stem(f))

    blk_dir = os.path.join(bp_dir, "netease_blocks")
    if os.path.isdir(blk_dir):
        for f in os.listdir(blk_dir):
            if not f.endswith(".json"):
                continue
            comps = ((load_json(os.path.join(blk_dir, f)) or {}).get("minecraft:block") or {}).get("components", {})
            (block_entity_stems if "netease:block_entity" in comps else block_stems).add(group_stem(f))

    ent_dir = os.path.join(bp_dir, "entities")
    if os.path.isdir(ent_dir):
        for f in os.listdir(ent_dir):
            if f.endswith(".json"):
                entity_stems.add(group_stem(f))

    TRUE_REG = item_stems | block_stems | block_entity_stems | entity_stems
    print(f"[*] [{key}] 注册表: 方块实体 {len(block_entity_stems)} / 普通方块 {len(block_stems)}"
          f" / 物品 {len(item_stems)} / 实体 {len(entity_stems)}")

    # ── 4. 客户端实体映射（动画引用与模型/贴图共享） ──
    entity_anims = {}   # client_entity identifier stem -> 动画 id 列表
    ent_rp_dir = os.path.join(rp_dir, "entity")
    for root, _d, files in os.walk(ent_rp_dir):
        for f in files:
            if not f.endswith(".json"):
                continue
            data = load_json(os.path.join(root, f))
            if not data:
                continue
            ce = (data.get("minecraft:client_entity") or {}).get("description", {})
            ident = norm_id(ce.get("identifier", ""))
            if ident:
                entity_anims[ident] = list((ce.get("animations") or {}).values())

            # 展示实体及共用实体模型/贴图映射
            target_stem = group_stem(f)
            geom = (ce.get("geometry") or {}).get("default", "")
            texs = (ce.get("textures") or {}).get("default", "")
            if isinstance(geom, str) and geom.startswith("geometry."):
                share_targets["models"].setdefault(geom[len("geometry."):], set()).add(target_stem)
            if isinstance(texs, str) and texs:
                share_targets["textures"].setdefault(os.path.basename(texs), set()).add(target_stem)

    # ── 5. 贴图映射（icon 与资源链） ──
    textures = []          # 全部贴图记录
    tex_by_ident = {}      # 标识符（去前缀） -> 贴图记录（保留供调试）
    tex_by_stem = {}       # stem -> 贴图记录（保留供调试）
    known_tex_paths = set()

    def register_tex_record(tid, tpath, src):
        png = os.path.join(rp_dir, tpath + ".png" if not tpath.endswith(".png") else tpath)
        exists = os.path.exists(png)
        base = os.path.join(rp_dir, tpath)
        rel = rel_proj(png if exists else base)
        if rel in known_tex_paths:
            return
        known_tex_paths.add(rel)
        thumb = None
        sz = os.path.getsize(png) if exists else 0
        if exists:
            try:
                raw = open(png, "rb").read()
                if len(raw) <= MAX_TEX_BYTES:
                    thumb = "data:image/png;base64," + base64.b64encode(raw).decode("ascii")
            except Exception:
                thumb = None
        rec = {
            "key": os.path.basename(tpath[:-4] if tpath.endswith(".png") else tpath),
            "identifier": tid,
            "path": tpath[:-4] if tpath.endswith(".png") else tpath,
            "file_name": os.path.basename(tpath) if tpath.endswith(".png") else os.path.basename(tpath) + ".png",
            "rel_path": rel,
            "size_str": size_str(sz) if exists else "缺失",
            "size_bytes": sz,
            "mtime": mtime_str(png) if exists else "—",
            "exists": exists,
            "thumb": thumb,
            "source": src,
            "stem": group_stem(tid),
            "group": tex_group(tpath),
        }
        textures.append(rec)
        tex_by_ident.setdefault(norm_id(tid), rec)
        tex_by_stem.setdefault(rec["stem"], rec)

    # 5.1 纹理索引 JSON（物品图标 / 地形贴图）
    for tex_json, src in (("item_texture.json", "item"), ("terrain_texture.json", "terrain")):
        data = load_json(os.path.join(rp_dir, "textures", tex_json))
        if not data:
            continue
        for tid, tval in (data.get("texture_data") or {}).items():
            tpath = tval.get("textures")
            if isinstance(tpath, list):
                tpath = tpath[0] if tpath else None
            if isinstance(tpath, str):
                register_tex_record(tid, tpath, src)

    # 5.2 目录内的实际 PNG（文件夹 → 资源链分组由 spec 的 tex_group 决定）
    for sub in spec["scan_tex_dirs"]:
        sub_dir = os.path.join(rp_dir, "textures", sub)
        if not os.path.isdir(sub_dir):
            continue
        for root, _d, files in os.walk(sub_dir):
            for fn in files:
                if not fn.lower().endswith(".png"):
                    continue
                full_p = os.path.join(root, fn)
                base_p = os.path.relpath(full_p, rp_dir).replace("\\", "/")[:-4]
                register_tex_record(ns_prefix + fn[:-4], base_p, sub + "-file")

    # 仅取 textures/items 目录贴图的索引（物品栏图标的标准来源）
    tex_by_ident_item = {}
    tex_by_stem_item = {}
    for rec in textures:
        if rec["path"].replace("\\", "/").startswith("textures/items/"):
            tex_by_ident_item.setdefault(norm_id(rec["identifier"]), rec)
            tex_by_stem_item.setdefault(rec["stem"], rec)

    print(f"[*] [{key}] 贴图映射: {len(textures)} 条（items 目录索引 {len(tex_by_stem_item)} 条）")

    def icon_for(stem, identifier):
        """为条目挑选 icon 贴图并转 base64；仅取自 textures/items 目录（物品栏图标标准来源）。
        取不到时返回 None，由页面用分类图标兜底（不拿世界/实体贴图冒充）。"""
        cand = tex_by_ident_item.get(norm_id(identifier))
        if not cand:
            cand = tex_by_stem_item.get(stem)
        if not cand:
            for k in sorted(tex_by_stem_item):
                if k.startswith(stem + "_"):
                    cand = tex_by_stem_item[k]
                    break
        if not cand or not cand["exists"]:
            return None
        try:
            raw = open(os.path.join(rp_dir, cand["path"] + ".png"), "rb").read()
            if len(raw) > MAX_ICON_BYTES:
                return None
            return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")
        except Exception:
            return None

    # ── 6. 扫描模型（剔除 bind 与非几何文件） ──
    all_models = []
    for root, _d, files in os.walk(os.path.join(rp_dir, "models")):
        if os.sep + "bind" in root + os.sep:      # models/bind/** 为绑定空壳，非模型
            continue
        for f in files:
            if not f.endswith(".json"):
                continue
            fp = os.path.join(root, f)
            data = load_json(fp)
            if not isinstance(data, dict):
                continue
            if not ({"minecraft:geometry", "netease:block_geometry"} & set(data.keys())):
                continue                          # 无几何定义 -> 非模型文件
            geo_ids = []
            if isinstance(data.get("minecraft:geometry"), list):
                for g in data["minecraft:geometry"]:
                    gid = (g or {}).get("description", {}).get("identifier")
                    if gid:
                        geo_ids.append(gid)
            if "netease:block_geometry" in data:
                geo_ids.append(f"netease:block_geometry({f[:-5]})")
            sz = os.path.getsize(fp)
            base_f = re.sub(r"\.(?:geo\.)?json$", "", f)
            all_models.append({
                "file_name": f,
                "file_stem": base_f,
                "file_key": base_f,   # 几何标识符口径（如 xxx.geo.json -> xxx），供共享分发匹配
                "rel_path": rel_proj(fp),
                "size_str": size_str(sz), "size_bytes": sz, "mtime": mtime_str(fp),
                "geometry_ids": geo_ids,
                "kind": "netease_block" if os.sep + "netease_block" in fp else "entity",
                "stem": group_stem(f),
                "tag": "hand" if re.search(r"_(?:small_hand|big_hand|hand|arm)$", base_f) else "normal",
                "group": label_group(f),
            })
    print(f"[*] [{key}] 有效模型文件: {len(all_models)}（已剔除 bind 与非几何文件）")

    # ── 7. 扫描动画（校验 animations 键） ──
    all_anims = []
    for root, _d, files in os.walk(os.path.join(rp_dir, "animations")):
        for f in files:
            if not f.endswith(".json"):
                continue
            fp = os.path.join(root, f)
            data = load_json(fp)
            if not isinstance(data, dict) or not isinstance(data.get("animations"), dict) or not data["animations"]:
                continue                          # 非动画文件 -> 剔除
            ids = list(data["animations"].keys())
            sz = os.path.getsize(fp)
            all_anims.append({
                "file_name": f,
                "file_stem": re.sub(r"\.animation\.json$", "", f),
                "rel_path": rel_proj(fp),
                "size_str": size_str(sz), "size_bytes": sz, "mtime": mtime_str(fp),
                "animation_ids": ids, "prefix": (os.path.commonprefix(ids) if ids else "").rstrip("."),
                "stem": group_stem(f),
                "tag": "hand" if (re.search(r"_(?:hand|arm)", f) or any("hand" in i for i in ids)) else "normal",
                "group": anim_group(f, ids),
            })

    # 项目特定的后置修正（如按模型命名反推动画形态）
    post = spec.get("post_process")
    if post:
        post(all_models, all_anims)
    print(f"[*] [{key}] 有效动画文件: {len(all_anims)}")

    # ── 8. 条目归纳与多链分发 ──
    entries = {}
    share_field = spec["share_model_field"]

    def get_entry(stem):
        if stem not in entries:
            cn = stem_to_cn.get(stem) or f"{spec['cn_fallback']}{stem}"
            entries[stem] = {
                "id": stem,
                "identifier": stem if stem.startswith(ns_prefix) else ns_prefix + stem,
                "chinese_name": cn,
                "models": [], "animations": [], "textures": [],
            }
        return entries[stem]

    # 8.1 模型入库与共享分发
    shared_models = set()
    for m in all_models:
        targets = {m["stem"]} | share_targets["models"].get(m[share_field], set())
        if len(targets) > 1:
            shared_models.add(m[share_field])
        for stem in targets:
            get_entry(stem)["models"].append(m)

    # 8.2 物品入库（保证「所有物品」全覆盖）
    if os.path.isdir(items_beh):
        for f in os.listdir(items_beh):
            if f.endswith(".json"):
                get_entry(group_stem(f))

    # 8.3 动画分发：有使用者则分发给使用它的资源链；无使用者归到自身 stem
    for a in all_anims:
        users = anim_use.get(a["prefix"]) or set()
        targets = (users | {a["stem"]}) if spec["anim_self_include"] else (users if users else {a["stem"]})
        for stem in targets:
            get_entry(stem)["animations"].append(a)

    # 8.4 贴图归属与共享分发
    shared_textures = set()
    for t in textures:
        targets = {t["stem"]} | share_targets["textures"].get(t["key"], set())
        if len(targets) > 1:
            shared_textures.add(t["key"])
        for stem in targets:
            get_entry(stem)["textures"].append(t)

    # 8.5 资源去重（按条目内 rel_path）
    def dedup(lst):
        seen, out = set(), []
        for x in lst:
            p = x.get("rel_path")
            if p not in seen:
                seen.add(p)
                out.append(x)
        return out

    for e in entries.values():
        e["models"] = dedup(e["models"])
        e["animations"] = dedup(e["animations"])
        e["textures"] = dedup(e["textures"])

    # 8.6 解散纯共享条目（资源已分发完毕且自身不在真实注册表中）
    protected = spec["protected_stems"]
    drop_stems = spec.get("drop_stems") or set()
    dissolved = 0
    anim_owner = {}
    for e in entries.values():
        for a in e["animations"]:
            anim_owner[a["file_stem"]] = anim_owner.get(a["file_stem"], 0) + 1
    for stem in list(entries.keys()):
        if stem in protected:
            continue
        e = entries[stem]
        if stem in TRUE_REG:
            # 真实注册项默认保留；显式 drop_stems 表示其资源已并入使用方资源链
            if stem in drop_stems:
                del entries[stem]
                dissolved += 1
            continue
        # 无使用者的通用动画（仅自身引用）不单独成条
        if (spec.get("dissolve_anim_only") and e["animations"]
                and not e["models"] and not e["textures"]
                and all(anim_owner.get(a["file_stem"], 0) <= 1 for a in e["animations"])):
            del entries[stem]
            dissolved += 1
            continue
        all_m_shared = all(m[share_field] in shared_models for m in e["models"])
        all_t_shared = all(t["key"] in shared_textures for t in e["textures"])
        if (e["models"] or e["textures"]) and all_m_shared and all_t_shared:
            del entries[stem]
            dissolved += 1
    print(f"[*] [{key}] 解散纯共享组条目: {dissolved} 个")

    # 8.7 定义信息（客户端实体 / 方块 / 物品 / 动画映射）
    via_group = spec["entity_def_via_group_stem"]
    ent_anims_stems = {group_stem(x) for x in entity_anims} if via_group else set()
    for stem, e in entries.items():
        e["definitions"] = {
            "client_entity": bool(stem in entity_anims or stem in ent_anims_stems
                                  or any(norm_id(x) == stem for x in entity_anims)),
            "block_entity": stem in block_entity_stems,
            "block": stem in block_stems,
            "item": stem in item_stems,
            "food": stem in food_stems,
        }

    # ── 9. 分类（优先级单归类） ──
    CATEGORIES = spec["categories"]
    classify = spec["classify"]
    # 注册表上下文：spec.classify 依赖（食物链 / 方块 / 方块实体 / 物品 / 实体）
    ctx = {
        "food": food_stems,
        "block": block_stems,
        "block_entity": block_entity_stems,
        "item": item_stems,
        "entity": entity_stems,
    }
    cat_meta = {k: {"key": k, "name": n, "desc": d, "count": 0} for k, n, d in CATEGORIES}
    entry_list = []
    for stem, e in entries.items():
        if not e["models"] and not e["animations"] and not e["textures"]:
            continue                              # 无任何可展示资源的空条目
        cat = classify(stem, ctx)
        if cat not in cat_meta:
            cat = CATEGORIES[-1][0]
        e["category"] = cat
        e["category_name"] = cat_meta[cat]["name"]
        e["model_count"] = len(e["models"])
        e["anim_count"] = len(e["animations"])
        e["texture_count"] = len(e["textures"])
        e["icon"] = icon_for(stem, e["identifier"])
        cat_meta[cat]["count"] += 1
        entry_list.append(e)

    entry_list.sort(key=lambda x: (x["category"], -x["model_count"], x["chinese_name"]))

    proj_meta = {
        "project_key": key,
        "project_name": spec["name"],
        "project_rel_path": spec["rel_dir"].replace("\\", "/"),
        "total_entries": len(entry_list),
        "total_models": len(all_models),
        "total_animations": len(all_anims),
        "total_textures": len(textures),
        "icon_hit": sum(1 for e in entry_list if e["icon"]),
        "categories": [cat_meta[k] for k, _n, _d in CATEGORIES],
        "chains": spec["chains"],
        "chain_categories": spec["chain_categories"],
        "def_labels": spec["def_labels"],
        "head": spec["head"],
    }
    print(f"[*] [{key}] 条目: {len(entry_list)} | icon 命中: {proj_meta['icon_hit']}")
    for k, _n, _d in CATEGORIES:
        print(f"    - {cat_meta[k]['name']}: {cat_meta[k]['count']}")
    return proj_meta, entry_list
