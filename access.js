/* ============================================================
 * 访问控制 —— 仓库协作者 / 访客
 *
 * 判定：localStorage 中保存的 GitHub Token 对站点仓库是否有写权限
 *      （permissions.push / maintain / admin 任一为真即视为项目成员）。
 * 状态：
 *   member —— 已确认协作者：可查看资产条目、小纸条与美术资产规范
 *   guest  —— 访客：仅展示资产总体统计（默认状态）
 * 说明：纯静态站点只能做展示层隔离，data.js 仍可被直接下载。
 * ============================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'ef_notes_gh_token';   // 与留言板共用同一 Token
  var MEMBER_KEY = 'ef_notes_gh_member'; // 与留言板共用同一成员缓存
  var listeners = [];

  function lsGet(k) {
    try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }
  function lsSet(k, v) {
    try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {}
  }
  function repo() {
    var cfg = (window.EF_NOTES_CONFIGS || {}).yybld || {};
    var gh = cfg.github || {};
    return { owner: gh.owner || 'IzawaBarbatos', repo: gh.repo || 'yeyework-web' };
  }

  var ACCESS = window.EF_ACCESS = {
    state: 'guest',
    isMember: function () { return this.state === 'member'; },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    token: function () { return lsGet(TOKEN_KEY); },
    saveToken: function (t) { lsSet(TOKEN_KEY, String(t || '').trim()); },
    clearToken: function () { lsSet(TOKEN_KEY, ''); lsSet(MEMBER_KEY, ''); },
    markMember: function (v) { lsSet(MEMBER_KEY, v ? '1' : ''); },
    setState: function (next) {
      var changed = ACCESS.state !== next;
      ACCESS.state = next;
      if (!changed) return;
      listeners.forEach(function (fn) { try { fn(next); } catch (e) {} });
    },
    // 校验 Token 权限：true=协作者 / false=非协作者 / null=请求异常（沿用本地缓存）
    verify: function (token) {
      var r = repo();
      return fetch('https://api.github.com/repos/' + r.owner + '/' + r.repo, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': 'Bearer ' + token }
      }).then(function (res) {
        if (res.status === 401 || res.status === 403) return false;
        if (!res.ok) return null;
        return res.json().then(function (j) {
          var p = (j && j.permissions) || {};
          return !!(p.push || p.maintain || p.admin);
        });
      }).catch(function () { return null; });
    }
  };

  // 初始状态：有 Token 且本地缓存为成员时先乐观放行，随后由站点异步复核
  ACCESS.state = (ACCESS.token() && lsGet(MEMBER_KEY) === '1') ? 'member' : 'guest';
})();
