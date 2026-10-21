/* ============================================================
 * 小纸条留言板 —— 配置（多项目多实例）
 *
 * 一套逻辑同时挂载多块留言板：
 *   window.EF_NOTES_CONFIGS[项目 key] —— 该项目留言板的配置
 *   window.EF_NOTES_INSTANCES         —— 需挂载的留言板实例清单
 *
 * 运行模式：
 *   - 'github'：基于 GitHub Issues（三端同步）
 *   - 'local' ：本地单机测试（保存在各人浏览器 localStorage）
 *   - 'cloud' ：腾讯云 CloudBase（需付费开通环境）
 * ============================================================ */

window.EF_NOTES_CONFIGS = {
  /* 便利店：既有留言板，键值与行为保持原样 */
  yybld: {
    mode: "github",

    /* GitHub 仓库配置 */
    github: {
      owner: "IzawaBarbatos",
      repo: "yeyework-web",
      issueLabel: "ef-note"
    },

    /* 可选的「填写人」标签（多选） */
    authors: ["伊茶Izawa", "Maks怜悯", "YK"],

    /* 可选的「对接人」标签（可选填，为空则不显示该字段） */
    targets: ["伊茶Izawa", "Maks怜悯", "YK"],

    /* 是否允许在标签之外自由输入对接人 */
    allowCustomTarget: true,

    /* 单条小纸条字数上限（GitHub Issue 正文硬上限 65536，留足 JSON 转义余量） */
    maxLength: 20000,

    /* 自动刷新间隔（毫秒），30 秒刷新一次 */
    pollInterval: 30000,

    /* 本地存储回退键 */
    localKey: "ef_notes_local_v1",

    /* 后端隔离：便利店标题不带前缀，读取时排除其它项目的标题前缀 */
    titlePrefix: "",
    titleExcludePrefixes: ["中餐厅"],

    /* 腾讯云 CloudBase（备用） */
    envId: "",
    region: "ap-shanghai",
    collection: "notes",
    sdkUrl: "https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js"
  },

  /* 中餐厅：与便利店共用同一 GitHub 仓库，靠标题项目前缀区分归属 */
  yyzct: {
    mode: "github",
    github: {
      owner: "IzawaBarbatos",
      repo: "yeyework-web",
      issueLabel: "ef-note"
    },
    authors: ["伊茶Izawa", "Maks怜悯", "YK"],
    targets: ["伊茶Izawa", "Maks怜悯", "YK"],
    allowCustomTarget: true,
    maxLength: 20000,
    pollInterval: 30000,

    /* 独立本地存储键，避免与便利店留言板互相覆盖 */
    localKey: "ef_notes_local_yyzct_v1",

    /* 标题加项目前缀，与便利店留言板在 GitHub Issues 上相互隔离 */
    titlePrefix: "中餐厅",

    envId: "",
    region: "ap-shanghai",
    collection: "notes",
    sdkUrl: "https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js"
  }
};

/* 留言板实例清单：key = 项目 key（决定配置与资产来源），prefix = DOM id 前缀（'' 为便利店） */
window.EF_NOTES_INSTANCES = [
  { key: "yybld", prefix: "" },
  { key: "yyzct", prefix: "z" }
];
