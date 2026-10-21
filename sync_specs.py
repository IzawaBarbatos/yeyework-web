# -*- coding: utf-8 -*-
r"""椰椰工坊 · 项目资料库 —— 各项目扫描规格（spec）。

把「项目差异」集中在本模块：命名空间归一化 / 形态分组 / 条目主键推导 /
中文名池 / 权威配置解析 / 分类表 / 资源链定义。
sync_core.scan_project 只按 spec 驱动，新增项目时在此追加一份 spec 即可。
"""

import os
import re


# ══════════════════════════════════════════════════════════════════════════
#  一、椰椰工坊：便利店（yybld）
# ══════════════════════════════════════════════════════════════════════════

def yybld_norm_id(s):
    """统一小写、去命名空间前缀、合并重复 yybld_ 前缀。"""
    s = str(s).strip().lower()
    s = re.sub(r"^(?:yybld|minecraft):", "", s)
    s = s.replace("yybld_yybld_", "yybld_")
    return s


# 装饰性后缀（长后缀优先，避免 _hand 抢在 _small_hand 之前命中）
YYBLD_DECOR_SUFFIXES = ("_small_hand", "_big_hand", "_hand", "_arm", "_hold", "_bind", "_icon")


def yybld_label_group(name):
    """由文件名/标识符推导资源所属形态组：hold / display / hand / block。"""
    s = yybld_norm_id(name)
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


def yybld_anim_group(fname, anim_ids):
    """动画形态分组：进食/饮用/手持归 hand；display 归 display；hold 归 hold；其余归 block。"""
    s = yybld_norm_id(fname)
    if "_hold" in s:
        return "hold"
    if "_display" in s or s.startswith("yybld_display_"):
        return "display"
    if any(k in s for k in ("_hand", "_arm", "_eat", "_drink", "drink", "eat")) or \
       any(any(k in aid for k in ("hand", "arm", "eat", "drink")) for aid in anim_ids):
        return "hand"
    return "block"


def yybld_group_stem(name):
    """由文件名/标识符推导「条目主键 stem」（把同一内容的多套资源归到一组）。"""
    s = yybld_norm_id(name)
    for ext in (".geo.json", ".animation.json", ".json", ".png"):
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    if s.endswith("_item"):
        s = s[:-5]
    if s.endswith("_icon"):
        s = s[:-5]
    # 通用展示实体不做前缀剥离，单独成条
    if s.startswith("yybld_display_universal"):
        return "yybld_display_universal"
    for suf in YYBLD_DECOR_SUFFIXES:
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


# 人工补全的语义中文名（语言包无法覆盖的通用/特殊资源）
YYBLD_PREDEFINED_CN = {
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
    "yybld_mojiao_guanzhuang": "魔角饮料罐装（通用模型组）",
    "yybld_lvdong_big": "律动大瓶（通用模型组）",
    "yybld_lvdong_b": "律动大瓶手持（通用模型组）",
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


def yybld_build_stem_cn(rp_dir):
    """构建 stem -> 中文名 池（语言包 + 人工补全，含去 yybld_ 简写）。"""
    key_to_cn = {}
    lang_file = os.path.join(rp_dir, "texts", "zh_CN.lang")
    if os.path.exists(lang_file):
        with open(lang_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = re.sub(r"^(?:tile|item|entity)\.(?:yybld:)?", "", k.strip())
                    k = re.sub(r"\.name$", "", k)
                    key_to_cn[yybld_norm_id(k)] = re.sub(r"§[0-9a-fk-or]", "", v.strip())
    for k, v in YYBLD_PREDEFINED_CN.items():
        key_to_cn.setdefault(yybld_norm_id(k), v)

    stem_to_cn = {}
    for k, v in key_to_cn.items():
        stem_to_cn[k] = v
        if k.startswith("yybld_"):
            stem_to_cn.setdefault(k[6:], v)
    return stem_to_cn


def yybld_parse_authoritative(bp_dir, rp_dir, env):
    """解析便利店脚本内的权威映射（食品饮料链 / 动画引用 / 模型贴图共享）。"""
    group_stem = env["group_stem"]
    load_json = env["load_json"]

    food_stems = set()          # 有第一人称动画的食品/饮品 条目主键
    anim_use = {}               # 动画名 -> 使用它的食品条目集合（判断是否通用共享）
    bev_items, res_tex, res_geo = {}, {}, {}

    beverage_py = os.path.join(bp_dir, "yybld_scripts", "yybld", "client", "beverage_config.py")
    if os.path.exists(beverage_py):
        with open(beverage_py, "r", encoding="utf-8") as f:
            bev_src = f.read()

        for name, texpath, *rest in re.findall(
            r'\(\s*["\']([^"\']+)["\']\s*,\s*["\'](textures/[^"\']+)["\'](?:\s*,\s*["\']([^"\']+)["\'])?\s*\)',
            bev_src
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

    # 解析 render_controllers/yybld_drink.render_controllers.json（数值索引 -> 几何）
    rc_food = {}
    rc_path = os.path.join(rp_dir, "render_controllers", "yybld_drink.render_controllers.json")
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

    return food_stems, anim_use, share_targets


YYBLD_CATEGORIES = [
    ("food", "食品饮料", "带第一人称吃喝动画的食品 / 饮品资源链（含共享模型组与通用吃喝动画）"),
    ("block", "普通方块", "配置了自定义模型（netease_block）的方块资源链"),
    ("block_entity", "方块实体", "配置了网易方块实体（netease:block_entity）的方块资源链"),
    ("item", "物品", "所有物品（道具 / 工具 / 手册等）资源链"),
    ("entity", "实体", "独立实体资源链（当前项目暂缺，预留）"),
]


def yybld_classify(stem, ctx):
    if stem in ctx["food"]:
        return "food"
    if stem in ctx["block_entity"]:
        return "block_entity"
    if stem in ctx["block"]:
        return "block"
    if stem in ctx["item"]:
        return "item"
    if stem in ctx["entity"]:
        return "entity"
    # 未被任何注册表收录的资源，默认归入「食品饮料」
    return "food"


YYBLD_SPEC = {
    "key": "yybld",
    "name": "椰椰工坊：便利店",
    "rel_dir": r"QuModProject\椰椰工坊：便利店",
    "norm_id": yybld_norm_id,
    "label_group": yybld_label_group,
    "anim_group": yybld_anim_group,
    "group_stem": yybld_group_stem,
    "tex_group": yybld_label_group,
    "build_stem_cn": yybld_build_stem_cn,
    "parse_authoritative": yybld_parse_authoritative,
    "categories": YYBLD_CATEGORIES,
    "classify": yybld_classify,
    "cn_fallback": "便利店资产-",
    "share_model_field": "file_key",
    "anim_self_include": False,
    "entity_def_via_group_stem": False,
    "protected_stems": set(),
    "scan_tex_dirs": ["items", "entity"],
    "def_labels": {
        "client_entity": "客户端实体定义",
        "block_entity": "方块实体定义",
        "block": "方块配置",
        "item": "物品配置",
        "food": "饮品/食品配置（动画映射）",
    },
    "head": {
        "title": "美术资产对照索引",
        "sub": "Model / Animation / Texture / Name",
        "desc": "便利店项目内全部已实装的模型、动画与贴图资源，按「暴露给玩家的内容」归纳为中文名条目并分类；"
                "同一中文名对应多套资源时以可展开的树状图呈现。点任意文件可查看其相对路径与关联配置。",
    },
    "chains": [
        {"key": "block", "name": "方块", "en": "Block", "tag": "无标注", "num": "01"},
        {"key": "display", "name": "货架上（display）", "en": "Display", "tag": "display标注", "num": "02"},
        {"key": "hand", "name": "第一人称（hand）", "en": "Hand", "tag": "hand标注", "num": "03"},
        {"key": "hold", "name": "第三人称（hold）", "en": "Hold", "tag": "hold标注", "num": "04"},
    ],
    "chain_categories": ["food"],
}


# ══════════════════════════════════════════════════════════════════════════
#  二、椰椰工坊：中餐厅（yyzct）
# ══════════════════════════════════════════════════════════════════════════

# 菜品 / 主食 基底（用于把 _1.._5 状态资源折叠回同一中文名条目）
YYZCT_DISH_BASE = {
    "shuizhuroupian", "kelejichi", "songshuguiyu", "tangcupaigu",
    "xihongshichaojidan", "shuijiao_niurouyuancong", "xianglarousi",
    "hongshaoshizitou", "sixiwanzi", "hongshaorou",
}
YYZCT_FOOD_BASE = YYZCT_DISH_BASE | {"mifan"}

# 分类归属集合（键为去 yyzct_ 前缀后的 stem）
YYZCT_TABLEWARE = {
    "kuaizi", "canju_xiaowan", "canju_1", "fangpan_chang",
    "tangpen_bo", "tangpen_hou", "yuanpan_da",
}
YYZCT_FURNITURE = {
    "fangzhuo_yuanmu", "yizi_1_yuanmu", "aiyi_yuanmu", "deng_fangxing_xinzhongshi",
    "diban_shizi_yuanmu", "zhalangeban_yuanmu", "zhalangeban_yuanmu_loukong",
}
YYZCT_FUNCTIONAL = {"dcj", "coin_golden_0"}

YYZCT_PREDEFINED_CN = {
    "yyzct_canju_1": "空餐具共享手模组",
}


def yyzct_norm_id(s):
    """统一小写、去命名空间前缀、合并重复 yyzct_ 前缀。"""
    s = str(s).strip().lower()
    s = re.sub(r"^(?:yyzct|minecraft):", "", s)
    s = s.replace("yyzct_yyzct_", "yyzct_")
    return s


def yyzct_label_group(name):
    """模型形态分组：state / hold / hand / block。"""
    s = yyzct_norm_id(name)
    for ext in (".geo.json", ".animation.json", ".json", ".png"):
        if s.endswith(ext):
            s = s[:-len(ext)]
            break
    if "_state" in s:
        return "state"
    if "_hold" in s:
        return "hold"
    if any(s.endswith(suf) for suf in ("_hand_arm", "_small_hand", "_big_hand", "_hand", "_arm")):
        return "hand"
    return "block"


def yyzct_anim_group(fname, anim_ids):
    """动画形态分组：state / hold / hand / block（block 中的手持动画由 post_process 修正）。"""
    s = yyzct_norm_id(fname)
    if "_state" in s:
        return "state"
    if "_hold" in s:
        return "hold"
    if any(k in s for k in ("_hand", "_arm", "_eat", "_take", "_watch")) or \
       any(any(k in aid for k in ("hand", "arm", "eat", "take", "watch")) for aid in anim_ids):
        return "hand"
    return "block"


def yyzct_group_stem(name):
    """由文件名/标识符推导「条目主键 stem」。"""
    s = yyzct_norm_id(name)
    for ext in (".geo.json", ".animation.json", ".json"):
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    if s.endswith("_item"):
        s = s[:-5]
    # 介绍书贴图 yyzct_book 并入介绍书物品 yyzct_instbook
    if s == "yyzct_book":
        return "yyzct_instbook"
    # 原木方桌：16 态模型与方块身份归并为一条（显示名取基准名「原木方桌」）
    if s.startswith("yyzct_fangzhuo_yuanmu"):
        return "yyzct_fangzhuo_yuanmu"
    # 椅子坐点实体并入原木椅子本体
    if s.startswith("yyzct_chair_seat"):
        return "yyzct_yizi_1_yuanmu"
    for suf in ("_hand_arm", "_small_hand", "_big_hand", "_hand", "_hold", "_state", "_arm"):
        if s.endswith(suf):
            s = s[: -len(suf)]
            break
    # 菜品 / 米饭的 _1.._5 状态资源折叠回同一中文名条目
    m = re.match(r"^(yyzct_(.+?))_(\d+)$", s)
    if m and m.group(2) in YYZCT_FOOD_BASE:
        return m.group(1)
    return s


def yyzct_build_stem_cn(rp_dir):
    """构建 stem -> 中文名 池（语言包严格校验前缀，过滤 action.* 等交互提示键）。"""
    key_to_cn = {}
    lang_file = os.path.join(rp_dir, "texts", "zh_CN.lang")
    if os.path.exists(lang_file):
        with open(lang_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                m = re.match(r"^(?:tile|item|entity)\.(?:[a-z_]+:)?(.+?)\.name$", k.strip())
                if not m:
                    continue
                key_to_cn[yyzct_norm_id(m.group(1))] = re.sub(r"§[0-9a-fk-or]", "", v.strip())
    for k, v in YYZCT_PREDEFINED_CN.items():
        key_to_cn.setdefault(yyzct_norm_id(k), v)

    stem_to_cn = {}
    for k, v in key_to_cn.items():
        stem_to_cn[k] = v
        stem_to_cn.setdefault(yyzct_group_stem(k), v)   # 多状态键折叠后取首个（基准名）
    return stem_to_cn


def yyzct_parse_authoritative(bp_dir, rp_dir, env):
    """解析中餐厅脚本内的权威映射（前三视角持握 / 第一人称模型与动画映射）。"""
    group_stem = env["group_stem"]
    cfg = os.path.join(bp_dir, "yyzct_scripts", "yyzct", "client", "beverage_config.py")

    food_stems = set()
    anim_use = {}
    share_targets = {"models": {}, "textures": {}}
    if not os.path.exists(cfg):
        return food_stems, anim_use, share_targets

    with open(cfg, "r", encoding="utf-8") as f:
        src = f.read()

    def block(name):
        """按「NAME = ( 或 {」定位常量块，切到下一个顶层常量为止，避免跨块误匹配。"""
        m = re.search(r"^\s*" + name + r"\s*=\s*[\(\{]", src, re.M)
        if not m:
            return ""
        rest = src[m.end():]
        nxt = re.search(r"^\s*[A-Z_][A-Z0-9_]*\s*=\s*[\(\{]", rest, re.M)
        return rest[:nxt.start()] if nxt else rest

    def reg_anim(name, stem=None):
        """把动画全名逐段注册为前缀键（配置引用可能带 .idle/.eat1 后缀）。"""
        name = (name or "").strip()
        if not name.startswith("animation."):
            return
        parts = name.split(".")
        for n in range(2, len(parts) + 1):
            key = ".".join(parts[:n])
            anim_use.setdefault(key, set())
            if stem:
                anim_use[key].add(stem)

    # 1) 第三人称端托配置：键(手持物品) -> 模型/几何/贴图/动画/控制器
    for m in re.finditer(
        r'"([^"]+)"\s*:\s*\(\s*"([^"]+)"\s*,\s*"(geometry\.[^"]+)"\s*,\s*"(textures/[^"]+)"\s*,'
        r'\s*"([^"]+)"\s*,\s*"(animation\.[^"]+)"\s*,\s*"(controller\.[^"]+)"\s*\)',
        block("HOLD_DISPLAY_CONFIGS")
    ):
        key, _stem, geo, tex, _akey, anim, _ctrl = m.groups()
        entry = group_stem(key)
        share_targets["models"].setdefault(geo[len("geometry."):], set()).add(entry)
        share_targets["textures"].setdefault(os.path.basename(tex), set()).add(entry)
        reg_anim(anim, entry)

    # 2) 第一人称手模资源：数值索引 -> (几何, 贴图)
    model_res = {}
    for m in re.finditer(
        r'^\s*(\d+)\s*:\s*\(\s*"([^"]+)"\s*,\s*"(textures/[^"]+)"',
        block("MODEL_RESOURCES"), re.M
    ):
        model_res[int(m.group(1))] = (m.group(2), m.group(3))

    # 3) 第一人称动画映射：键(物品身份) -> (时长, 模型索引, 动画[, 基准动画])
    for m in re.finditer(
        r'"([^"]+)"\s*:\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*"(animation\.[^"]+)"'
        r'(?:\s*,\s*"(animation\.[^"]+)")?\s*\)',
        block("ANIMATION_MAP")
    ):
        key, _dur, midx, anim, base = m.groups()
        entry = group_stem(key)
        food_stems.add(entry)
        res = model_res.get(int(float(midx)))
        if res:
            share_targets["models"].setdefault(res[0], set()).add(entry)
            share_targets["textures"].setdefault(os.path.basename(res[1]), set()).add(entry)
        reg_anim(anim, entry)
        if base:
            reg_anim(base, entry)

    return food_stems, anim_use, share_targets


def yyzct_tex_group(tpath):
    """贴图按目录归属资源链：items -> 物品链；entity -> 第一人称链；blocks -> 摆盘方块链。"""
    p = str(tpath).replace("\\", "/").lower()
    if p.startswith("textures/items/"):
        return "item"
    if p.startswith("textures/entity/"):
        return "hand"
    if p.startswith("textures/blocks/"):
        return "block"
    return "block"


def yyzct_post_process(models, anims):
    """按模型命名反推：无 hand 标记但存在对应手模的动画（如筷子）修正为 hand 链。"""
    hand_stems = {m["file_stem"] for m in models if m["group"] == "hand"}
    for a in anims:
        if a["group"] == "block" and (a["file_stem"] + "_hand") in hand_stems:
            a["group"] = "hand"


YYZCT_CATEGORIES = [
    ("dish", "菜品", "带第一人称进食动画的菜品资源链（含摆盘方块 / 手持 / 端托 / 多状态模型）"),
    ("staple", "主食", "米饭类主食资源链（多状态方块 + 手持进食动画）"),
    ("tableware", "餐具", "餐具类资源链（筷子 / 碗 / 盘 / 盆等）"),
    ("furniture", "家具", "餐厅家具类资源链（桌 / 椅 / 灯 / 地板 / 隔板等）"),
    ("functional", "功能", "功能类资源链（点餐机 / 金币等）"),
    ("item", "物品", "其余物品资源链（介绍书等）"),
]


def yyzct_classify(stem, ctx):
    s = stem[len("yyzct_"):] if stem.startswith("yyzct_") else stem
    if s == "mifan":
        return "staple"
    if s in YYZCT_DISH_BASE:
        return "dish"
    if s in YYZCT_TABLEWARE:
        return "tableware"
    if s in YYZCT_FURNITURE:
        return "furniture"
    if s in YYZCT_FUNCTIONAL:
        return "functional"
    return "item"


YYZCT_SPEC = {
    "key": "yyzct",
    "name": "椰椰工坊：中餐厅",
    "rel_dir": r"QuModProject\椰椰工坊：中餐厅",
    "norm_id": yyzct_norm_id,
    "label_group": yyzct_label_group,
    "anim_group": yyzct_anim_group,
    "group_stem": yyzct_group_stem,
    "tex_group": yyzct_tex_group,
    "build_stem_cn": yyzct_build_stem_cn,
    "parse_authoritative": yyzct_parse_authoritative,
    "categories": YYZCT_CATEGORIES,
    "classify": yyzct_classify,
    "cn_fallback": "中餐厅资产-",
    "share_model_field": "file_stem",
    "anim_self_include": True,
    "entity_def_via_group_stem": True,
    "protected_stems": {"yyzct_canju_1"},
    "scan_tex_dirs": ["items", "entity", "blocks"],
    "def_labels": {
        "client_entity": "客户端实体定义",
        "block_entity": "方块实体定义",
        "block": "方块配置",
        "item": "物品配置",
        "food": "动画映射配置",
    },
    "head": {
        "title": "美术资产对照索引",
        "sub": "Model / Animation / Texture / Name",
        "desc": "中餐厅项目内全部已实装的模型、动画与贴图资源，按「暴露给玩家的内容」归纳为中文名条目并分类；"
                "同一中文名对应多套资源时以可展开的树状图呈现。点任意文件可查看其相对路径与关联配置。",
    },
    "chains": [
        {"key": "block", "name": "方块", "en": "Block", "tag": "无标注", "num": "01"},
        {"key": "hand", "name": "第一人称（hand）", "en": "Hand", "tag": "hand标注", "num": "02"},
        {"key": "hold", "name": "第三人称（hold）", "en": "Hold", "tag": "hold标注", "num": "03"},
        {"key": "state", "name": "状态", "en": "State", "tag": "state标注", "num": "04"},
        {"key": "item", "name": "物品", "en": "Item", "tag": "items贴图", "num": "05"},
    ],
    "chain_categories": ["dish", "staple"],
    "post_process": yyzct_post_process,
}


# 全部项目规格（顺序即页面项目列表顺序）
SPECS = [YYBLD_SPEC, YYZCT_SPEC]
