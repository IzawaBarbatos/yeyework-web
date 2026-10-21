# -*- coding: utf-8 -*-
r"""
椰椰工坊 · 项目资料库 —— 一键同步脚本（编排层）

作用：按 sync_specs.py 中的项目规格，逐个项目调用 sync_core.scan_project 扫描工程资源
      -> 汇总为多项目数据契约 window.EF_DATA
      -> 输出外链数据文件 data.js（页面运行时加载）与 data.json（调试/工具用）
      -> 清理 index.html 内的历史内联数据块（替换为轻量占位，使页面保持小体积）

用法：在本目录执行  python sync_data.py

数据契约：
    window.EF_DATA = {
        meta: {
            site_name, last_sync_time,
            projects: [ {key, name, count, type?}, ... ],   # 侧边栏项目列表
            projects_data: { yybld: {...proj_meta}, ... },   # 各项目元信息（categories/chains/head/def_labels）
        },
        entries: { yybld: [...], yyzct: [...] },             # 各项目条目列表
    }
"""

import os
import re
import json
import datetime

from sync_specs import SPECS
from sync_core import scan_project

# ────────────────────────────── 路径常量 ──────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if "__file__" in locals() else \
    r"D:\0.minecraft\Models\QuMod工作区\QuModProject\项目资料库网站"
WORKSPACE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..")) if os.path.isdir(os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))) else \
    r"D:\0.minecraft\Models\QuMod工作区"
OUTPUT_DIR = SCRIPT_DIR

SITE_NAME = "椰椰工坊 · 项目资料库"

# 非工程类导航项（文档页），仅参与侧边栏 / 项目列表展示，不参与资源扫描
DOC_PROJECTS = [
    {"key": "spec", "name": "美术资产规范", "count": "规范文档", "type": "doc"},
]


# ────────────────────────────── 逐项目扫描 ──────────────────────────────
def scan_all():
    """按 SPECS 顺序扫描全部工程，返回 (projects_data, entries_map)。"""
    projects_data = {}
    entries_map = {}
    for spec in SPECS:
        proj_meta, entry_list = scan_project(WORKSPACE_DIR, spec)
        projects_data[spec["key"]] = proj_meta
        entries_map[spec["key"]] = entry_list
    return projects_data, entries_map


# ────────────────────────────── 元信息与输出 ──────────────────────────────
def build_payload():
    projects_data, entries_map = scan_all()

    projects = [
        {"key": s["key"], "name": s["name"], "count": projects_data[s["key"]]["total_entries"]}
        for s in SPECS
    ] + DOC_PROJECTS

    meta_summary = {
        "site_name": SITE_NAME,
        "projects": projects,
        "projects_data": projects_data,
        "last_sync_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    return {"meta": meta_summary, "entries": entries_map}


def write_outputs(page_payload):
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
    if not os.path.isfile(html_path):
        print("[!] 未找到 index.html")
        return
    placeholder = ("<!--EF_DATA_START-->\n"
                   "    <!-- 资产数据已外链化：运行时读取同目录 data.js（window.EF_DATA）。\n"
                   "         本块仅为同步脚本的定位标记，请勿手动写入数据。 -->\n"
                   "    <!--EF_DATA_END-->")
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    pattern = re.compile(r"<!--EF_DATA_START-->[\s\S]*?<!--EF_DATA_END-->")
    if not pattern.search(html):
        print("[!] index.html 未找到 EF_DATA 标记")
        return
    new_html = pattern.sub(lambda _m: placeholder, html, count=1)
    if new_html != html:
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(new_html)
        print("[+] index.html 内联数据块已清理为占位")
    else:
        print("[=] index.html 数据块已是占位，无需变更")


if __name__ == "__main__":
    write_outputs(build_payload())
