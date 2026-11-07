/* ============================================================
 * 访问控制 —— 仓库协作者 / 访客
 *
 * 判定：localStorage 中保存的 GitHub Token 能否确认账号属于站点仓库协作者
 *      （permissions.push / maintain / admin 任一为真，
 *        或 /collaborators/{login} 明确返回 204）。
 * 状态：
 *   member —— 已确认协作者：可查看资产条目、小纸条与美术资产规范
 *   guest  —— 访客：仅展示资产总体统计（默认状态）
 * 说明：
 *   1. 纯静态站点只能做展示层隔离，data.js 仍可被直接下载。
 *   2. 只有 401 才代表 Token 失效；403 还可能是限流 / Token 粒度不足，
 *      必须区分，否则会把有效 Token 误清掉（协作者反复登录无效的根因）。
 * ============================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'ef_notes_gh_token';   // 与留言板共用同一 Token
  var MEMBER_KEY = 'ef_notes_gh_member'; // 与留言板共用同一成员缓存
  var API = 'https://api.github.com';
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
  function authHeaders(token) {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token
    };
  }
  // 账号角色兜底：permissions 反映的是 Token 粒度而非用户身份，
  // Fine-grained Token 只勾 Issues 时 push 仍为 false，需按账号再确认一次协作者身份
  function isCollaborator(url, headers) {
    return fetch(url, { headers: headers, cache: 'no-store' }).then(function (r) {
      return r.status === 204 || r.ok;
    }).catch(function () { return false; });
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
    /*
     * 校验 Token 的协作者身份，返回结构化结果：
     *   { ok: true|false|null, reason, status, login, perms, scopes, rateLimited, resetAt }
     * ok = null 表示请求异常（网络 / 未知状态），调用方应沿用本地缓存而不是降级。
     * reason:
     *   invalid    401 —— Token 失效或已过期
     *   rate-limit 403 —— GitHub API 限流（Token 有效，稍后重试）
     *   forbidden  403 —— Token 无权访问仓库 / 未通过 SSO
     *   no-access  404 —— Token 未被授权访问该仓库
     *   not-member 200 —— Token 有效但账号不是协作者（无写权限）
     *   http       其他状态码
     *   network    请求失败
     */
    verify: function (token) {
      var r = repo();
      var headers = authHeaders(token);
      var base = API + '/repos/' + r.owner + '/' + r.repo;
      return Promise.all([
        fetch(API + '/user', { headers: headers, cache: 'no-store' }),
        fetch(base, { headers: headers, cache: 'no-store' })
      ]).then(function (rs) {
        var uRes = rs[0], rRes = rs[1];
        var out = {
          ok: null, reason: '', status: rRes.status, login: '', perms: {},
          scopes: (rRes.headers.get('x-oauth-scopes') || '').trim(),
          rateLimited: false, resetAt: 0
        };
        var left = parseInt(rRes.headers.get('x-ratelimit-remaining'), 10);
        var reset = parseInt(rRes.headers.get('x-ratelimit-reset'), 10);
        if (!isNaN(left) && left <= 0) {
          out.rateLimited = true;
          if (!isNaN(reset)) out.resetAt = reset * 1000;
        }
        var loginTask = uRes.ok
          ? uRes.json().then(function (u) { return (u && u.login) || ''; }).catch(function () { return ''; })
          : Promise.resolve('');
        return loginTask.then(function (login) {
          out.login = login;
          if (rRes.status === 401 || uRes.status === 401) {
            out.ok = false; out.reason = 'invalid'; return out;
          }
          if (rRes.ok) {
            return rRes.json().then(function (j) {
              var p = (j && j.permissions) || {};
              out.perms = p;
              if (p.push || p.maintain || p.admin) { out.ok = true; return out; }
              if (!login) { out.ok = false; out.reason = 'not-member'; return out; }
              var collabUrl = base + '/collaborators/' + encodeURIComponent(login);
              return isCollaborator(collabUrl, headers).then(function (yes) {
                out.ok = !!yes;
                out.reason = yes ? '' : 'not-member';
                return out;
              });
            });
          }
          if (rRes.status === 403 || rRes.status === 429) {
            return rRes.text().then(function (txt) {
              if (/rate limit|secondary rate/i.test(txt || '')) out.rateLimited = true;
              out.ok = false;
              out.reason = out.rateLimited ? 'rate-limit' : 'forbidden';
              return out;
            }).catch(function () {
              out.ok = false; out.reason = 'forbidden'; return out;
            });
          }
          if (rRes.status === 404) { out.ok = false; out.reason = 'no-access'; return out; }
          out.reason = 'http';
          return out;
        });
      }).catch(function () {
        return {
          ok: null, reason: 'network', status: 0, login: '', perms: {},
          scopes: '', rateLimited: false, resetAt: 0
        };
      });
    },
    // 把 verify 结果翻译成可直接展示给用户的中文说明
    describe: function (res) {
      res = res || {};
      var r = repo();
      var name = r.owner + '/' + r.repo;
      var mins = res.resetAt ? Math.max(1, Math.ceil((res.resetAt - Date.now()) / 60000)) : 0;
      switch (res.reason) {
        case 'invalid':
          return 'Token 无效或已过期（401），请在 GitHub 重新生成后再登录。';
        case 'rate-limit':
          return 'GitHub API 暂时限流（403）' + (mins ? '，约 ' + mins + ' 分钟后恢复' : '') + '；本地登录状态已保留。';
        case 'forbidden':
          return 'Token 无权访问 ' + name + '（403）。若为 Fine-grained Token，需选中该仓库并授予 Contents / Issues 读写。';
        case 'no-access':
          return 'Token 未获 ' + name + ' 授权（404）。Fine-grained Token 需在 Repository access 中添加该仓库。';
        case 'not-member':
          return '账号 ' + (res.login || '当前 Token') + ' 不是 ' + name + ' 的协作者（角色需为 Write / Admin），未解锁。';
        case 'http':
          return '验证失败（HTTP ' + res.status + '），请稍后重试。';
        case 'network':
          return '无法连接 GitHub（网络异常），已保留本地登录状态，请稍后重试。';
        default:
          return '';
      }
    }
  };

  // 初始状态：有 Token 且本地缓存为成员时先乐观放行，随后由站点异步复核
  ACCESS.state = (ACCESS.token() && lsGet(MEMBER_KEY) === '1') ? 'member' : 'guest';
})();
