/* ============================================================
 * 小纸条留言板
 *
 * 设计：
 *   - 存储层用「同一接口、多种实现」的适配器模式（依赖倒置）：
 *       GithubStore（基于 GitHub Issues API，终身 0 元，三端共享）
 *       CloudStore（腾讯云 CloudBase，按量计费）
 *       LocalStore（localStorage，单人本地兜底）
 *     上层 UI 只依赖接口，不关心底层是 GitHub、云开发还是本地。
 * ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    mode: 'github',
    github: { owner: 'IzawaBarbatos', repo: 'yeyework-web', issueLabel: 'ef-note' },
    envId: '', region: 'ap-shanghai', collection: 'notes',
    authors: [], targets: [], allowCustomTarget: true,
    maxLength: 500, pollInterval: 30000, localKey: 'ef_notes_local_v1',
    sdkUrl: 'https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js'
  };

  var CFG = Object.assign({}, DEFAULTS, window.EF_NOTES_CONFIG || {});
  CFG.envId = (CFG.envId || '').trim();
  CFG.github = Object.assign({}, DEFAULTS.github, CFG.github || {});

  /* ---------------- 小工具 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
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

  /* ---------------- 多选标签选择器 ---------------- */
  function ChipPicker(host, options, selected) {
    this.host = host;
    this.options = toArray(options);
    this.selected = {};
    var self = this;
    toArray(selected).forEach(function (v) { self.selected[v] = true; });
    this._render();
  }
  ChipPicker.prototype._render = function () {
    var self = this;
    this.host.innerHTML = this.options.map(function (name) {
      return '<button class="ef-chip" type="button" data-chip="' + esc(name) + '" ' +
        'aria-pressed="' + (self.selected[name] ? 'true' : 'false') + '">' + esc(name) + '</button>';
    }).join('');
  };
  ChipPicker.prototype.value = function () {
    return Object.keys(this.selected).filter(function (k) { return this.selected[k]; }, this);
  };
  ChipPicker.prototype.bind = function () {
    var self = this;
    this.host.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-chip]');
      if (!btn) return;
      var name = btn.dataset.chip;
      if (self.selected[name]) delete self.selected[name]; else self.selected[name] = true;
      btn.setAttribute('aria-pressed', self.selected[name] ? 'true' : 'false');
    });
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
    ensureToken: function () {
      var t = this.getToken();
      if (t) return Promise.resolve(t);
      var input = window.prompt(
        '首次发小纸条需要提供个人 GitHub Token（勾选 repo 权限）：\n\n' +
        '生成方式：GitHub 个人头像 -> Settings -> Developer Settings -> Personal access tokens\n' +
        '输入后本浏览器会自动记住，以后发帖无需再输。\n\n' +
        '请输入你的 Token：'
      );
      if (input && input.trim()) {
        this.setToken(input.trim());
        return Promise.resolve(input.trim());
      }
      return Promise.reject(new Error('未提供 GitHub Token，无法写入。如需发帖也可直接前往 GitHub Issues 页面发帖。'));
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

      return Promise.all([
        fetch(issuesUrl, { headers: h }).then(function (r) {
          if (!r.ok) throw new Error('拉取 Issues 失败 (' + r.status + ')');
          return r.json();
        }),
        fetch(commentsUrl, { headers: h }).then(function (r) {
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
          var meta = { authors: [], targets: [] };
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
      return self.ensureToken().then(function (token) {
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
          // 发起主贴 Issue
          var title = '[小纸条] ' + (rec.text.slice(0, 26).replace(/\n/g, ' ') || '无标题');
          var body = '<!--EF_NOTE\n' + JSON.stringify({
            authors: rec.authors || [],
            targets: rec.targets || [],
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
      return self.ensureToken().then(function (token) {
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
      return self.ensureToken().then(function (token) {
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
        return this._col().watch({ onChange: onChange, onError: onError });
      } catch (e) {
        if (onError) onError(e);
        return null;
      }
    }
  };

  /* 按需加载 CloudBase Web SDK */
  var _sdkPromise = null;
  function loadSdk() {
    if (window.cloudbase) return Promise.resolve(window.cloudbase);
    if (_sdkPromise) return _sdkPromise;
    _sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = CFG.sdkUrl;
      s.async = true;
      s.onload = function () {
        window.cloudbase ? resolve(window.cloudbase) : reject(new Error('SDK 加载后未暴露 cloudbase'));
      };
      s.onerror = function () { reject(new Error('无法加载 CloudBase SDK：' + CFG.sdkUrl)); };
      document.head.appendChild(s);
    });
    return _sdkPromise;
  }

  /* ---------------- 页面状态 ---------------- */
  var state = {
    store: null,
    notes: [],
    filter: 'all',
    q: '',
    replyFor: null,
    replyDraft: {},
    pollTimer: 0
  };
  var pickers = {};
  var els = {};

  /* ---------------- 渲染 ---------------- */
  function matchHay(n, needle) {
    if (!needle) return true;
    var hay = (n.text || '') + '\n' + toArray(n.authors).join(' ') + '\n' + toArray(n.targets).join(' ');
    return hay.toLowerCase().indexOf(needle) >= 0;
  }

  function visibleTops() {
    var byId = {};
    state.notes.forEach(function (n) { byId[n._id] = n; });
    var repliesByParent = {};
    state.notes.forEach(function (n) {
      if (n.parent_id) {
        (repliesByParent[n.parent_id] = repliesByParent[n.parent_id] || []).push(n);
      }
    });

    var needle = (state.q || '').trim().toLowerCase();
    var tops = state.notes.filter(function (n) { return !n.parent_id; });

    return tops.filter(function (top) {
      if (state.filter === 'open' && top.status === 'resolved') return false;
      if (state.filter === 'resolved' && top.status !== 'resolved') return false;
      if (!needle) return true;
      if (matchHay(top, needle)) return true;
      var reps = repliesByParent[top._id] || [];
      return reps.some(function (r) { return matchHay(r, needle); });
    });
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
          '<label class="notes-label">回复人</label>' +
          '<div class="notes-chips notes-reply-authors" data-reply-authors-for="' + esc(parent._id) + '"></div>' +
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

    if (!isReply) {
      acts.push('<button class="notes-link" data-act="reply" data-id="' + esc(n._id) + '">回复</button>');
      acts.push(
        '<button class="notes-link" data-act="toggle-status" data-id="' + esc(n._id) + '">' +
          (isResolved ? '重新打开' : '标记已解决') +
        '</button>'
      );
    }
    acts.push('<button class="notes-link is-danger" data-act="delete" data-id="' + esc(n._id) + '">删除</button>');

    var targetBlock = (!isReply && targets.length)
      ? '<span class="notes-meta-sep">│</span><span class="notes-targets-label">对接 →</span> ' + peopleTags(targets)
      : '';

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
      var formHtml = replyFormHtml(top);

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
      if (box) {
        var picker = new ChipPicker(box, CFG.authors, lastAuthors());
        picker.bind();
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
    var list = pickers.targets.value();
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
    var authors = pickers.authors.value();
    var targets = collectTargets();
    var text = (els.text.value || '').trim();

    if (!authors.length) { showError('请至少选择一位填写人。'); return; }
    if (!text) { showError('请输入小纸条内容。'); return; }
    if (text.length > CFG.maxLength) { showError('内容超过 ' + CFG.maxLength + ' 字限制。'); return; }

    var rec = {
      authors: authors,
      targets: targets,
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
      pickers.targets.selected = {};
      pickers.targets._render();
      updateCounter();
      refresh(false);
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

    state.store.add(rec).then(function () {
      if (subBtn) subBtn.disabled = false;
      rememberAuthors(authors);
      state.replyFor = null;
      delete state.replyDraft[parentId];
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
      text: String(rec.text || ''),
      status: rec.status === 'resolved' ? 'resolved' : 'open',
      created_at: Number(rec.created_at) || Date.now(),
      updated_at: Number(rec.updated_at) || Number(rec.created_at) || Date.now()
    };
  }

  function refresh(silent) {
    if (!state.store) return Promise.resolve();
    return state.store.list().then(function (rawList) {
      state.notes = (rawList || []).map(normalize);
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
      var btn = ev.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      var id = btn.dataset.id;

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
        state.store.setStatus(id, next).then(function () { refresh(false); })
          .catch(function (e) { alert('修改状态失败：' + (e && e.message ? e.message : e)); });
      } else if (act === 'delete') {
        if (!window.confirm('确定要删除这条小纸条吗？（如有回复将一并删除）')) return;
        state.store.remove(id).then(function () { refresh(false); })
          .catch(function (e) { alert('删除失败：' + (e && e.message ? e.message : e)); });
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
      pickers.targets.selected = {}; pickers.targets._render();
      pickers.authors.selected = {}; pickers.authors._render();
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
        var cur = GithubStore.getToken();
        var msg = cur
          ? '当前已配置 GitHub Token（' + cur.slice(0, 4) + '****' + cur.slice(-4) + '）。\n\n如需更换请输入新 Token，输入空白可清除：'
          : '当前尚未配置 GitHub Token（游客模式可读不可写）。\n\n请输入你的 Token：';
        var next = window.prompt(msg, cur || '');
        if (next !== null) {
          GithubStore.setToken(next);
          alert(next.trim() ? 'Token 已更新！' : 'Token 已清除。');
        }
      } : null;
    }
    if (els.hint) {
      if (isGithub) {
        els.hint.innerHTML = '小纸条直接存放在 <strong>GitHub Issues</strong>，三人随时随地同步，终身 0 元。任何人打开免登录直接阅读，发帖时需录入一次个人 Token。';
      } else if (isCloud) {
        els.hint.innerHTML = '小纸条由三人共享，<strong>写完后其他人约半分钟内可见</strong>。';
      } else {
        els.hint.innerHTML = '当前是<strong>本地模式</strong>，小纸条只保存在这台电脑的浏览器里。';
      }
    }
    render();
    refresh(false).then(startSync, startSync);
  }

  function boot() {
    els = {
      root: $('#ef-notes'),
      mode: $('#ef-notes-mode'),
      count: $('#ef-notes-count'),
      hint: $('#ef-notes-hint'),
      error: $('#ef-notes-error'),
      form: $('#ef-notes-form'),
      authors: $('#ef-notes-authors'),
      targets: $('#ef-notes-targets'),
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

    pickers.authors = new ChipPicker(els.authors, CFG.authors, lastAuthors());
    pickers.targets = new ChipPicker(els.targets, CFG.targets, []);
    pickers.authors.bind();
    pickers.targets.bind();

    if (els.targetOptions) {
      els.targetOptions.innerHTML = CFG.targets.map(function (n) {
        return '<option value="' + esc(n) + '"></option>';
      }).join('');
    }
    if (els.customTarget) els.customTarget.hidden = !CFG.allowCustomTarget;

    bindCompose();
    bindToolbar();
    bindList();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
