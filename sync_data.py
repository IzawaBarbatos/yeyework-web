# -*- coding: utf-8 -*-
r"""
椰椰工坊：便利店 —— 美术资产对照表 一键同步脚本
作用：扫描工程资源（模型 / 动画 / 贴图 / 语言包 / 脚本配置）
      -> 按「暴露给玩家的内容」归纳为条目并分类
      -> 输出外链数据文件 data.js（页面运行时加载）与 data.json（调试/工具用）
      -> 清理 index.html 内的历史内联数据块（替换为轻量占位，使页面保持小体积）
用法：在本目录执行  python sync_data.py
"""

import os
import re
import json
import base64
import datetime

# ────────────────────────────── 路径常量 ──────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else \
    r"D:\0.minecraft\Models\QuMod工作区\QuModProject\项目对照查询网站"
WORKSPACE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..")) if os.path.isdir(os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))) else \
    r"D:\0.minecraft\Models\QuMod工作区"
PROJECT_REL = r"QuModProject\椰椰工坊：便利店"
PROJECT_DIR = os.path.join(WORKSPACE_DIR, PROJECT_REL)
BP_DIR = os.path.join(PROJECT_DIR, "behavior_pack")
RP_DIR = os.path.join(PROJECT_DIR, "resource_pack")
OUTPUT_DIR = SCRIPT_DIR

MAX_ICON_BYTES = 64 * 1024  # 单张条目图标 base64 体积上限，超出则退回分类图标
MAX_TEX_BYTES = 48 * 1024   # 单张贴图缩略图 base64 体积上限，超出则只展示路径

print(f"[*] 扫描工程: {PROJECT_DIR}")


def rel_proj(fp):
    """返回从「椰椰工坊：便利店」下一级开始的相对路径，形如 \\resource_pack\\models\\..."""
    return "\\" + os.path.relpath(fp, PROJECT_DIR).replace("/", "\\")


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


# ────────────────────────────── 标识符归一化 ──────────────────────────────
def norm_id(s):
    """统一小写、去命名空间前缀、合并重复 yybld_ 前缀、去 _item 后缀。"""
    s = str(s).strip().lower()
    s = re.sub(r"^(?:yybld|minecraft):", "", s)
    s = s.replace("yybld_yybld_", "yybld_")
    return s


# 装饰性后缀（长后缀优先，避免 _hand 抢在 _small_hand 之前命中）
DECOR_SUFFIXES = ("_small_hand", "_big_hand", "_hand", "_arm", "_hold", "_bind")


def label_group(name):
    """由文件名/标识符推导资源所属形态组：hold / display / hand / block。"""
    s = norm_id(name)
    for ext in (".geo.json", ".animation.json", ".json", ".png"):
        if s.endswith(ext):
            s = s[:-len(ext)]
            break
    if "_hold" in s:
        return "hold"
    if "_display" in s or s.startswith("yybld_display_"):
        return "display"
    if any(s.endswith(suf) for suf in ("_small_hand", "_big_hand", "_hand", "_arm")):
        return "hand"
    return "block"


def anim_group(fname, anim_ids):
    """动画形态分组：进食/饮用/手持归 hand；display 归 display；hold 归 hold；其余归 block。"""
    s = norm_id(fname)
    if "_hold" in s:
        return "hold"
    if "_display" in s or s.startswith("yybld_display_"):
        return "display"
    if any(k in s for k in ("_hand", "_arm", "_eat", "_drink", "drink", "eat")) or \
       any(any(k in aid for k in ("hand", "arm", "eat", "drink")) for aid in anim_ids):
        return "hand"
    return "block"


def group_stem(name):
    """由文件名/标识符推导「条目主键 stem」（把同一内容的多套资源归到一组）。"""
    s = norm_id(name)
    for ext in (".geo.json", ".animation.json", ".json"):
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    if s.endswith("_item"):
        s = s[:-5]
    # 通用展示实体不做前缀剥离，单独成条
    if s.startswith("yybld_display_universal"):
        return "yybld_display_universal"
    for suf in DECOR_SUFFIXES:
        if s.endswith(suf):
            s = s[: -len(suf)]
            break
    s = re.sub(r"^yybld_display_", "yybld_", s)      # 货架展示模型并入本体
    s = re.sub(r"_(?:kai|guan|closed|open)$", "", s)  # 开关/关门状态态
    s = re.sub(r"^yybld_guandeng_(.+)_z$", r"yybld_guandeng_\1", s)  # 管灯朝向变体归并本体
    # 自动联通方块（吸顶灯 16 态 / 管灯 8 态）按入口方块归并为一条
    if s.startswith("yybld_xidingdeng_"):
        return "yybld_xidingdeng"
    if s.startswith("yybld_guandeng_"):
        return "yybld_guandeng"
    # 连锁放置多方块（自动贩卖机本体 + zdfmj_white2~6 部件）归并到入口方块一条
    if s.startswith("yybld_zdfmj_"):
        return "yybld_zidongfanmaiji"
    # 红烧牛肉面各状态模型 / 手持模型 并入对应方块身份（_1.._6 与方块 id 同号）
    s = re.sub(r"^yybld_fangbianmian_hongshaoniurou_([1-6])$", r"yybld_fangbianmian_\1", s)
    if s.startswith("yybld_tuilamen"):
        return "yybld_tuilamen"
    if s.startswith("yybld_binggui_left"):
        return "yybld_binggui_left"
    if s.startswith("yybld_binggui_right"):
        return "yybld_binggui_right"
    return s


# ────────────────────────────── 1. 语言包中文名 ──────────────────────────────
key_to_cn = {}
lang_file = os.path.join(RP_DIR, "texts", "zh_CN.lang")
if os.path.exists(lang_file):
    with open(lang_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = re.sub(r"^(?:tile|item|entity)\.(?:yybld:)?", "", k.strip())
                k = re.sub(r"\.name$", "", k)
                key_to_cn[norm_id(k)] = re.sub(r"§[0-9a-fk-or]", "", v.strip())

# 人工补全的语义中文名（语言包无法覆盖的通用/特殊资源）
PREDEFINED_CN = {
    "yybld_arm_hand": "第一人称玩家手臂（通用假手）",
    "yybld_display_universal": "货架商品通用展示实体",
    "yybld_tuilamen": "商超感应双开推拉门",
    "yybld_bingguidangban": "冷藏风幕柜冷气挡板",
    "yybld_binggui_left": "冷藏风幕展示柜（左侧单元组）",
    "yybld_binggui_right": "冷藏风幕展示柜（右侧单元组）",
    "yybld_cleaner": "商超地面保洁洗地机",
    "yybld_shaoshuihu": "便利店电热水壶",
    "yybld_saomaji": "收银条码无线扫码枪",
    "yybld_saomaji_display": "收银条码无线扫码枪（展台置物）",
    "yybld_guitaishouyinji": "便利店收银机柜台一体机",
    "yybld_kongtiaowaiji": "便利店商用空调室外机",
    "yybld_kongtiaoshineiji": "便利店商用空调室内机",
    "yybld_zhaopai": "便利店外立面发光招牌",
    "yybld_zidongfanmaiji": "便利店自动贩卖机",
    # 自动联通方块群（16/8 态归并后以入口方块名显示）
    "yybld_xidingdeng": "吸顶灯",
    "yybld_guandeng": "管灯",
    "yybld_jinmenganyingqi": "便利店金门感应器",
    "yybld_huojia": "便利店金属多层货架",
    "yybld_huojia_mutou": "便利店木质多层货架",
    "yybld_huojiadangban_left": "货架挡板（左）",
    "yybld_huojiadangban_right": "货架挡板（右）",
    "yybld_huojiadangban_wanzheng": "货架挡板（完整）",
    "yybld_xiaoshangpinhuojia": "便利店小商品挂架",
    "yybld_gouwuche_da": "超市购物车（大）",
    "yybld_gouwuche_xiao": "超市购物车（小）",
    "yybld_gouwuche_xiao_man": "超市购物车（小·满载）",
    "yybld_guizi_baise": "便利店白色储物柜",
    "yybld_guizi_baise_boli": "便利店白色玻璃储物柜",
    "yybld_guizi_baise_box": "便利店白色储物柜（箱体）",
    "yybld_guizi_mutou": "便利店木质储物柜",
    "yybld_shexiangtou": "便利店监控摄像头",
    "yybld_shexiangtou_shang": "便利店监控摄像头（顶装）",
    "yybld_saomahe": "收银扫码盒",
    "yybld_yupeng_hongse": "便利店红色遮阳雨棚",
    "yybld_yupeng_juse": "便利店橘色遮阳雨棚",
    "yybld_yupeng_qianlanse": "便利店浅蓝遮阳雨棚",
    "yybld_beizi_big": "大号塑料饮水杯",
    "yybld_beizi_small": "小号塑料饮水杯",
    "yybld_shuibei_big": "大号纸杯",
    "yybld_shuibei_small": "小号纸杯",
    "yybld_canpan_big": "大号快餐托盘",
    "yybld_canpan_small": "小号快餐托盘",
    "yybld_coin_golden_0": "便利店金币（面额 0）",
    "yybld_denglong_zhongqiu_chang": "中秋装饰长形纸灯笼",
    "yybld_denglong_zhongqiu_yuan": "中秋装饰圆形纸灯笼",
    "yybld_bingguihuojia": "冷藏风幕柜置物搁架",
    "yybld_flybag_leibi": "雷碧飞行袋",
    "yybld_rocket_kuoluo": "阔落火箭",
    "yybld_chuan_kqs_baise_b": "白色可乐杯串",
    "yybld_trader": "便利店商人",
    "yybld_binggun_dongbei": "东北大板冰棍",
    "yybld_donggan_pingguoquan": "果圈",
    "yybld_calibration_stick": "校准棒",
    "yybld_qinglijibang": "清理棒",
    "yybld_instbook": "引导手册",
    "yybld_fangbianmianchazi": "方便面叉子",
    "yybld_fangbianmiantiaoliao": "方便面调料包",
    "yybld_shaoshuihu_benti_empty": "电热水壶本体（空）",
    "yybld_shaoshuihu_benti_hot": "电热水壶本体（热水）",
    "yybld_shaoshuihu_benti_water": "电热水壶本体（冷水）",
    "yybld_shaoshuihu_dizuo": "电热水壶底座",
    # 通用共享动画（被多款食品共用，归入「通用资源」）
    "yybld_beverage_drink": "通用瓶装饮用动画（第一人称·大瓶）",
    "yybld_beverage_drink_small": "通用瓶装饮用动画（第一人称·小瓶）",
    "yybld_guanzhuang_drink": "通用罐装饮用动画（第一人称）",
    "yybld_drink": "通用饮用动画",
    "yybld_drink_small": "通用饮用动画（小瓶）",
    "yybld_water_drink_small": "通用饮水动画（小瓶）",
    "yybld_yuebing_eat": "通用月饼食用动画（第一人称）",
    "yybld_fangbianmian_eat": "通用方便面食用动画（第一人称）",
    "yybld_latiao_eat": "通用辣条食用动画（第一人称）",
    "yybld_mianbao_eat": "通用面包食用动画（第一人称）",
    "yybld_kaochang_eat": "通用烤肠食用动画（第一人称）",
    "yybld_tiantong_eat": "通用甜筒食用动画（第一人称）",
    "yybld_yl_houjiao_drink": "通用吼叫饮料饮用动画（第一人称）",
    "yybld_niunaiyl_hezhuang_hand": "通用牛奶饮料盒装手持动画（第一人称）",
    "yybld_eat": "通用食用动画（第一人称）",
    # 共用模型组（多方块 / 多配色复用同一套几何，无独立 lang 条目）
    "yybld_niunai_hezhuang": "牛奶盒装（通用模型组）",
    "yybld_niunai_sanjiaohezhuang": "牛奶三角盒装（通用模型组）",
    "yybld_niunaiyl_hezhuang": "牛奶饮料盒装（通用模型组）",
    "yybld_shupian_tongzhuang": "薯片桶装（通用模型组）",
    "yybld_yl_houjiao": "吼叫饮料（通用模型组）",
    "yybld_yuebing": "月饼（通用模型组）",
    # 面类方块模型组（与各方块状态条目区分）
    "yybld_fangbianmian_hongshaoniurou": "方便面-红烧牛肉（方块模型组）",
    "yybld_fangbianmian_haixian": "方便面-海鲜（方块模型组）",
    # 饮料手持模型组（大瓶）
    "yybld_yl_hongcha_b": "红茶饮料（大瓶模型组）",
    "yybld_yl_kuoluo_b": "阔落饮料（大瓶模型组）",
    "yybld_yl_leibi_b": "雷碧饮料（大瓶模型组）",
    "yybld_yl_shuye_b": "树叶饮料（大瓶模型组）",
    # 共用饮品/食品饮用动画（第一人称）
    "yybld_niunaiyl_hezhuang_drink": "通用牛奶饮料盒装饮用动画（第一人称）",
    "yybld_shupian_tongzhuang_drink": "通用薯片桶装饮用动画（第一人称）",
}
for k, v in PREDEFINED_CN.items():
    key_to_cn.setdefault(norm_id(k), v)

# stem -> 中文名 池（含去 yybld_ 简写）
stem_to_cn = {}
for k, v in key_to_cn.items():
    stem_to_cn[k] = v
    if k.startswith("yybld_"):
        stem_to_cn.setdefault(k[6:], v)

print(f"[*] 中文名词条: {len(key_to_cn)}")


# ────────────────────────────── 2. 脚本配置（食品饮料权威依据） ──────────────────────────────
beverage_py = os.path.join(BP_DIR, "yybld_scripts", "yybld", "client", "beverage_config.py")
food_stems = set()          # 有第一人称动画的食品/饮品 条目主键
anim_use = {}               # 动画名 -> 使用它的食品条目集合（判断是否通用共享）
bev_items = {}
res_tex, res_geo = {}, {}

if os.path.exists(beverage_py):
    with open(beverage_py, "r", encoding="utf-8") as f:
        bev_src = f.read()

    for name, texpath, *rest in re.findall(
        r'\(\s*["\']([^"\']+)["\']\s*,\s*["\'](textures/[^"\']+)["\'](?:\s*,\s*["\']([^"\']+)["\'])?\s*\)', bev_src
    ):
        res_tex[name] = texpath
        res_geo[name] = rest[0] if (rest and rest[0]) else name

    for key, _atype, midx, aname in re.findall(
        r'["\']yybld:([^"\']+)["\']\s*:\s*\(\s*([^,]+),\s*([^,]+),\s*["\']([^"\']+)["\']', bev_src
    ):
        stem = group_stem(key)
        food_stems.add(stem)
        bev_items[stem] = int(float(midx))
        anim_use.setdefault(aname.strip(), set()).add(stem)

    for name in res_tex:
        food_stems.add(group_stem(name))

    for aname in re.findall(r'["\'](animation\.[^"\']+)["\']\s*:', bev_src):
        anim_use.setdefault(aname, set())

# 解析 render_controllers/yybld_drink.render_controllers.json
rc_path = os.path.join(RP_DIR, "render_controllers", "yybld_drink.render_controllers.json")
rc_food = {}
if os.path.exists(rc_path):
    rc_data = load_json(rc_path) or {}
    rc_ctrls = rc_data.get("render_controllers") or rc_data
    for k, v in rc_ctrls.items():
        m = re.match(r"controller\.render\.yybld_food_(\d+)$", k)
        if m:
            g = v.get("geometry")
            if isinstance(g, list):
                g = g[0] if g else ""
            if isinstance(g, str):
                rc_food[int(m.group(1))] = g[len("geometry."):] if g.startswith("geometry.") else g

share_targets = {"models": {}, "textures": {}}
for item_stem, midx in bev_items.items():
    gname = rc_food.get(midx)
    if not gname or gname not in res_geo:
        continue
    geo_file = res_geo[gname]
    tex_base = os.path.basename(res_tex[gname])
    share_targets["models"].setdefault(geo_file, set()).add(item_stem)
    share_targets["textures"].setdefault(tex_base, set()).add(item_stem)

# ────────────────────────────── 3. 行为包内容注册表 ──────────────────────────────
item_stems, block_entity_stems, block_stems, entity_stems = set(), set(), set(), set()

for f in os.listdir(os.path.join(BP_DIR, "netease_items_beh")) if os.path.isdir(os.path.join(BP_DIR, "netease_items_beh")) else []:
    if f.endswith(".json"):
        item_stems.add(group_stem(f))

blk_dir = os.path.join(BP_DIR, "netease_blocks")
if os.path.isdir(blk_dir):
    for f in os.listdir(blk_dir):
        if not f.endswith(".json"):
            continue
        comps = ((load_json(os.path.join(blk_dir, f)) or {}).get("minecraft:block") or {}).get("components", {})
        (block_entity_stems if "netease:block_entity" in comps else block_stems).add(group_stem(f))

ent_dir = os.path.join(BP_DIR, "entities")
if os.path.isdir(ent_dir):
    for f in os.listdir(ent_dir):
        if f.endswith(".json"):
            entity_stems.add(group_stem(f))

TRUE_REG = item_stems | block_stems | block_entity_stems | entity_stems
print(f"[*] 注册表: 食品{len(food_stems)} / 方块实体{len(block_entity_stems)} / 普通方块{len(block_stems)} / 物品{len(item_stems)} / 实体{len(entity_stems)}")

# ────────────────────────────── 4. 客户端实体映射（动画引用与模型/贴图共享） ──────────────────────────────
entity_anims = {}   # client_entity identifier stem -> 动画 id 列表
for root, _d, files in os.walk(os.path.join(RP_DIR, "entity")):
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

        # 货架展示实体 (yybld_display_*.json) 及共用实体模型/贴图映射
        target_stem = group_stem(f)
        geom = (ce.get("geometry") or {}).get("default", "")
        texs = (ce.get("textures") or {}).get("default", "")
        if isinstance(geom, str) and geom.startswith("geometry."):
            geo_key = geom[len("geometry."):]
            share_targets["models"].setdefault(geo_key, set()).add(target_stem)
        if isinstance(texs, str) and texs:
            tex_base = os.path.basename(texs)
            share_targets["textures"].setdefault(tex_base, set()).add(target_stem)

# ────────────────────────────── 5. 贴图映射（icon 与资源链） ──────────────────────────────
textures = []          # 全部贴图记录
tex_by_ident = {}      # 标识符（去前缀） -> 贴图记录
tex_by_stem = {}       # stem -> 贴图记录（首选）
known_tex_paths = set()

def register_tex_record(tid, tpath, src):
    png = os.path.join(RP_DIR, tpath + ".png" if not tpath.endswith(".png") else tpath)
    exists = os.path.exists(png)
    base = os.path.join(RP_DIR, tpath)
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
    base_name = os.path.basename(tpath[:-4] if tpath.endswith(".png") else tpath)
    rec = {
        "key": base_name,
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
        "group": label_group(tpath),
    }
    textures.append(rec)
    key = norm_id(tid)
    tex_by_ident.setdefault(key, rec)
    tex_by_stem.setdefault(rec["stem"], rec)

for tex_json, src in (("item_texture.json", "item"), ("terrain_texture.json", "terrain")):
    p = os.path.join(RP_DIR, "textures", tex_json)
    data = load_json(p)
    if not data:
        continue
    for tid, tval in (data.get("texture_data") or {}).items():
        tpath = tval.get("textures")
        if isinstance(tpath, list):
            tpath = tpath[0] if tpath else None
        if not isinstance(tpath, str):
            continue
        register_tex_record(tid, tpath, src)

# 仅取 textures/items 目录贴图的索引（物品栏图标的标准来源）
tex_by_ident_item = {}
tex_by_stem_item = {}
for rec in textures:
    if rec["path"].replace("\\", "/").startswith("textures/items/"):
        tex_by_ident_item.setdefault(norm_id(rec["identifier"]), rec)
        tex_by_stem_item.setdefault(rec["stem"], rec)

# 补充：textures/items 目录中的实际 PNG
items_dir = os.path.join(RP_DIR, "textures", "items")
if os.path.isdir(items_dir):
    for fn in os.listdir(items_dir):
        if not fn.lower().endswith(".png"):
            continue
        p_rel = "textures/items/" + fn[:-4]
        register_tex_record("yybld:" + fn[:-4], p_rel, "item-file")

# 补充：textures/entity 目录中的实际 PNG（实体/手持/展示贴图全覆盖）
ent_tex_dir = os.path.join(RP_DIR, "textures", "entity")
if os.path.isdir(ent_tex_dir):
    for root, _d, files in os.walk(ent_tex_dir):
        for fn in files:
            if not fn.lower().endswith(".png"):
                continue
            full_p = os.path.join(root, fn)
            r_from_rp = os.path.relpath(full_p, RP_DIR).replace("\\", "/")
            base_p = r_from_rp[:-4]
            register_tex_record("yybld:" + fn[:-4], base_p, "entity-tex")

# 重新刷新 items 索引
for rec in textures:
    if rec["path"].replace("\\", "/").startswith("textures/items/"):
        tex_by_ident_item.setdefault(norm_id(rec["identifier"]), rec)
        tex_by_stem_item.setdefault(rec["stem"], rec)

print(f"[*] 贴图映射: {len(textures)} 条（items 目录索引 {len(tex_by_stem_item)} 条）")


def icon_for(stem, identifier):
    """为条目挑选 icon 贴图并转 base64；仅取自 textures/items 目录（物品栏图标标准来源）。
    取不到时返回 None，由页面用分类图标兜底（不拿世界/实体贴图冒充）。"""
    key = norm_id(identifier)
    # 1) items 目录：标识符精确命中
    cand = tex_by_ident_item.get(key)
    # 2) items 目录：stem 精确命中（含孤儿文件）
    if not cand:
        cand = tex_by_stem_item.get(stem)
    # 3) items 目录：前缀命中（如 yybld_tuilamen -> yybld_tuilamen_1）
    if not cand:
        for k in sorted(tex_by_stem_item):
            if k.startswith(stem + "_"):
                cand = tex_by_stem_item[k]
                break
    if not cand or not cand["exists"]:
        return None
    png = os.path.join(RP_DIR, cand["path"] + ".png")
    try:
        raw = open(png, "rb").read()
        if len(raw) > MAX_ICON_BYTES:
            return None
        return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")
    except Exception:
        return None


# ────────────────────────────── 6. 扫描模型（剔除 bind 与非几何文件） ──────────────────────────────
all_models = []
for root, _d, files in os.walk(os.path.join(RP_DIR, "models")):
    if os.sep + "bind" in root + os.sep:      # models/bind/** 为绑定空壳，非模型
        continue
    for f in files:
        if not f.endswith(".json"):
            continue
        fp = os.path.join(root, f)
        data = load_json(fp)
        if not isinstance(data, dict):
            continue
        keys = set(data.keys())
        if not ({"minecraft:geometry", "netease:block_geometry"} & keys):
            continue                          # 无几何定义 -> 非模型文件（如空索引）
        geo_ids = []
        if isinstance(data.get("minecraft:geometry"), list):
            for g in data["minecraft:geometry"]:
                gid = (g or {}).get("description", {}).get("identifier")
                if gid:
                    geo_ids.append(gid)
        if "netease:block_geometry" in data:
            geo_ids.append(f"netease:block_geometry({f[:-5]})")
        sz = os.path.getsize(fp)
        sub = "netease_block" if os.sep + "netease_block" in fp else "entity"
        base_f = re.sub(r"\.(?:geo\.)?json$", "", f)
        all_models.append({
            "file_name": f,
            "file_stem": base_f,
            "file_key": f[:-5] if f.endswith(".json") else f,
            "rel_path": rel_proj(fp),
            "size_str": size_str(sz), "size_bytes": sz, "mtime": mtime_str(fp),
            "geometry_ids": geo_ids, "kind": sub,
            "stem": group_stem(f),
            "tag": "hand" if re.search(r"_(?:small_hand|big_hand|hand|arm)$", base_f) else "normal",
            "group": label_group(f),
        })

print(f"[*] 有效模型文件: {len(all_models)}（已剔除 bind 与非几何文件）")

# ────────────────────────────── 7. 扫描动画（校验 animations 键） ──────────────────────────────
all_anims = []
anim_dir = os.path.join(RP_DIR, "animations")
for root, _d, files in os.walk(anim_dir):
    for f in files:
        if not f.endswith(".json"):
            continue
        fp = os.path.join(root, f)
        data = load_json(fp)
        if not isinstance(data, dict) or not isinstance(data.get("animations"), dict) or not data["animations"]:
            continue                          # 非动画文件 -> 剔除
        ids = list(data["animations"].keys())
        sz = os.path.getsize(fp)
        prefix = os.path.commonprefix(ids) if ids else ""
        prefix = prefix.rstrip(".") if False else prefix.rstrip(".")
        all_anims.append({
            "file_name": f,
            "file_stem": re.sub(r"\.animation\.json$", "", f),
            "rel_path": rel_proj(fp),
            "size_str": size_str(sz), "size_bytes": sz, "mtime": mtime_str(fp),
            "animation_ids": ids, "prefix": prefix,
            "stem": group_stem(f),
            "tag": "hand" if (re.search(r"_(?:hand|arm)", f) or any("hand" in i for i in ids)) else "normal",
            "group": anim_group(f, ids),
        })

print(f"[*] 有效动画文件: {len(all_anims)}")

# ────────────────────────────── 8. 条目归纳与多链分发 ──────────────────────────────
entries = {}


def get_entry(stem):
    if stem not in entries:
        cn = stem_to_cn.get(stem) or key_to_cn.get(stem) or f"便利店资产-{stem}"
        entries[stem] = {
            "id": stem,
            "identifier": stem if stem.startswith("yybld:") else "yybld:" + stem,
            "chinese_name": cn,
            "models": [], "animations": [], "textures": [],
        }
    return entries[stem]


# 8.1 初始模型入库与共享分发
shared_models = set()
for m in all_models:
    targets = {m["stem"]} | share_targets["models"].get(m["file_key"], set())
    if len(targets) > 1:
        shared_models.add(m["file_key"])
    for stem in targets:
        get_entry(stem)["models"].append(m)

# 8.2 物品入库（保证「所有物品」全覆盖）
for f in (os.listdir(os.path.join(BP_DIR, "netease_items_beh"))
          if os.path.isdir(os.path.join(BP_DIR, "netease_items_beh")) else []):
    if f.endswith(".json"):
        get_entry(group_stem(f))

# 8.3 动画分发：有使用者则分发给每一个使用它的食品资源链；无使用者归到自身 stem
for a in all_anims:
    users = anim_use.get(a["prefix"]) or set()
    targets = users if users else {a["stem"]}
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
    seen = set()
    out = []
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

# 8.6 解散纯共享模型条目（名下资源已分发完毕且自身不在真实物品/方块注册表中）
TRUE_REG = item_stems | block_stems | block_entity_stems | entity_stems
dissolved = 0
for stem in list(entries.keys()):
    if stem not in TRUE_REG:
        e = entries[stem]
        all_m_shared = all(m["file_key"] in shared_models for m in e["models"])
        all_t_shared = all(t["key"] in shared_textures for t in e["textures"])
        if (e["models"] or e["textures"]) and all_m_shared and all_t_shared:
            del entries[stem]
            dissolved += 1

print(f"[*] 解散纯共享组条目: {dissolved} 个")

# 8.8 定义信息（客户端实体 / 方块配置 / 饮品配置）
for stem, e in entries.items():
    e["definitions"] = {
        "client_entity": bool(stem in entity_anims or any(
            norm_id(x) == stem for x in entity_anims)),
        "block_entity": stem in block_entity_stems,
        "block": stem in block_stems,
        "item": stem in item_stems,
        "food": stem in food_stems,
    }

# ────────────────────────────── 9. 分类（优先级单归类） ──────────────────────────────
CATEGORIES = [
    ("food", "食品饮料", "带第一人称吃喝动画的食品 / 饮品资源链（含共享模型组与通用吃喝动画）"),
    ("block", "普通方块", "配置了自定义模型（netease_block）的方块资源链"),
    ("block_entity", "方块实体", "配置了网易方块实体（netease:block_entity）的方块资源链"),
    ("item", "物品", "所有物品（道具 / 工具 / 手册等）资源链"),
    ("entity", "实体", "独立实体资源链（当前项目暂缺，预留）"),
]


def classify(stem):
    if stem in food_stems:
        return "food"
    if stem in block_entity_stems:
        return "block_entity"
    if stem in block_stems:
        return "block"
    if stem in item_stems:
        return "item"
    if stem in entity_stems:
        return "entity"
    # 未被任何注册表收录的资源，默认归入「食品饮料」
    return "food"


cat_meta = {k: {"key": k, "name": n, "desc": d, "count": 0} for k, n, d in CATEGORIES}
entry_list = []
for stem, e in entries.items():
    cat = classify(stem)
    if not e["models"] and not e["animations"] and not e["textures"]:
        # 无任何可展示资源的空条目（例如仅注册未实装）
        continue
    e["category"] = cat
    e["category_name"] = cat_meta[cat]["name"]
    e["model_count"] = len(e["models"])
    e["anim_count"] = len(e["animations"])
    e["texture_count"] = len(e["textures"])
    e["icon"] = icon_for(stem, e["identifier"])
    cat_meta[cat]["count"] += 1
    entry_list.append(e)

entry_list.sort(key=lambda x: (x["category"], -x["model_count"], x["chinese_name"]))

# ────────────────────────────── 10. 元信息与输出 ──────────────────────────────
meta_summary = {
    "project_name": "椰椰工坊：便利店",
    "project_key": "yybld",
    "project_rel_path": PROJECT_REL.replace("\\", "/"),
    "projects": [
        {"key": "yybld", "name": "椰椰工坊：便利店", "active": True, "count": len(entry_list)},
        {"key": "yyzct", "name": "椰椰工坊：中餐厅", "active": False, "count": 0},
    ],
    "total_entries": len(entry_list),
    "total_models": len(all_models),
    "total_animations": len(all_anims),
    "total_textures": len(textures),
    "icon_hit": sum(1 for e in entry_list if e["icon"]),
    "categories": [cat_meta[k] for k, _n, _d in CATEGORIES],
    "last_sync_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
}
print(f"[*] 条目: {len(entry_list)} | icon 命中: {meta_summary['icon_hit']}")
for k, _n, _d in CATEGORIES:
    print(f"    - {cat_meta[k]['name']}: {cat_meta[k]['count']}")

page_payload = {"meta": meta_summary, "entries": entry_list}
data_compact = json.dumps(page_payload, ensure_ascii=False, separators=(",", ":"))
# 转义 JS 行分隔符，避免个别引擎把 U+2028/U+2029 当作换行导致语法错误
data_compact = data_compact.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

# 1) 调试 / 外部工具可读的纯 JSON
with open(os.path.join(OUTPUT_DIR, "data.json"), "w", encoding="utf-8") as f:
    f.write(json.dumps(page_payload, ensure_ascii=False, indent=2))
print("[+] data.json 已导出（调试用）")

# 2) 页面实际加载的外链数据：<script src="data.js"></script>
#    用脚本外链而非 fetch，可同时兼容 https 托管与本地 file:// 直接双击打开
data_js_path = os.path.join(OUTPUT_DIR, "data.js")
with open(data_js_path, "w", encoding="utf-8") as f:
    f.write("/* 本文件由 sync_data.py 自动生成，请勿手动编辑 */\n")
    f.write("window.EF_DATA = " + data_compact + ";\n")
print(f"[+] data.js 已导出（{os.path.getsize(data_js_path) / 1024 / 1024:.2f} MB，页面运行时加载）")

# 3) 清理 index.html 内的历史内联数据块，替换为轻量占位（保证页面体积恒定）
html_path = os.path.join(OUTPUT_DIR, "index.html")
if os.path.isfile(html_path):
    placeholder = ("<!--EF_DATA_START-->\n"
                   "    <!-- 资产数据已外链化：运行时读取同目录 data.js（window.EF_DATA）。\n"
                   "         本块仅为同步脚本的定位标记，请勿手动写入数据。 -->\n"
                   "    <!--EF_DATA_END-->")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    pattern = re.compile(r"<!--EF_DATA_START-->[\s\S]*?<!--EF_DATA_END-->")
    if pattern.search(html):
        new_html = pattern.sub(lambda _m: placeholder, html, count=1)
        if new_html != html:
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(new_html)
            print("[+] index.html 内联数据块已清理为占位")
        else:
            print("[=] index.html 数据块已是占位，无需变更")
    else:
        print("[!] index.html 未找到 EF_DATA 标记")
else:
    print("[!] 未找到 index.html")
