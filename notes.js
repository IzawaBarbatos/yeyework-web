/* ============================================================
 * 小纸条留言板 —— 终末地工业风实现 (Endfield UI)
 *
 * 设计：
 *   - 存储层用「同一接口、多种实现」的适配器模式（依赖倒置）：
 *       GithubStore（基于 GitHub Issues API，三端共享）
 *       CloudStore（腾讯云 CloudBase，按量计费）
 *       LocalStore（localStorage，单人本地兜底）
 *     上层 UI 只依赖接口，不关心底层是 GitHub、云开发还是本地。
 *   - 多实例：整套逻辑封装为 mountNotes(INST)，由 window.EF_NOTES_INSTANCES
 *     驱动挂载多块留言板（各项目一块）；实例私有 DOM id 按 INST.prefix 重写，
 *     共享的资产选择弹窗（#ef-asset-*）保持全局并按「当前打开者」分发事件。
 *   - UI 组件：
 *       DropdownMultiSelect：终末地工业风下拉多选控件（切角、复选框、标签回显）
 *       双折叠子分区：支持独立展开/收起创建编写与查看列表
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    mode: 'github',
    github: { owner: 'IzawaBarbatos', repo: 'yeyework-web', issueLabel: 'ef-note' },
    envId: '', region: 'ap-shanghai', collection: 'notes',
    authors: [], targets: [], allowCustomTarget: true,
    maxLength: 20000, pollInterval: 30000, localKey: 'ef_notes_local_v1',
    sdkUrl: 'https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js'
  };

  /* 共享资产选择弹窗当前归属的留言板实例（弹窗全局唯一，事件需按归属分发） */
  var activePickerOwner = null;

  /* ---------------- 实例挂载：同一套逻辑挂载到指定的一块留言板 ---------------- */
  function mountNotes(INST) {
  INST = INST || {};
  var CFG = Object.assign({}, DEFAULTS, (window.EF_NOTES_CONFIGS || {})[INST.key] || {});
  CFG.envId = (CFG.envId || '').trim();
  CFG.github = Object.assign({}, DEFAULTS.github, CFG.github || {});
  var ASSETS = (window.EF_ASSETS && window.EF_ASSETS[INST.key]) || INST.assets || null;
  /* 实例根节点：把类 / 属性选择器限定在本实例内，避免多块留言板互相命中 */
  var ROOT = INST.root || document.querySelector(INST.prefix ? '#ef-' + INST.prefix + '-notes' : '#ef-notes');

  /* 实例私有的本地偏好键（避免多块留言板互相覆盖；无前缀时保持原键不变） */
  var SUFFIX = INST.prefix ? '_' + INST.prefix : '';
  var COLLAPSE_KEY = 'ef_notes_collapse_v2' + SUFFIX;
  var ATTACHED_LAYOUT_KEY = 'ef_attached_layout' + SUFFIX;

  /* 实例私有 id 重写：#ef-notes-x -> #ef-z-notes-x；共享弹窗（#ef-asset-*）保持全局 */
  function resolveSel(sel) {
    if (INST.prefix && sel.charAt(0) === '#' && sel.indexOf('#ef-asset-') !== 0) {
      return '#ef-' + INST.prefix + '-' + sel.slice(4);
    }
    return sel;
  }

  /* ---------------- 小工具 ---------------- */
  function $(sel, root) {
    if (sel.charAt(0) === '#') return document.querySelector(resolveSel(sel));
    return (root || ROOT || document).querySelector(sel);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(ms) {
    if (!ms) return '';
    var d = new Date(Number(ms));
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function uid() {
    return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function toArray(v) {
    if (Array.isArray(v)) return v.filter(Boolean);
    return v ? [v] : [];
  }

  /* ---------------- 终末地工业风下拉多选组件 ---------------- */
  function DropdownMultiSelect(host, options, selected, placeholder, eyebrow) {
    this.host = host;
    this.options = toArray(options);
    this.selected = {};
    this.placeholder = placeholder || '// 请选择成员';
    this.eyebrow = eyebrow || '// TEAM MEMBERS';
    this._isOpen = false;
    this._listeners = [];

    var self = this;
    toArray(selected).forEach(function (v) { self.selected[v] = true; });

    this._init();
  }

  DropdownMultiSelect.prototype._init = function () {
    var self = this;
    this.host.innerHTML = '' +
      '<div class="notes-dropdown-wrap">' +
        '<button class="notes-dropdown-trigger cut-br" type="button" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="notes-dropdown-summary"></span>' +
          '<span class="notes-dropdown-arrow" aria-hidden="true">▼</span>' +
        '</button>' +
        '<div class="notes-dropdown-panel" hidden role="listbox" aria-multiselectable="true">' +
          '<div class="notes-dropdown-bar">' +
            '<span class="notes-dropdown-eyebrow">' + esc(this.eyebrow) + '</span>' +
            '<div class="notes-dropdown-actions">' +
              '<button class="notes-dropdown-act" type="button" data-dd-act="all">全选</button>' +
              '<button class="notes-dropdown-act" type="button" data-dd-act="clear">清空</button>' +
            '</div>' +
          '</div>' +
          '<div class="notes-dropdown-options">' +
            this.options.map(function (opt) {
              var isSel = !!self.selected[opt];
              return '' +
                '<div class="notes-dropdown-option' + (isSel ? ' is-selected' : '') + '" ' +
                     'role="option" aria-selected="' + (isSel ? 'true' : 'false') + '" data-val="' + esc(opt) + '">' +
                  '<span class="notes-dropdown-checkbox" aria-hidden="true"></span>' +
                  '<span class="notes-dropdown-option-text">' + esc(opt) + '</span>' +
                '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    this.wrap = this.host.querySelector('.notes-dropdown-wrap');
    this.trigger = this.host.querySelector('.notes-dropdown-trigger');
    this.panel = this.host.querySelector('.notes-dropdown-panel');
    this.summary = this.host.querySelector('.notes-dropdown-summary');

    this._updateSummary();
    this._bind();
  };

  DropdownMultiSelect.prototype._bind = function () {
    var self = this;

    // 点击触发按钮展开/收起
    this.trigger.addEventListener('click', function (ev) {
      ev.stopPropagation();
      self.toggle();
    });

    // 面板内操作
    this.panel.addEventListener('click', function (ev) {
      ev.stopPropagation();

      var actBtn = ev.target.closest('[data-dd-act]');
      if (actBtn) {
        var act = actBtn.dataset.ddAct;
        if (act === 'all') {
          self.options.forEach(function (opt) { self.selected[opt] = true; });
        } else if (act === 'clear') {
          self.selected = {};
        }
        self._syncOptionsUI();
        self._updateSummary();
        self._notifyChange();
        return;
      }

      var optEl = ev.target.closest('.notes-dropdown-option');
      if (optEl) {
        var val = optEl.dataset.val;
        if (self.selected[val]) {
          delete self.selected[val];
        } else {
          self.selected[val] = true;
        }
        self._syncOptionItem(optEl, !!self.selected[val]);
        self._updateSummary();
        self._notifyChange();
      }
    });

    // 点击全局空白处自动收起
    document.addEventListener('click', function (ev) {
      if (self._isOpen && !self.wrap.contains(ev.target)) {
        self.close();
      }
    });
  };

  DropdownMultiSelect.prototype.toggle = function () {
    if (this._isOpen) this.close();
    else this.open();
  };

  DropdownMultiSelect.prototype.open = function () {
    this._isOpen = true;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.panel.hidden = false;
  };

  DropdownMultiSelect.prototype.close = function () {
    this._isOpen = false;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.panel.hidden = true;
  };

  DropdownMultiSelect.prototype._syncOptionItem = function (optEl, isSel) {
    optEl.classList.toggle('is-selected', isSel);
    optEl.setAttribute('aria-selected', isSel ? 'true' : 'false');
  };

  DropdownMultiSelect.prototype._syncOptionsUI = function () {
    var self = this;
    var items = this.panel.querySelectorAll('.notes-dropdown-option');
    Array.prototype.forEach.call(items, function (item) {
      var isSel = !!self.selected[item.dataset.val];
      self._syncOptionItem(item, isSel);
    });
  };

  DropdownMultiSelect.prototype._updateSummary = function () {
    var vals = this.value();
    if (!vals.length) {
      this.summary.className = 'notes-dropdown-summary is-empty';
      this.summary.textContent = this.placeholder;
    } else {
      this.summary.className = 'notes-dropdown-summary';
      this.summary.innerHTML = '<span class="notes-dropdown-tags">' +
        vals.map(function (name) {
          return '<span class="ef-tag">' + esc(name) + '</span>';
        }).join('') +
      '</span>';
    }
  };

  DropdownMultiSelect.prototype.value = function () {
    var self = this;
    return this.options.filter(function (opt) { return !!self.selected[opt]; });
  };

  DropdownMultiSelect.prototype.setSelected = function (arr) {
    var self = this;
    this.selected = {};
    toArray(arr).forEach(function (v) { self.selected[v] = true; });
    this._syncOptionsUI();
    this._updateSummary();
  };

  DropdownMultiSelect.prototype.onChange = function (fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  };

  DropdownMultiSelect.prototype._notifyChange = function () {
    var vals = this.value();
    this._listeners.forEach(function (fn) { fn(vals); });
  };

  /* ---------------- 存储层：本地 ---------------- */
  var LocalStore = {
    mode: 'local',
    _read: function () {
      try { return JSON.parse(localStorage.getItem(CFG.localKey) || '[]') || []; }
      catch (e) { return []; }
    },
    _write: function (list) {
      try { localStorage.setItem(CFG.localKey, JSON.stringify(list)); return true; }
      catch (e) { console.warn('[小纸条] 本地存储写入失败：', e); return false; }
    },
    init: function () { return Promise.resolve(); },
    list: function () { return Promise.resolve(this._read()); },
    add: function (rec) {
      var list = this._read();
      rec._id = uid();
      list.push(rec);
      this._write(list);
      return Promise.resolve(rec._id);
    },
    setStatus: function (id, status) {
      var list = this._read();
      for (var i = 0; i < list.length; i++) {
        if (list[i]._id === id) { list[i].status = status; list[i].updated_at = Date.now(); break; }
      }
      this._write(list);
      return Promise.resolve();
    },
    remove: function (id) {
      var rest = this._read().filter(function (n) {
        return n._id !== id && n.parent_id !== id;
      });
      this._write(rest);
      return Promise.resolve();
    },
    watch: function () { return null; }
  };

  /* ---------------- 存储层：GitHub Issues ---------------- */
  var GithubStore = {
    mode: 'github',
    _tokenKey: 'ef_notes_gh_token',
    getToken: function () {
      return localStorage.getItem(this._tokenKey) || '';
    },
    setToken: function (t) {
      if (t) localStorage.setItem(this._tokenKey, t.trim());
      else localStorage.removeItem(this._tokenKey);
    },
    _memberKey: 'ef_notes_gh_member',
    // 本地缓存的成员态；无 Token 时一律视为访客
    isMember: function () {
      return !!this.getToken() && localStorage.getItem(this._memberKey) === '1';
    },
    _setMember: function (v) {
      if (v) localStorage.setItem(this._memberKey, '1');
      else localStorage.removeItem(this._memberKey);
    },
    // 校验当前 Token 所属用户是否为仓库协作者（拥有写权限即项目成员）；结果本地缓存
    checkMember: function () {
      var self = this;
      var t = this.getToken();
      if (!t) { self._setMember(false); return Promise.resolve(false); }
      var gh = CFG.github;
      var url = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo;
      return fetch(url, { headers: self._headers(t) }).then(function (r) {
        if (r.status === 401 || r.status === 403) {
          // Token 失效或无权查看：清除并视为访客
          self.setToken('');
          self._setMember(false);
          return false;
        }
        if (!r.ok) return self.isMember(); // 非鉴权类异常沿用缓存，避免误判
        return r.json().then(function (res) {
          var perms = (res && res.permissions) || {};
          var ok = !!(perms.push || perms.maintain || perms.admin);
          self._setMember(ok);
          return ok;
        });
      }).catch(function () { return self.isMember(); });
    },
    isAuthError: function (e) {
      return /\((401|403)\)/.test((e && e.message) || '');
    },
    // 弹出 Token 输入框；retry=true 表示上次写入因鉴权失败需重设；返回 null 表示用户取消
    promptToken: function (retry) {
      var cur = this.getToken();
      var msg;
      if (retry) {
        msg = '上次的 GitHub Token 无效或权限不足，写入失败。\n\n' +
          '请重新输入正确的 Token（需勾选 repo 权限），留空可取消：';
      } else if (cur) {
        msg = '当前已配置 GitHub Token（' + cur.slice(0, 4) + '****' + cur.slice(-4) + '）。\n\n' +
          '如需更换请输入新 Token，输入空白可清除：';
      } else {
        msg = '首次发小纸条需要提供个人 GitHub Token（勾选 repo 权限）：\n\n' +
          '生成方式：GitHub 个人头像 -> Settings -> Developer Settings -> Personal access tokens\n' +
          '输入后本浏览器会自动记住，以后发帖无需再输。\n\n' +
          '请输入你的 Token：';
      }
      var next = window.prompt(msg, retry ? '' : (cur || ''));
      if (next === null) return null;
      this.setToken(next);
      return next.trim();
    },
    ensureToken: function () {
      var t = this.getToken();
      if (t) return Promise.resolve(t);
      var input = this.promptToken(false);
      if (input) return Promise.resolve(input);
      return Promise.reject(new Error('未提供 GitHub Token，无法写入。如需发帖也可直接前往 GitHub Issues 页面发帖。'));
    },
    // 带鉴权自愈：写入遇 401/403 时清除失效 Token 并弹窗重设，填入新 Token 后自动重试一次
    withAuth: function (run) {
      var self = this;
      return self.ensureToken().then(function (token) {
        return run(token).catch(function (e) {
          if (!self.isAuthError(e)) throw e;
          self.setToken('');
          var next = self.promptToken(true);
          if (next) return run(next);
          throw new Error('GitHub Token 无效或权限不足，写入已取消。可点击面板右上角「GitHub Issues」重新设置。');
        });
      });
    },
    _headers: function (token) {
      var h = { 'Accept': 'application/vnd.github.v3+json' };
      var t = token || this.getToken();
      if (t) h['Authorization'] = 'Bearer ' + t;
      return h;
    },
    init: function () { return Promise.resolve(); },
    list: function () {
      var self = this;
      var gh = CFG.github;
      var base = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo;
      var issuesUrl = base + '/issues?state=all&labels=' + encodeURIComponent(gh.issueLabel) + '&per_page=100';
      var commentsUrl = base + '/issues/comments?per_page=100';

      var h = self._headers();

      // 项目隔离：按标题前缀判定归属（无前缀项目则排除其它项目前缀），避免多项目留言板串数据
      var tp = (CFG.titlePrefix || '').trim();
      var excludes = CFG.titleExcludePrefixes || [];
      function ownedByProject(title) {
        var t = String(title || '');
        if (t.indexOf('[小纸条]') !== 0) return false;
        if (tp) return t.indexOf('[小纸条] ' + tp) === 0;
        for (var i = 0; i < excludes.length; i++) {
          if (t.indexOf('[小纸条] ' + excludes[i]) === 0) return false;
        }
        return true;
      }

      function fetchIssues() {
        // no-store：GitHub 列表响应带 max-age=60 缓存头，写入后立即重读会命中旧缓存导致新纸条不显示
        return fetch(issuesUrl, { headers: self._headers(), cache: 'no-store' }).then(function (r) {
          if (r.status === 401 && self.getToken()) {
            // 本地残留的失效 Token 会阻断公开读取，清除后匿名重试一次
            self.setToken('');
            return fetch(issuesUrl, { headers: self._headers(), cache: 'no-store' });
          }
          return r;
        }).then(function (r) {
          if (!r.ok) throw new Error('拉取 Issues 失败 (' + r.status + ')');
          return r.json();
        });
      }

      return Promise.all([
        fetchIssues(),
        fetch(commentsUrl, { headers: h, cache: 'no-store' }).then(function (r) {
          if (!r.ok) return []; // comments 拉取失败时不阻断主帖呈现
          return r.json();
        }).catch(function () { return []; })
      ]).then(function (res) {
        var issues = Array.isArray(res[0]) ? res[0] : [];
        var comments = Array.isArray(res[1]) ? res[1] : [];

        var list = [];
        var issueMap = {};

        issues.forEach(function (it) {
          if (it.pull_request) return; // 排除 PR
          if (!ownedByProject(it.title)) return; // 排除其它项目的纸条
          var meta = { authors: [], targets: [], files: [] };
          var text = it.body || '';
          var m = text.match(/<!--\s*EF_NOTE\s*([\s\S]*?)\s*-->/);
          if (m) {
            try { meta = JSON.parse(m[1]); } catch (e) {}
            text = text.replace(/<!--\s*EF_NOTE\s*[\s\S]*?\s*-->/, '').trim();
          }

          var id = String(it.number);
          issueMap[id] = true;
          list.push({
            _id: id,
            authors: meta.authors || [],
            targets: meta.targets || [],
            files: meta.files || [],
            text: text,
            status: it.state === 'closed' ? 'resolved' : 'open',
            created_at: meta.created_at || new Date(it.created_at).getTime(),
            updated_at: new Date(it.updated_at).getTime(),
            parent_id: null,
            html_url: it.html_url
          });
        });

        comments.forEach(function (c) {
          var pId = c.issue_url ? c.issue_url.split('/').pop() : '';
          if (!pId || !issueMap[pId]) return;

          var meta = { authors: [] };
          var text = c.body || '';
          var m = text.match(/<!--\s*EF_REPLY\s*([\s\S]*?)\s*-->/);
          if (m) {
            try { meta = JSON.parse(m[1]); } catch (e) {}
            text = text.replace(/<!--\s*EF_REPLY\s*[\s\S]*?\s*-->/, '').trim();
          }

          list.push({
            _id: 'c_' + c.id,
            comment_id: c.id,
            authors: meta.authors || [],
            targets: [],
            text: text,
            status: 'open',
            created_at: meta.created_at || new Date(c.created_at).getTime(),
            updated_at: new Date(c.updated_at).getTime(),
            parent_id: pId
          });
        });

        return list;
      });
    },
    add: function (rec) {
      var self = this;
      var gh = CFG.github;
      return self.withAuth(function (token) {
        var base = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo;
        if (rec.parent_id) {
          // 回复评论
          var body = '<!--EF_REPLY\n' + JSON.stringify({
            authors: rec.authors || [],
            created_at: rec.created_at || Date.now()
          }) + '\n-->\n' + rec.text;

          return fetch(base + '/issues/' + rec.parent_id + '/comments', {
            method: 'POST',
            headers: Object.assign({}, self._headers(token), { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ body: body })
          }).then(function (r) {
            if (!r.ok) throw new Error('发回复失败 (' + r.status + ')，请检查 Token 权限');
            return r.json();
          }).then(function (res) {
            return 'c_' + res.id;
          });
        } else {
          // 发起主贴 Issue：标题带项目前缀，便于多项目留言板在同一仓库内相互隔离
          var tp = (CFG.titlePrefix || '').trim();
          var title = '[小纸条] ' + (tp ? tp + ' · ' : '') +
            (rec.text.slice(0, 26).replace(/\n/g, ' ') || '无标题');
          var body = '<!--EF_NOTE\n' + JSON.stringify({
            authors: rec.authors || [],
            targets: rec.targets || [],
            files: rec.files || [],
            created_at: rec.created_at || Date.now()
          }) + '\n-->\n' + rec.text;

          return fetch(base + '/issues', {
            method: 'POST',
            headers: Object.assign({}, self._headers(token), { 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              title: title,
              body: body,
              labels: [gh.issueLabel]
            })
          }).then(function (r) {
            if (!r.ok) throw new Error('发布小纸条失败 (' + r.status + ')，请检查 Token 权限');
            return r.json();
          }).then(function (res) {
            return String(res.number);
          });
        }
      });
    },
    setStatus: function (id, status) {
      var self = this;
      var gh = CFG.github;
      return self.withAuth(function (token) {
        var url = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/issues/' + id;
        return fetch(url, {
          method: 'PATCH',
          headers: Object.assign({}, self._headers(token), { 'Content-Type': 'application/json' }),
          body: JSON.stringify({ state: status === 'resolved' ? 'closed' : 'open' })
        }).then(function (r) {
          if (!r.ok) throw new Error('修改状态失败 (' + r.status + ')');
          return r.json();
        });
      });
    },
    remove: function (id) {
      var self = this;
      var gh = CFG.github;
      return self.withAuth(function (token) {
        var base = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo;
        if (id.indexOf('c_') === 0) {
          var commentId = id.slice(2);
          return fetch(base + '/issues/comments/' + commentId, {
            method: 'DELETE',
            headers: self._headers(token)
          }).then(function (r) {
            if (!r.ok && r.status !== 204) throw new Error('删除回复失败 (' + r.status + ')');
            return true;
          });
        } else {
          // 关闭 issue 并移除 ef-note 标签，作为删除处理
          return fetch(base + '/issues/' + id, {
            method: 'PATCH',
            headers: Object.assign({}, self._headers(token), { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ state: 'closed', state_reason: 'not_planned', labels: [] })
          }).then(function (r) {
            if (!r.ok) throw new Error('删除小纸条失败 (' + r.status + ')');
            return true;
          });
        }
      });
    },
    watch: function () { return null; }
  };

  /* ---------------- 存储层：CloudBase ---------------- */
  var CloudStore = {
    mode: 'cloud',
    _app: null,
    _db: null,
    init: function () {
      var self = this;
      return loadSdk().then(function (cloudbase) {
        self._app = cloudbase.init({ env: CFG.envId, region: CFG.region });
        return self._app.auth.signInAnonymously();
      }).then(function (res) {
        if (res && res.error) throw res.error;
        self._db = self._app.database();
        return true;
      });
    },
    _col: function () { return this._db.collection(CFG.collection); },
    list: function () {
      return this._col().limit(500).get().then(function (res) {
        return (res && res.data) || [];
      });
    },
    add: function (rec) {
      return this._col().add(rec).then(function (res) {
        return (res && (res._id || (res.data && res.data._id))) || '';
      });
    },
    setStatus: function (id, status) {
      return this._col().doc(id).update({ status: status, updated_at: Date.now() });
    },
    remove: function (id) {
      var self = this;
      return this._col().doc(id).remove().then(function () {
        return self._col().where({ parent_id: id }).remove();
      });
    },
    watch: function (onChange, onError) {
      try {
        return this._col().watch({
          onChange: function (snapshot) { onChange((snapshot && snapshot.docs) || []); },
          onError: function (err) { if (onError) onError(err); }
        });
      } catch (e) {
        if (onError) onError(e);
        return null;
      }
    }
  };

  function loadSdk() {
    if (window.cloudbase) return Promise.resolve(window.cloudbase);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = CFG.sdkUrl;
      s.onload = function () {
        if (window.cloudbase) resolve(window.cloudbase);
        else reject(new Error('CloudBase SDK 载入失败'));
      };
      s.onerror = function () { reject(new Error('无法连接 CloudBase SDK CDN')); };
      document.head.appendChild(s);
    });
  }

  /* ---------------- UI 状态与引用 ---------------- */
  var state = {
    store: null,
    notes: [],
    filter: 'all',
    q: '',
    replyFor: null,
    replyDraft: {},
    isMember: true, // 是否项目成员（仅 GitHub 模式按仓库写权限判定）
    pending: {}, // 乐观渲染暂存：写入成功但服务端列表尚未收录的条目（id -> {note, ts}）
    gone: {}, // 删除墓碑：本地已删除但服务端缓存仍可能返回的条目（id -> ts）
    statusOverride: {}, // 状态覆盖：本地已改、服务端尚未同步的状态（id -> {status, ts}）
    pollTimer: null,
    watchHandler: null
  };

  var els = {};
  var pickers = { authors: null, targets: null };

  /* ---------------- 整卡与双折叠子分区控制 ---------------- */
  var collapseState = {
    master: false,
    compose: false,
    list: false
  };

  try {
    var savedCollapse = localStorage.getItem(COLLAPSE_KEY);
    if (savedCollapse) collapseState = Object.assign(collapseState, JSON.parse(savedCollapse));
  } catch (e) {}

  function saveCollapseState() {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState)); } catch (e) {}
  }

  function updateCollapseUI() {
    var masterWrap = $('#ef-notes-main-wrap');
    var masterToggleBtn = $('#ef-notes-master-toggle');

    if (masterWrap) {
      masterWrap.setAttribute('data-master-collapsed', collapseState.master ? 'true' : 'false');
    }
    if (masterToggleBtn) {
      masterToggleBtn.setAttribute('aria-expanded', collapseState.master ? 'false' : 'true');
      masterToggleBtn.innerHTML = collapseState.master
        ? '<span class="ic">▾</span> 展开留言板'
        : '<span class="ic">▴</span> 收起留言板';
    }

    var composeSec = $('#ef-notes-compose-wrap');
    var listSec = $('#ef-notes-list-wrap');
    var toggleComposeBtn = $('#ef-notes-toggle-compose');
    var toggleListBtn = $('#ef-notes-toggle-list');
    var secComposeBtn = $('[data-toggle-sec="compose"]');
    var secListBtn = $('[data-toggle-sec="list"]');

    if (composeSec) composeSec.setAttribute('data-collapsed', collapseState.compose ? 'true' : 'false');
    if (toggleComposeBtn) toggleComposeBtn.setAttribute('aria-expanded', collapseState.compose ? 'false' : 'true');
    if (secComposeBtn) {
      secComposeBtn.setAttribute('aria-expanded', collapseState.compose ? 'false' : 'true');
      secComposeBtn.textContent = collapseState.compose ? '展开 ▾' : '收起 ▴';
    }

    if (listSec) listSec.setAttribute('data-collapsed', collapseState.list ? 'true' : 'false');
    if (toggleListBtn) toggleListBtn.setAttribute('aria-expanded', collapseState.list ? 'false' : 'true');
    if (secListBtn) {
      secListBtn.setAttribute('aria-expanded', collapseState.list ? 'false' : 'true');
      secListBtn.textContent = collapseState.list ? '展开 ▾' : '收起 ▴';
    }
  }

  function toggleCollapse(secName) {
    if (secName === 'master') {
      collapseState.master = !collapseState.master;
    } else if (secName === 'compose') {
      collapseState.compose = !collapseState.compose;
    } else if (secName === 'list') {
      collapseState.list = !collapseState.list;
    }
    saveCollapseState();
    updateCollapseUI();
  }

  function bindCollapse() {
    var masterToggleBtn = $('#ef-notes-master-toggle');
    var toggleComposeBtn = $('#ef-notes-toggle-compose');
    var toggleListBtn = $('#ef-notes-toggle-list');
    var secComposeBtn = $('[data-toggle-sec="compose"]');
    var secListBtn = $('[data-toggle-sec="list"]');

    if (masterToggleBtn) masterToggleBtn.addEventListener('click', function () { toggleCollapse('master'); });
    if (toggleComposeBtn) toggleComposeBtn.addEventListener('click', function () { toggleCollapse('compose'); });
    if (toggleListBtn) toggleListBtn.addEventListener('click', function () { toggleCollapse('list'); });
    if (secComposeBtn) secComposeBtn.addEventListener('click', function () { toggleCollapse('compose'); });
    if (secListBtn) secListBtn.addEventListener('click', function () { toggleCollapse('list'); });

    updateCollapseUI();
  }

  /* ---------------- 贴上/关联资产多选选择器与排列控制 ---------------- */
  var attachedAssets = []; // [{ relPath, cn, name, cat, kind, kindLabel, identifier }]
  var pickerSelected = {}; // relPath -> asset item
  var assetFilterQuery = '';

  var attachedLayout = 'list';
  var pickerLayout = 'list';
  try {
    attachedLayout = localStorage.getItem(ATTACHED_LAYOUT_KEY) || 'list';
    pickerLayout = localStorage.getItem('ef_picker_layout') || 'list';
  } catch (e) {}

  function setAttachedLayout(mode) {
    attachedLayout = mode === 'grid' ? 'grid' : 'list';
    try { localStorage.setItem(ATTACHED_LAYOUT_KEY, attachedLayout); } catch (e) {}
    var listEl = $('#ef-notes-attached-list');
    var segEl = $('#ef-attached-layout');
    if (listEl) listEl.setAttribute('data-layout', attachedLayout);
    if (segEl) {
      var btns = segEl.querySelectorAll('.ef-layout-btn');
      btns.forEach(function (b) {
        var isCur = b.getAttribute('data-layout') === attachedLayout;
        b.setAttribute('aria-pressed', isCur ? 'true' : 'false');
      });
    }
  }

  function setPickerLayout(mode) {
    pickerLayout = mode === 'grid' ? 'grid' : 'list';
    try { localStorage.setItem('ef_picker_layout', pickerLayout); } catch (e) {}
    var listEl = $('#ef-asset-picker-list');
    var segEl = $('#ef-asset-picker-layout');
    if (listEl) listEl.setAttribute('data-layout', pickerLayout);
    if (segEl) {
      var btns = segEl.querySelectorAll('.ef-layout-btn');
      btns.forEach(function (b) {
        var isCur = b.getAttribute('data-layout') === pickerLayout;
        b.setAttribute('aria-pressed', isCur ? 'true' : 'false');
      });
    }
  }

  var cachedAssets = null;
  function getFlatAssets() {
    if (cachedAssets) return cachedAssets;
    if (ASSETS && Array.isArray(ASSETS.FLAT)) {
      var seen = {};
      var list = [];
      var kindMap = {
        model: '模型',
        animation: '动画',
        texture: '贴图'
      };
      ASSETS.FLAT.forEach(function (f) {
        var r = f.rel_path || f.relPath || f.path || '';
        if (!r || seen[r]) return;
        seen[r] = true;
        var entry = f._entry || {};
        var cn = entry.chinese_name || f.chinese_name || f.cn || '';
        var name = f.file_name || f.name || r.split(/[\\/]/).pop();
        var cat = entry.category || f.category || '';
        var kind = f._kind || 'asset';
        var kindLabel = kindMap[kind] || '资产';
        var identifier = entry.identifier || entry.id || '';
        list.push({
          relPath: r,
          name: name,
          cn: cn,
          cat: cat,
          kind: kind,
          kindLabel: kindLabel,
          identifier: identifier
        });
      });
      cachedAssets = list;
      return cachedAssets;
    }
    return [];
  }

  function syncAttachedUI() {
    var countEl = $('#ef-notes-assets-count');
    var listEl = $('#ef-notes-attached-list');
    var layoutSeg = $('#ef-attached-layout');
    if (!listEl) return;

    if (!attachedAssets.length) {
      if (countEl) countEl.textContent = '未关联文件';
      if (layoutSeg) layoutSeg.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }

    if (countEl) countEl.textContent = '已贴上 ' + attachedAssets.length + ' 个关联文件';
    if (layoutSeg) layoutSeg.style.display = '';

    listEl.setAttribute('data-layout', attachedLayout);

    listEl.innerHTML = attachedAssets.map(function (item, idx) {
      var cnTitle = item.cn || item.name;
      var kindLabel = item.kindLabel || (item.kind === 'model' ? '模型' : item.kind === 'animation' ? '动画' : item.kind === 'texture' ? '贴图' : '资产');
      return '' +
        '<div class="notes-attached-item cut-br" data-idx="' + idx + '" data-asset-path="' + esc(item.relPath) + '">' +
          '<div class="notes-attached-item-main">' +
            '<div class="notes-attached-item-header">' +
              '<span class="notes-attached-kind-badge">' + esc(kindLabel) + '</span>' +
              '<strong class="notes-attached-cn">' + esc(cnTitle) + '</strong>' +
              (item.identifier ? '<span class="notes-attached-id">' + esc(item.identifier) + '</span>' : '') +
            '</div>' +
            '<div class="notes-attached-item-row notes-attached-item-file">' +
              '<span class="notes-attached-prop">真实文件:</span>' +
              '<code class="notes-attached-filename">' + esc(item.name) + '</code>' +
            '</div>' +
            '<div class="notes-attached-item-row notes-attached-item-path">' +
              '<span class="notes-attached-prop">相对路径:</span>' +
              '<span class="notes-attached-relpath">' + esc(item.relPath) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="notes-attached-item-actions">' +
            '<button type="button" class="ef-btn small cut-br notes-attached-view-btn" data-view-asset="' + esc(item.relPath) + '" title="在网站中定位此资产">查看详情</button>' +
            '<button type="button" class="notes-attached-del-btn" data-del-asset="' + idx + '" title="移除此文件">✕ 移除</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderPickerList() {
    var listEl = $('#ef-asset-picker-list');
    var countEl = $('#ef-asset-picker-count');
    var totalEl = $('#ef-asset-picker-total');
    if (!listEl) return;

    listEl.setAttribute('data-layout', pickerLayout);

    var all = getFlatAssets();
    var q = assetFilterQuery.trim().toLowerCase();

    var filtered = all;
    if (q) {
      filtered = all.filter(function (it) {
        var cn = (it.cn || '').toLowerCase();
        var name = (it.name || '').toLowerCase();
        var relPath = (it.relPath || '').toLowerCase();
        var cat = (it.cat || '').toLowerCase();
        var kind = (it.kind || '').toLowerCase();
        var kindLabel = (it.kindLabel || '').toLowerCase();
        var identifier = (it.identifier || '').toLowerCase();
        return cn.indexOf(q) >= 0 || name.indexOf(q) >= 0 || relPath.indexOf(q) >= 0 ||
               cat.indexOf(q) >= 0 || kind.indexOf(q) >= 0 || kindLabel.indexOf(q) >= 0 ||
               identifier.indexOf(q) >= 0;
      });
    }

    var selectedCount = Object.keys(pickerSelected).length;
    if (countEl) countEl.textContent = '已勾选 ' + selectedCount + ' 项';
    if (totalEl) totalEl.textContent = '检索出 ' + filtered.length + ' / ' + all.length + ' 项';

    if (!filtered.length) {
      listEl.innerHTML = '<div class="ef-asset-picker-empty">// 未找到匹配的美术资产文件</div>';
      return;
    }

    var limit = 300;
    var slice = filtered.slice(0, limit);

    listEl.innerHTML = slice.map(function (it) {
      var isChecked = !!pickerSelected[it.relPath];
      var cnTitle = it.cn || it.name;
      var kindLabel = it.kindLabel || (it.kind === 'model' ? '模型' : it.kind === 'animation' ? '动画' : it.kind === 'texture' ? '贴图' : '资产');
      return '' +
        '<div class="ef-asset-item cut-br' + (isChecked ? ' is-checked' : '') + '" data-asset-path="' + esc(it.relPath) + '">' +
          '<div class="ef-asset-item-box" aria-hidden="true"></div>' +
          '<div class="ef-asset-item-meta">' +
            '<div class="ef-asset-item-head">' +
              '<span class="ef-asset-item-kind">' + esc(kindLabel) + '</span>' +
              '<strong class="ef-asset-item-cn">' + esc(cnTitle) + '</strong>' +
              (it.identifier ? '<span class="ef-asset-item-id">' + esc(it.identifier) + '</span>' : '') +
            '</div>' +
            '<div class="ef-asset-item-row ef-asset-item-file">' +
              '<span class="ef-asset-item-label">真实文件:</span>' +
              '<code class="ef-asset-item-name">' + esc(it.name) + '</code>' +
            '</div>' +
            '<div class="ef-asset-item-row ef-asset-item-path">' +
              '<span class="ef-asset-item-label">相对路径:</span>' +
              '<span class="ef-asset-item-relpath">' + esc(it.relPath) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function openAssetPicker() {
    var dialog = $('#ef-asset-picker');
    if (!dialog) return;

    activePickerOwner = INST; // 弹窗全局唯一，登记归属实例
    pickerSelected = {};
    attachedAssets.forEach(function (it) {
      pickerSelected[it.relPath] = it;
    });

    var searchInput = $('#ef-asset-search');
    if (searchInput) searchInput.value = '';
    assetFilterQuery = '';

    renderPickerList();
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeAssetPicker() {
    var dialog = $('#ef-asset-picker');
    if (!dialog) return;
    if (activePickerOwner === INST) activePickerOwner = null;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function bindAssetPicker() {
    var attachBtn = $('#ef-notes-attach-btn');
    var dialog = $('#ef-asset-picker');
    var closeBtn = $('#ef-asset-picker-close');
    var cancelBtn = $('#ef-asset-picker-cancel');
    var confirmBtn = $('#ef-asset-picker-confirm');
    var searchInput = $('#ef-asset-search');
    var selectAllBtn = $('#ef-asset-select-all');
    var clearAllBtn = $('#ef-asset-clear-all');
    var listEl = $('#ef-asset-picker-list');
    var attachedListEl = $('#ef-notes-attached-list');

    if (attachBtn) attachBtn.addEventListener('click', openAssetPicker);
    // 以下元素属于全局共享弹窗：仅当本实例是弹窗当前归属者时才响应，避免多块留言板串写
    if (closeBtn) closeBtn.addEventListener('click', function () {
      if (activePickerOwner !== INST) return;
      closeAssetPicker();
    });
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      if (activePickerOwner !== INST) return;
      closeAssetPicker();
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (activePickerOwner !== INST) return;
        attachedAssets = Object.keys(pickerSelected).map(function (k) { return pickerSelected[k]; });
        syncAttachedUI();
        closeAssetPicker();
      });
    }

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', function () {
        if (activePickerOwner !== INST) return;
        var all = getFlatAssets();
        var q = assetFilterQuery.trim().toLowerCase();
        var filtered = all;
        if (q) {
          filtered = all.filter(function (it) {
            var cn = (it.cn || '').toLowerCase();
            var name = (it.name || '').toLowerCase();
            var relPath = (it.relPath || '').toLowerCase();
            var cat = (it.cat || '').toLowerCase();
            var kind = (it.kind || '').toLowerCase();
            var kindLabel = (it.kindLabel || '').toLowerCase();
            var identifier = (it.identifier || '').toLowerCase();
            return cn.indexOf(q) >= 0 || name.indexOf(q) >= 0 || relPath.indexOf(q) >= 0 ||
                   cat.indexOf(q) >= 0 || kind.indexOf(q) >= 0 || kindLabel.indexOf(q) >= 0 ||
                   identifier.indexOf(q) >= 0;
          });
        }
        filtered.forEach(function (it) {
          pickerSelected[it.relPath] = {
            relPath: it.relPath,
            name: it.name,
            cn: it.cn || it.name,
            cat: it.cat,
            kind: it.kind,
            kindLabel: it.kindLabel,
            identifier: it.identifier
          };
        });
        renderPickerList();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function () {
        if (activePickerOwner !== INST) return;
        pickerSelected = {};
        renderPickerList();
      });
    }

    if (searchInput) {
      var sTimer = 0;
      searchInput.addEventListener('input', function () {
        if (activePickerOwner !== INST) return;
        clearTimeout(sTimer);
        sTimer = setTimeout(function () {
          assetFilterQuery = searchInput.value || '';
          renderPickerList();
        }, 120);
      });
    }

    // 弹窗排列方式切换（详细列表 ☰ / 网格平铺 ⊞）
    var pickerLayoutSeg = $('#ef-asset-picker-layout');
    if (pickerLayoutSeg) {
      pickerLayoutSeg.addEventListener('click', function (ev) {
        if (activePickerOwner !== INST) return;
        var btn = ev.target.closest('.ef-layout-btn');
        if (!btn) return;
        var mode = btn.dataset.layout;
        if (mode) setPickerLayout(mode);
      });
    }

    // 编写区已贴文件排列方式切换（清单列表 ☰ / 多列平铺 ⊞）
    var attachedLayoutSeg = $('#ef-attached-layout');
    if (attachedLayoutSeg) {
      attachedLayoutSeg.addEventListener('click', function (ev) {
        var btn = ev.target.closest('.ef-layout-btn');
        if (!btn) return;
        var mode = btn.dataset.layout;
        if (mode) setAttachedLayout(mode);
      });
    }

    if (listEl) {
      listEl.addEventListener('click', function (ev) {
        if (activePickerOwner !== INST) return;
        var itemEl = ev.target.closest('.ef-asset-item');
        if (!itemEl) return;
        var p = itemEl.dataset.assetPath;
        if (!p) return;

        if (pickerSelected[p]) {
          delete pickerSelected[p];
        } else {
          var all = getFlatAssets();
          var found = all.find(function (a) { return a.relPath === p; });
          if (found) {
            pickerSelected[p] = {
              relPath: found.relPath,
              name: found.name,
              cn: found.cn || found.name,
              cat: found.cat,
              kind: found.kind,
              kindLabel: found.kindLabel,
              identifier: found.identifier
            };
          }
        }
        renderPickerList();
      });
    }

    if (attachedListEl) {
      attachedListEl.addEventListener('click', function (ev) {
        var delBtn = ev.target.closest('[data-del-asset]');
        if (delBtn) {
          var idx = Number(delBtn.dataset.delAsset);
          if (!isNaN(idx) && idx >= 0 && idx < attachedAssets.length) {
            attachedAssets.splice(idx, 1);
            syncAttachedUI();
          }
          return;
        }

        var viewBtn = ev.target.closest('[data-view-asset]');
        if (viewBtn) {
          var relPath = viewBtn.dataset.viewAsset;
          if (ASSETS && typeof ASSETS.openDrawerByRelPath === 'function') {
            ASSETS.openDrawerByRelPath(relPath);
          }
        }
      });
    }

    setAttachedLayout(attachedLayout);
    setPickerLayout(pickerLayout);
  }

  /* ---------------- UI 渲染 ---------------- */
  function visibleTops() {
    var list = state.notes.filter(function (n) { return !n.parent_id; });
    if (state.filter === 'open') {
      list = list.filter(function (n) { return n.status !== 'resolved'; });
    } else if (state.filter === 'resolved') {
      list = list.filter(function (n) { return n.status === 'resolved'; });
    }
    if (state.q) {
      var q = state.q.toLowerCase();
      list = list.filter(function (n) {
        var txt = (n.text || '').toLowerCase();
        var authors = (n.authors || []).join(' ').toLowerCase();
        var targets = (n.targets || []).join(' ').toLowerCase();
        return txt.indexOf(q) >= 0 || authors.indexOf(q) >= 0 || targets.indexOf(q) >= 0;
      });
    }
    return list;
  }

  function peopleTags(arr) {
    return toArray(arr).map(function (name) {
      return '<span class="ef-tag">' + esc(name) + '</span>';
    }).join('');
  }

  function replyFormHtml(parent) {
    var targets = toArray(parent.targets);
    var targetHint = targets.length
      ? '<span class="notes-reply-target">（对接人继承：' + targets.map(esc).join('、') + '）</span>'
      : '';
    var draft = state.replyDraft[parent._id] || '';
    return '' +
      '<form class="notes-reply-form cut-br" data-reply-for="' + esc(parent._id) + '" ' +
        (state.replyFor === parent._id ? '' : 'hidden') + '>' +
        '<div class="notes-row">' +
          '<label class="notes-label">回复人 <i>/ 多选</i></label>' +
          '<div data-reply-authors-for="' + esc(parent._id) + '"></div>' +
        '</div>' +
        '<div class="notes-row">' +
          '<label class="notes-label">内容 ' + targetHint + '</label>' +
          '<textarea class="notes-text small" rows="2" maxlength="' + CFG.maxLength + '" ' +
            'placeholder="输入回复内容（Ctrl+Enter 发送）...">' + esc(draft) + '</textarea>' +
        '</div>' +
        '<div class="notes-acts">' +
          '<button type="submit" class="ef-btn small">发送回复</button>' +
          '<button type="button" class="ef-btn small text" data-act="cancel-reply">取消</button>' +
        '</div>' +
      '</form>';
  }

  function cardHtml(n, isReply, parent) {
    var isResolved = n.status === 'resolved';
    var authors = toArray(n.authors);
    var targets = isReply ? [] : toArray(n.targets);
    var acts = [];

    if (state.isMember) {
      if (!isReply) {
        acts.push('<button class="notes-link" data-act="reply" data-id="' + esc(n._id) + '">回复</button>');
        acts.push(
          '<button class="notes-link" data-act="toggle-status" data-id="' + esc(n._id) + '">' +
            (isResolved ? '重新打开' : '标记已解决') +
          '</button>'
        );
      }
      acts.push('<button class="notes-link is-danger" data-act="delete" data-id="' + esc(n._id) + '">删除</button>');
    } else if (!isReply) {
      // 访客只读提示
      acts.push('<span class="notes-guest-hint">// 只读 · 仅项目成员可回复 / 编辑 / 删除</span>');
    }

    var targetBlock = (!isReply && targets.length)
      ? '<span class="notes-meta-sep">│</span><span class="notes-targets-label">对接 →</span> ' + peopleTags(targets)
      : '';

    var assetsBlock = '';
    var files = Array.isArray(n.files) ? n.files : [];
    if (files.length) {
      assetsBlock = '' +
        '<div class="notes-card-assets">' +
          '<div class="notes-card-assets-label">// 关联文件 (' + files.length + ' 项):</div>' +
          '<div class="notes-card-assets-list">' +
            files.map(function (f) {
              var cn = f.cn || f.name || f.relPath;
              var name = f.name || (f.relPath ? f.relPath.split(/[\\/]/).pop() : '');
              var kindLabel = f.kindLabel || (f.kind === 'model' ? '模型' : f.kind === 'animation' ? '动画' : f.kind === 'texture' ? '贴图' : (f.cat || '资产'));
              return '<button type="button" class="notes-asset-card cut-br" data-open-asset="' + esc(f.relPath) + '" title="在网站中打开此资产详情">' +
                '<div class="notes-asset-card-top">' +
                  '<span class="notes-asset-card-kind">' + esc(kindLabel) + '</span>' +
                  '<strong class="notes-asset-card-cn">' + esc(cn) + '</strong>' +
                '</div>' +
                '<div class="notes-asset-card-row">' +
                  '<span class="notes-asset-card-k">文件:</span>' +
                  '<code class="notes-asset-card-file">' + esc(name) + '</code>' +
                '</div>' +
                '<div class="notes-asset-card-row">' +
                  '<span class="notes-asset-card-k">路径:</span>' +
                  '<span class="notes-asset-card-path">' + esc(f.relPath) + '</span>' +
                '</div>' +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    return '' +
      '<article class="notes-card" data-note-id="' + esc(n._id) + '">' +
        '<header class="notes-meta">' +
          '<div class="notes-people">' +
            peopleTags(authors) +
            targetBlock +
          '</div>' +
          '<div class="notes-right">' +
            (!isReply ? '<span class="ef-state ' + (isResolved ? 'is-resolved' : 'is-alert') + '">' +
              (isResolved ? '已解决' : '待处理') + '</span>' : '') +
            '<time class="notes-time">' + esc(fmtTime(n.created_at)) + '</time>' +
          '</div>' +
        '</header>' +
        '<div class="notes-body">' + esc(n.text) + '</div>' +
        assetsBlock +
        '<footer class="notes-acts">' + acts.join('') + '</footer>' +
      '</article>';
  }

  function render() {
    var repliesByParent = {};
    state.notes.forEach(function (n) {
      if (n.parent_id) (repliesByParent[n.parent_id] = repliesByParent[n.parent_id] || []).push(n);
    });

    var totalTops = state.notes.filter(function (n) { return !n.parent_id; });
    var openCount = totalTops.filter(function (n) { return n.status !== 'resolved'; }).length;
    var resolvedCount = totalTops.length - openCount;
    if (els.count) {
      els.count.textContent = '共 ' + totalTops.length + ' 条 │ 待处理 ' + openCount + ' │ 已解决 ' + resolvedCount;
    }

    var visible = visibleTops();
    visible.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });

    if (!visible.length) {
      els.list.innerHTML = '';
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    var html = visible.map(function (top) {
      var reps = repliesByParent[top._id] || [];
      reps.sort(function (a, b) { return (a.created_at || 0) - (b.created_at || 0); });
      var repsHtml = reps.map(function (r) {
        return '<li class="notes-reply-item">' + cardHtml(r, true, top) + '</li>';
      }).join('');

      var replyListHtml = reps.length ? '<ul class="notes-replies">' + repsHtml + '</ul>' : '';
      var formHtml = state.isMember ? replyFormHtml(top) : '';

      return '' +
        '<li class="notes-item ' + (top.status === 'resolved' ? 'is-resolved' : '') + '" data-id="' + esc(top._id) + '">' +
          cardHtml(top, false, null) +
          replyListHtml +
          formHtml +
        '</li>';
    }).join('');

    els.list.innerHTML = html;

    visible.forEach(function (top) {
      var box = els.list.querySelector('[data-reply-authors-for="' + top._id + '"]');
      if (box && !box._picker) {
        var picker = new DropdownMultiSelect(box, CFG.authors, lastAuthors(), '// 请选择回复人', '// REPLY AS');
        box._picker = picker;
      }
    });
  }

  /* ---------------- 交互与逻辑 ---------------- */
  function lastAuthors() {
    try {
      var raw = localStorage.getItem(CFG.localKey + '_me');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function rememberAuthors(arr) {
    try { localStorage.setItem(CFG.localKey + '_me', JSON.stringify(arr)); } catch (e) {}
  }

  function collectTargets() {
    var list = pickers.targets ? pickers.targets.value() : [];
    var custom = (els.customTarget ? els.customTarget.value : '').trim();
    if (custom && list.indexOf(custom) < 0) list.push(custom);
    return list;
  }

  function showError(msg) {
    if (!els.error) return;
    els.error.textContent = msg || '';
    els.error.hidden = !msg;
  }

  function disable(flag) {
    if (els.submit) els.submit.disabled = flag;
    if (els.text) els.text.disabled = flag;
  }

  function submitCompose(ev) {
    if (ev) ev.preventDefault();
    showError('');
    var authors = pickers.authors ? pickers.authors.value() : [];
    var targets = collectTargets();
    var text = (els.text.value || '').trim();

    if (!authors.length) { showError('请至少选择一位填写人。'); return; }
    if (!text) { showError('请输入小纸条内容。'); return; }
    if (text.length > CFG.maxLength) { showError('内容超过 ' + CFG.maxLength + ' 字限制。'); return; }

    var rec = {
      authors: authors,
      targets: targets,
      files: attachedAssets.slice(),
      text: text,
      status: 'open',
      parent_id: null,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    disable(true);
    state.store.add(rec).then(function (newId) {
      disable(false);
      rememberAuthors(authors);
      els.text.value = '';
      if (els.customTarget) els.customTarget.value = '';
      if (pickers.targets) pickers.targets.setSelected([]);
      attachedAssets = [];
      syncAttachedUI();
      updateCounter();
      addPending(Object.assign({}, rec, { _id: newId })); // 本地即时上屏，不等服务端列表
      refresh(false);
      refreshMember(); // 首次录入 Token 后重新判定成员态
    }).catch(function (e) {
      disable(false);
      showError('发送失败：' + (e && e.message ? e.message : e));
    });
  }

  function submitReply(form, parentId, ev) {
    if (ev) ev.preventDefault();
    var box = form.querySelector('[data-reply-authors-for]');
    var picker = box && box._picker;
    var authors = picker ? picker.value() : [];
    var ta = form.querySelector('textarea');
    var text = (ta && ta.value || '').trim();

    if (!authors.length) { alert('请至少选择一位回复人。'); return; }
    if (!text) { alert('请输入回复内容。'); return; }
    if (text.length > CFG.maxLength) { alert('回复超过 ' + CFG.maxLength + ' 字限制。'); return; }

    var rec = {
      authors: authors,
      targets: [],
      text: text,
      status: 'open',
      parent_id: parentId,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    var subBtn = form.querySelector('button[type="submit"]');
    if (subBtn) subBtn.disabled = true;

    state.store.add(rec).then(function (newId) {
      if (subBtn) subBtn.disabled = false;
      rememberAuthors(authors);
      state.replyFor = null;
      delete state.replyDraft[parentId];
      addPending(Object.assign({}, rec, { _id: newId })); // 本地即时上屏，不等服务端列表
      refresh(false);
    }).catch(function (e) {
      if (subBtn) subBtn.disabled = false;
      alert('回复失败：' + (e && e.message ? e.message : e));
    });
  }

  function updateCounter() {
    if (!els.counter || !els.text) return;
    var len = (els.text.value || '').length;
    els.counter.textContent = len + ' / ' + CFG.maxLength;
    els.counter.classList.toggle('is-over', len > CFG.maxLength);
  }

  function normalize(rec) {
    return {
      _id: String(rec._id || uid()),
      parent_id: rec.parent_id ? String(rec.parent_id) : null,
      authors: toArray(rec.authors),
      targets: toArray(rec.targets),
      files: Array.isArray(rec.files) ? rec.files : [],
      text: String(rec.text || ''),
      status: rec.status === 'resolved' ? 'resolved' : 'open',
      created_at: Number(rec.created_at) || Date.now(),
      updated_at: Number(rec.updated_at) || Number(rec.created_at) || Date.now()
    };
  }

  /* 乐观渲染：GitHub 列表接口读侧有缓存/收录延迟，写入成功后先本地落一条并暂存，
     刷新时若服务端仍未收录则由暂存补齐，避免"提交后要等一会儿才出现" */
  var OVERLAY_TTL = 180000; // 3 分钟兜底，防止异常时覆盖项长期驻留

  function addPending(rec) {
    var note = normalize(rec);
    delete state.gone[note._id]; // 与墓碑互斥（同 id 复活时以最新写入为准）
    state.pending[note._id] = { note: note, ts: Date.now() };
    state.notes.push(note);
    render();
    return note;
  }

  function mergePending(list) {
    var now = Date.now();
    Object.keys(state.pending).forEach(function (id) {
      var p = state.pending[id];
      if (!p || now - p.ts > OVERLAY_TTL) { delete state.pending[id]; return; }
      var hit = list.some(function (n) { return n._id === id; });
      if (hit) { delete state.pending[id]; return; } // 服务端已收录，改用权威数据
      list.push(p.note);
    });
    return list;
  }

  /* 本地删除：立即移出视图并立墓碑，服务端缓存仍返回该条时由墓碑过滤（含其子回复） */
  function removeLocal(id) {
    var now = Date.now();
    var killed = {};
    killed[id] = true;
    state.notes.forEach(function (n) { if (n.parent_id === id) killed[n._id] = true; });
    Object.keys(killed).forEach(function (k) {
      state.gone[k] = now;
      delete state.pending[k]; // 防止 mergePending 把刚删的条目补回来
    });
    state.notes = state.notes.filter(function (n) { return !killed[n._id]; });
    render();
  }

  /* 本地改状态：立即覆盖视图，服务端同步后由 applyOverlay 自动解除 */
  function setStatusLocal(id, status) {
    state.statusOverride[id] = { status: status, ts: Date.now() };
    state.notes.forEach(function (n) { if (n._id === id) n.status = status; });
    render();
  }

  /* 把服务端列表与本地覆盖层合并：墓碑过滤 → 补齐暂存 → 强制状态覆盖 */
  function applyOverlay(serverList) {
    var now = Date.now();

    // 1) 墓碑：服务端仍在返回被删条目时剔除；不再返回即清除墓碑
    Object.keys(state.gone).forEach(function (id) {
      if (now - state.gone[id] > OVERLAY_TTL) { delete state.gone[id]; return; }
      var hit = false;
      for (var i = serverList.length - 1; i >= 0; i--) {
        if (serverList[i]._id === id) { serverList.splice(i, 1); hit = true; }
      }
      if (!hit) delete state.gone[id];
    });

    // 2) 补齐写入成功但服务端尚未收录的条目，并对其再过滤一次墓碑
    mergePending(serverList);
    Object.keys(state.gone).forEach(function (id) {
      for (var i = serverList.length - 1; i >= 0; i--) {
        if (serverList[i]._id === id) serverList.splice(i, 1);
      }
    });

    // 3) 状态覆盖：本地已改的状态优先，服务端追上后解除
    Object.keys(state.statusOverride).forEach(function (id) {
      var ov = state.statusOverride[id];
      if (!ov || now - ov.ts > OVERLAY_TTL) { delete state.statusOverride[id]; return; }
      var rec = null;
      serverList.some(function (n) { if (n._id === id) { rec = n; return true; } return false; });
      if (!rec) return; // 尚未收录，保持覆盖等待
      if (rec.status === ov.status) { delete state.statusOverride[id]; return; }
      rec.status = ov.status;
    });

    return serverList;
  }

  function refresh(silent) {
    if (!state.store) return Promise.resolve();
    return state.store.list().then(function (rawList) {
      state.notes = applyOverlay((rawList || []).map(normalize));
      render();
    }).catch(function (e) {
      console.warn('[小纸条] 刷新失败：', e);
      if (!silent) showError('加载失败：' + (e && e.message ? e.message : e));
    });
  }

  function startSync() {
    if (!state.store) return;
    startPolling();
  }

  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (!CFG.pollInterval || CFG.pollInterval <= 0) return;
    state.pollTimer = setInterval(function () {
      if (document.visibilityState === 'visible') refresh(true);
    }, CFG.pollInterval);
  }

  function bindList() {
    els.list.addEventListener('click', function (ev) {
      var assetChip = ev.target.closest('[data-open-asset]');
      if (assetChip) {
        ev.preventDefault();
        var relPath = assetChip.dataset.openAsset;
        if (ASSETS && typeof ASSETS.openDrawerByRelPath === 'function') {
          ASSETS.openDrawerByRelPath(relPath);
        }
        return;
      }

      var btn = ev.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      var id = btn.dataset.id;

      // 成员守卫：回复 / 状态 / 删除仅项目成员可用（按钮已按成员态隐藏，此处防御）
      if ((act === 'reply' || act === 'toggle-status' || act === 'delete') && !state.isMember) {
        alert('仅项目成员可回复 / 编辑 / 删除小纸条。');
        return;
      }

      if (act === 'reply') {
        state.replyFor = (state.replyFor === id) ? null : id;
        render();
        if (state.replyFor) {
          var f = els.list.querySelector('[data-reply-for="' + id + '"]');
          var ta = f && f.querySelector('textarea');
          if (ta) ta.focus();
        }
      } else if (act === 'cancel-reply') {
        state.replyFor = null;
        render();
      } else if (act === 'toggle-status') {
        var cur = state.notes.find(function (n) { return n._id === id; });
        if (!cur) return;
        var next = cur.status === 'resolved' ? 'open' : 'resolved';
        state.store.setStatus(id, next).then(function () {
          setStatusLocal(id, next); // 立即本地生效，不等服务端列表回读
          refresh(false);
        }).catch(function (e) { alert('修改状态失败：' + (e && e.message ? e.message : e)); });
      } else if (act === 'delete') {
        if (!window.confirm('确定要删除这条小纸条吗？（如有回复将一并删除）')) return;
        state.store.remove(id).then(function () {
          removeLocal(id); // 立即本地移除，不等服务端列表回读
          refresh(false);
        }).catch(function (e) { alert('删除失败：' + (e && e.message ? e.message : e)); });
      }
    });

    els.list.addEventListener('submit', function (ev) {
      var form = ev.target.closest('[data-reply-for]');
      if (!form) return;
      submitReply(form, form.dataset.replyFor, ev);
    });
  }

  function bindCompose() {
    els.form.addEventListener('submit', submitCompose);
    els.text.addEventListener('input', updateCounter);
    els.text.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        els.form.requestSubmit ? els.form.requestSubmit() : submitCompose(ev);
      }
    });
    if (els.refreshBtn) els.refreshBtn.addEventListener('click', function () { refresh(false); });
    if (els.resetBtn) els.resetBtn.addEventListener('click', function () {
      els.text.value = ''; if (els.customTarget) els.customTarget.value = '';
      if (pickers.targets) pickers.targets.setSelected([]);
      if (pickers.authors) pickers.authors.setSelected([]);
      attachedAssets = [];
      syncAttachedUI();
      showError(''); updateCounter();
    });
  }

  function bindToolbar() {
    els.filterBox.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-nf]');
      if (!btn) return;
      state.filter = btn.dataset.nf;
      Array.prototype.forEach.call(els.filterBox.querySelectorAll('[data-nf]'), function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      render();
    });
    var timer = 0;
    els.search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = els.search.value.trim(); render(); }, 90);
    });
  }

  /* ---------------- 启动 ---------------- */
  // 判定当前访客是否为项目成员并同步 UI；仅 GitHub 模式需校验仓库写权限，其余模式视为成员
  function refreshMember() {
    if (!state.store || state.store.mode !== 'github') {
      if (state.isMember !== true) { state.isMember = true; render(); }
      return Promise.resolve(true);
    }
    var cached = GithubStore.isMember();
    if (cached !== state.isMember) { state.isMember = cached; render(); }
    return GithubStore.checkMember().then(function (ok) {
      if (ok !== state.isMember) { state.isMember = ok; render(); }
      return ok;
    });
  }

  function setMode(store) {
    state.store = store;
    var isGithub = store.mode === 'github';
    var isCloud = store.mode === 'cloud';
    if (els.mode) {
      els.mode.textContent = isGithub ? 'GitHub Issues' : (isCloud ? '云端同步' : '本地模式');
      els.mode.title = isGithub
        ? ('数据源：' + CFG.github.owner + '/' + CFG.github.repo)
        : (isCloud ? ('环境：' + CFG.envId) : '数据仅保存在当前浏览器');
      // 如果是 GitHub 模式，允许点击切换或查看 Token
      els.mode.style.cursor = isGithub ? 'pointer' : 'default';
      els.mode.onclick = isGithub ? function () {
        var next = GithubStore.promptToken(false);
        if (next !== null) {
          alert(next ? 'Token 已更新！' : 'Token 已清除。');
          refreshMember();
        }
      } : null;
    }
    if (els.hint) {
      if (isGithub) {
        els.hint.innerHTML = '小纸条直接存放在 <strong>GitHub Issues</strong>任何人打开免登录直接阅读，发帖时需录入一次个人 Token。';
      } else if (isCloud) {
        els.hint.innerHTML = '小纸条由三人共享，<strong>写完后其他人约半分钟内可见</strong>。';
      } else {
        els.hint.innerHTML = '当前是<strong>本地模式</strong>，小纸条只保存在这台电脑的浏览器里。';
      }
    }
    state.isMember = isGithub ? GithubStore.isMember() : true;
    render();
    refresh(false).then(startSync, startSync);
    refreshMember();
  }

  function boot() {
    els = {
      root: $('#ef-notes'),
      mode: $('#ef-notes-mode'),
      count: $('#ef-notes-count'),
      hint: $('#ef-notes-hint'),
      error: $('#ef-notes-error'),
      form: $('#ef-notes-form'),
      authorsHost: $('#ef-notes-authors-dropdown'),
      targetsHost: $('#ef-notes-targets-dropdown'),
      customTarget: $('#ef-notes-target-custom'),
      targetOptions: $('#ef-notes-target-options'),
      text: $('#ef-notes-text'),
      counter: $('#ef-notes-counter'),
      submit: $('#ef-notes-submit'),
      resetBtn: $('#ef-notes-reset'),
      refreshBtn: $('#ef-notes-refresh'),
      filterBox: $('#ef-notes-filter'),
      search: $('#ef-notes-q'),
      list: $('#ef-notes-list'),
      empty: $('#ef-notes-empty')
    };
    if (!els.root || !els.form) return;

    if (els.authorsHost) {
      pickers.authors = new DropdownMultiSelect(els.authorsHost, CFG.authors, lastAuthors(), '// 请选择填写人', '// 填写人 (多选)');
    }
    if (els.targetsHost) {
      pickers.targets = new DropdownMultiSelect(els.targetsHost, CFG.targets, [], '// 请选择对接人', '// 对接人 (可选)');
    }

    if (els.targetOptions) {
      els.targetOptions.innerHTML = CFG.targets.map(function (n) {
        return '<option value="' + esc(n) + '"></option>';
      }).join('');
    }
    if (els.customTarget) els.customTarget.hidden = !CFG.allowCustomTarget;

    bindCollapse();
    bindAssetPicker();
    syncAttachedUI();
    bindCompose();
    bindToolbar();
    bindList();
    // 正文输入框上限统一由配置驱动，避免与 HTML 写死值不一致
    if (els.text) els.text.maxLength = CFG.maxLength;
    updateCounter();

    if (CFG.mode === 'github' || (!CFG.envId && CFG.github && CFG.github.owner && CFG.github.repo)) {
      setMode(GithubStore);
    } else if (CFG.envId) {
      CloudStore.init().then(function () { setMode(CloudStore); }, function (e) {
        console.warn('[小纸条] 云端初始化失败，回退本地模式：', e);
        setMode(LocalStore);
        showError('云端连接失败，已临时切回本地模式：' + (e && e.message ? e.message : e));
      });
    } else {
      setMode(LocalStore);
    }

    window.addEventListener('storage', function (ev) {
      if (ev.key === CFG.localKey && state.store && state.store.mode === 'local') refresh(true);
    });
  }

  /* 挂载即启动本实例（原单实例版在模块底部调用 boot，工厂化后归属各实例） */
  boot();

  } /* ===== mountNotes 结束（函数体沿用原缩进） ===== */

  /* ================= 以下为模块级启动 ================= */

  /* ---------------- 启动：逐个挂载留言板实例 ---------------- */
  function mountAll() {
    (window.EF_NOTES_INSTANCES || []).forEach(function (inst) { mountNotes(inst); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
})();
