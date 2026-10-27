/* ============================================================
 * 意见征集 —— 配置
 *
 * survey.embedUrl：腾讯问卷「网站嵌入」代码里的 src，可直接粘贴整段
 *                  iframe 代码，脚本会自动提取 src。
 * survey.url     ：问卷普通链接，用于「在新窗口打开」兜底。
 * 留空时页面显示「问卷尚未配置」，不影响公示表使用。
 * ============================================================ */
window.EF_SUGGEST_CONFIG = {
  survey: {
    title: '椰椰工坊 · 内容征集',
    embedUrl: 'https://forms.seatable.cn/dtable/forms/e65052d0-9638-4f22-a92c-76460e8033de/',
    url: 'https://forms.seatable.cn/dtable/forms/e65052d0-9638-4f22-a92c-76460e8033de/',
    embedHeight: 900
  },

  /* 表单提交后跳转回调页，由回调页写入本机记录并隐藏问卷 */
  submitHideDays: 30,
  submitKey: 'ef_suggest_submitted_at',
  submitMessage: 'ef-suggest-submitted',

  dataUrl: 'suggestions.json',
  pageSize: 10,

  /* 两个玩法分别公示 */
  projects: [
    { key: 'yybld', name: '便利店' },
    { key: 'yyzct', name: '中餐厅' }
  ],

  /* 与问卷第 2 题选项保持一致 */
  types: ['食品·饮料 / 菜品·主食', '家具 / 建材 / 装饰', '玩法·功能']
};
