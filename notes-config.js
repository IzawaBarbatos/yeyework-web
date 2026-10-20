/* ============================================================
 * 小纸条留言板 —— 配置
 *
 * 运行模式：
 *   - 'github'：基于 GitHub Issues（三端同步）
 *   - 'local' ：本地单机测试（保存在各人浏览器 localStorage）
 *   - 'cloud' ：腾讯云 CloudBase（需付费开通环境）
 * ============================================================ */
window.EF_NOTES_CONFIG = {
  /* 存储模式：默认使用 GitHub Issues */
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

  /* 单条小纸条字数上限 */
  maxLength: 500,

  /* 自动刷新间隔（毫秒），30 秒刷新一次 */
  pollInterval: 30000,

  /* 本地存储回退键 */
  localKey: "ef_notes_local_v1",

  /* 腾讯云 CloudBase（备用） */
  envId: "",
  region: "ap-shanghai",
  collection: "notes",
  sdkUrl: "https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js"
};
