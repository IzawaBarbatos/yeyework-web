/* 开发计划：在研版本 + 远期季度时间轴 + 协作者填写板
   数据来源：
   - 在研版本与远期种子：手写维护（依据 QuMod框架知识库 01 里程碑表 / 现有实施 Plan）
   - 协作者填写：写入仓库 Issues（标题前缀「[开发计划]」，正文带 EF_PLAN 元数据），
     读取后直接并入时间轴，不进入小纸条栏目。 */
(function () {
  'use strict';

  var GH = { owner: 'IzawaBarbatos', repo: 'yeyework-web', label: 'ef-plan', prefix: '[开发计划]' };
  var UPDATED = '2026.10.25';
  var QUARTERS = ['2026 Q4', '2027 Q1', '2027 Q2', '2027 Q3', '2027 Q4', '待排期'];
  var STATUS_OPTIONS = [['planned', '规划中'], ['ready', '已定案 · 未开项'], ['live', '开发中'], ['accept', '待验收']];
  var SCOPES = ['前置库 / 便利店 / 中餐厅', '便利店', '中餐厅', '前置库'];

  /* 在研版本（未结项）：内容取自 01_项目来源与版本快照 里程碑表 */
  var VERSIONS = [
    {
      key: 'yybld',
      short: '便利店',
      project: '椰椰工坊：便利店',
      version: 'v1.3',
      pkg: '1.3.0',
      status: '开发中',
      state: 'live',
      quarter: '2026 Q4',
      theme: '币种物理统一（方案 B）',
      goals: [
        '前置库新增统一币 yycore:yycore_coin 整套资源链，便利店货币切换为统一币',
        '旧币降级为纪念币：保留方块与掉落，移出合成表与创造栏，不再可支付',
        '自动贩卖机新增「兑换新币」入口，主背包与潜影盒 / 收纳袋 1:1 原地替换',
        '首次进入发放清单追加 1 枚便利店纪念币'
      ],
      scope: '服务端 13 服务 / 客户端 10 服务+UI；前置库 8 server + 5 client 模块'
    },
    {
      key: 'yyzct',
      short: '中餐厅',
      project: '椰椰工坊：中餐厅',
      version: 'v1.1',
      pkg: '1.1.0',
      status: '开发中',
      state: 'live',
      quarter: '2026 Q4',
      theme: '币种物理统一（方案 B）',
      goals: [
        '与便利店共用前置库统一币，中餐厅货币切换为统一币',
        '旧币降级为纪念币：保留方块与掉落，移出合成表与创造栏，不再可支付',
        '点餐机新增「兑换新币」入口，5 条空餐具回收商品改发统一币',
        '首次进入发放清单追加 1 枚中餐厅纪念币'
      ],
      scope: '服务端 8 服务 / 客户端 4 服务+UI'
    }
  ];

  /* 远期排期种子：未定档的真实计划文档（不虚构时间） */
  var SEEDS = [
    {
      id: 'eco',
      title: '经济系统',
      scope: '前置库 / 便利店 / 中餐厅',
      status: '已定案 · 未开项',
      state: 'ready',
      quarter: '待排期',
      note: '钱包与现金混合支付、个人流水、账本簿、兑换口、货架赊账、收银机、背包余额显示。',
      src: '经济系统_实施plan.md'
    },
    {
      id: 'quest',
      title: '每日任务模块',
      scope: '前置库 / 便利店 / 中餐厅',
      status: '草案 · 待经济层就绪',
      state: 'draft',
      quarter: '待排期',
      note: '委托板、任务卷轴、每日刷新、进度统计、交付与文字面板；报酬统一走经济层接口。',
      src: '每日任务模块_实施plan.md'
    }
  ];

  var state = { issues: [], overrides: {}, loaded: false, error: '', busy: false, editing: '' };
  var rootEl = null;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function isMember() { return !!(window.EF_ACCESS && window.EF_ACCESS.isMember()); }
  function token() { return window.EF_ACCESS ? (window.EF_ACCESS.token() || '') : ''; }
  function apiBase() { return 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo; }
  function headers(auth) {
    var h = { Accept: 'application/vnd.github+json' };
    if (auth && token()) h.Authorization = 'token ' + token();
    return h;
  }

  /* ---------- 在研版本 ---------- */
  function goalTotal() {
    return VERSIONS.reduce(function (n, v) { return n + v.goals.length; }, 0);
  }

  function versionHtml(v, idx) {
    var anchor = 'pl-v-' + v.key;
    return '<li class="pl-item" id="' + esc(anchor) + '">' +
      '<div class="pl-bar">' +
      '<span class="ef-tag pl-no">' + pad(idx + 1) + '</span>' +
      '<b class="pl-ver">' + esc(v.version) + '</b>' +
      '<span class="ef-field">' + esc(v.short) + '</span>' +
      '<span class="ef-field">目标包版本 ' + esc(v.pkg) + '</span>' +
      '<span class="ef-field">' + esc(v.quarter) + '</span>' +
      '<span class="ef-state pl-st" data-state="' + esc(v.state) + '">' + esc(v.status) + '</span>' +
      '</div>' +
      '<h3 class="pl-theme">' + esc(v.theme) + '</h3>' +
      '<div class="ms-sum-wrap"><span class="ef-eyebrow slash">Plan</span>' +
      '<ol class="ms-sum">' + v.goals.map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('') + '</ol></div>' +
      '<p class="ef-field pl-scope">规模：' + esc(v.scope) + '</p>' +
      '</li>';
  }

  function renderVersions() {
    var listEl = rootEl.querySelector('#ef-pl-list');
    if (!listEl) return;
    listEl.innerHTML = VERSIONS.map(versionHtml).join('');
    var lede = rootEl.querySelector('#ef-pl-lede');
    if (lede) {
      lede.textContent = '在研版本 ' + VERSIONS.length + ' 个 │ 目标 ' + goalTotal() +
        ' 项 │ 数据更新于 ' + UPDATED;
    }
  }

  /* ---------- 开发规划排期时间轴 ---------- */
  function issueEntries() {
    return state.issues;
  }

  // 手写种子可被同 id 的 Issues 覆盖记录替换
  function allEntries() {
    var seeds = SEEDS.map(function (s) { return state.overrides[s.id] || s; });
    return seeds.concat(issueEntries());
  }

  function entryKey(e) {
    return e.num ? 'i' + e.num : 's' + e.id;
  }

  function quarterRank(q) {
    var i = QUARTERS.indexOf(q);
    return i < 0 ? QUARTERS.length - 1 : i;
  }

  function groupByQuarter(list) {
    var map = {};
    list.forEach(function (e) {
      var q = QUARTERS.indexOf(e.quarter) >= 0 ? e.quarter : '待排期';
      (map[q] = map[q] || []).push(e);
    });
    return Object.keys(map).sort(function (a, b) { return quarterRank(a) - quarterRank(b); })
      .map(function (q) { return { quarter: q, items: map[q] }; });
  }

  function statusOptionsHtml(cur) {
    var c = cur === 'draft' ? 'planned' : cur;
    return STATUS_OPTIONS.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === c ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }

  function selectOptionsHtml(list, cur) {
    var arr = list.slice();
    if (cur && arr.indexOf(cur) < 0) arr.push(cur);
    return arr.map(function (v) {
      return '<option' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  function editFormHtml(e) {
    return '<form class="pl-edit" data-pl-edit="' + esc(entryKey(e)) + '"' +
      ' data-num="' + esc(e.num || '') + '" data-seed="' + esc(e.seed || '') + '" autocomplete="off">' +
      '<label class="pl-field"><span>条目名称</span>' +
      '<input name="title" type="text" maxlength="60" required value="' + esc(e.title) + '"></label>' +
      '<label class="pl-field"><span>所属范围</span><select name="scope">' + selectOptionsHtml(SCOPES, e.scope) + '</select></label>' +
      '<label class="pl-field"><span>计划季度</span><select name="quarter">' + selectOptionsHtml(QUARTERS, e.quarter) + '</select></label>' +
      '<label class="pl-field"><span>状态</span><select name="status">' + statusOptionsHtml(e.state) + '</select></label>' +
      '<label class="pl-field pl-field-wide"><span>说明</span>' +
      '<textarea name="note" rows="2" maxlength="500">' + esc(e.note || '') + '</textarea></label>' +
      '<div class="pl-form-act"><button class="ef-btn" type="submit">保存修改</button>' +
      '<button class="ef-btn small" type="button" data-pl-cancel="1">取消</button>' +
      '<span class="ef-field pl-edit-msg"></span></div>' +
      '</form>';
  }

  function entryHtml(e, i) {
    var key = entryKey(e);
    if (state.editing === key) {
      return '<article class="pl-row is-editing">' + editFormHtml(e) + '</article>';
    }
    var acts = '';
    if (isMember()) {
      acts += '<button class="ef-btn small pl-act" type="button" data-pl-edit-btn="' + esc(key) + '">编辑</button>';
      if (e.num) {
        acts += '<button class="ef-btn small pl-act" type="button" data-pl-del="' + esc(e.num) + '"' +
          (e.seed ? ' data-pl-seed="1"' : '') + '>' + (e.seed ? '恢复默认' : '移除') + '</button>';
      }
    }
    return '<article class="pl-row">' +
      '<span class="pl-no">' + pad(i + 1) + '</span>' +
      '<div class="pl-row-main">' +
      '<h3 class="pl-row-t">' + esc(e.title) +
      '<span class="ef-state pl-st" data-state="' + esc(e.state) + '">' + esc(e.status) + '</span></h3>' +
      (e.note ? '<p class="pl-row-note">' + esc(e.note) + '</p>' : '') +
      '<p class="ef-field pl-row-meta">' + esc(e.scope) + ' │ 来源 ' + esc(e.src) + '</p>' +
      '</div>' +
      (acts ? '<div class="pl-row-act">' + acts + '</div>' : '') +
      '</article>';
  }

  function renderTimeline() {
    var tl = rootEl.querySelector('#ef-pl-tl');
    if (!tl) return;
    if (state.error) {
      tl.innerHTML = '<p class="ef-notice pl-empty" data-flag="提示">排期读取失败：' + esc(state.error) + '。</p>';
      return;
    }
    var groups = groupByQuarter(allEntries());
    var n = 0;
    var html = groups.map(function (g) {
      return '<section class="pl-q" id="pl-q-' + esc(g.quarter.replace(/\s+/g, '').toLowerCase()) + '">' +
        '<div class="pl-q-head"><span class="pl-q-name">' + esc(g.quarter) + '</span>' +
        '<span class="ef-field">' + g.items.length + ' 项</span></div>' +
        g.items.map(function (e) { return entryHtml(e, n++); }).join('') +
        '</section>';
    }).join('');
    if (!html) {
      html = '<p class="ef-empty pl-empty">还没有后续排期。协作者可以在本页填写后，条目会直接出现在这条时间轴上。</p>';
    }
    tl.innerHTML = html;
  }

  /* ---------- 填写板 ---------- */
  function composeHtml() {
    return '<section class="pl-sec" id="ef-pl-compose" hidden>' +
      '<header class="pl-sec-head">' +
      '<span class="ef-eyebrow slash">Plan Board</span>' +
      '<h2>填写排期</h2></header>' +
      '<p class="ef-field pl-sec-note">提交后条目直接并入上方时间轴；数据保存在仓库 Issues（标签 ' +
      esc(GH.label) + '），不进入小纸条栏目。</p>' +
      '<form class="pl-form" id="ef-pl-form" autocomplete="off">' +
      '<label class="pl-field"><span>条目名称</span>' +
      '<input name="title" type="text" maxlength="60" required placeholder="例如：货架赊账与收银机"></label>' +
      '<label class="pl-field"><span>所属范围</span><select name="scope">' +
      selectOptionsHtml(SCOPES, SCOPES[0]) + '</select></label>' +
      '<label class="pl-field"><span>计划季度</span><select name="quarter">' +
      selectOptionsHtml(QUARTERS, '待排期') + '</select></label>' +
      '<label class="pl-field"><span>状态</span><select name="status">' +
      statusOptionsHtml('planned') + '</select></label>' +
      '<label class="pl-field pl-field-wide"><span>说明</span>' +
      '<textarea name="note" rows="3" maxlength="500" placeholder="一句话说明这条计划要做什么"></textarea></label>' +
      '<div class="pl-form-act"><button class="ef-btn" type="submit">加入时间轴</button>' +
      '<span class="ef-field" id="ef-pl-form-msg"></span></div>' +
      '</form></section>';
  }

  function setMsg(text) {
    var el = rootEl && rootEl.querySelector('#ef-pl-form-msg');
    if (el) el.textContent = text || '';
  }

  function parseIssue(it) {
    var text = it.body || '';
    var meta = {};
    var m = text.match(/<!--\s*EF_PLAN\s*([\s\S]*?)\s*-->/);
    if (m) {
      try { meta = JSON.parse(m[1]) || {}; } catch (e) {}
      text = text.replace(/<!--\s*EF_PLAN\s*[\s\S]*?\s*-->/, '').trim();
    }
    var title = String(it.title || '');
    if (title.indexOf(GH.prefix) === 0) title = title.slice(GH.prefix.length).trim();
    return {
      id: 'i' + it.number,
      num: it.number,
      own: true,
      title: title || ('计划 #' + it.number),
      scope: meta.scope || '未标注范围',
      status: meta.statusLabel || '规划中',
      state: meta.state || 'draft',
      quarter: meta.quarter || '待排期',
      note: text,
      seed: meta.seed || '',
      src: 'GitHub #' + it.number
    };
  }

  function isPlanIssue(it) {
    return it && !it.pull_request && String(it.title || '').indexOf(GH.prefix) === 0;
  }

  function loadIssues() {
    var url = apiBase() + '/issues?state=open&per_page=100';
    function get(auth) {
      return fetch(url, { headers: headers(auth), cache: 'no-store' }).then(function (r) {
        if (r.status === 401 && auth && token()) return get(false); // 失效 Token 退回匿名
        if (!r.ok) throw new Error('接口返回 ' + r.status);
        return r.json();
      });
    }
    return get(true).then(function (arr) {
      var all = (Array.isArray(arr) ? arr : []).filter(isPlanIssue).map(parseIssue);
      // 带 seed 的记录是对手写种子的覆盖，不单独成行
      state.issues = all.filter(function (e) { return !e.seed; });
      state.overrides = {};
      all.forEach(function (e) { if (e.seed) state.overrides[e.seed] = e; });
      state.loaded = true;
      state.error = '';
    }).catch(function (e) {
      state.error = e && e.message ? e.message : '网络异常';
    }).then(function () {
      renderTimeline();
      syncChip();
    });
  }

  function submitIssue(ev) {
    ev.preventDefault();
    if (!isMember()) return;
    if (state.busy) return;
    var form = ev.target;
    var fd = new FormData(form);
    var title = String(fd.get('title') || '').trim();
    if (!title) { setMsg('请先填写条目名称。'); return; }
    if (!token()) { setMsg('请先用右上角协作者登录。'); return; }
    var statusLabel = String(fd.get('status') || 'draft');
    var sel = form.querySelector('select[name="status"]');
    var labelText = sel ? sel.options[sel.selectedIndex].text : '规划中';
    var meta = {
      scope: String(fd.get('scope') || ''),
      quarter: String(fd.get('quarter') || '待排期'),
      state: statusLabel,
      statusLabel: labelText,
      created_at: Date.now()
    };
    var body = '<!-- EF_PLAN ' + JSON.stringify(meta) + ' -->\n' + String(fd.get('note') || '').trim();
    state.busy = true;
    setMsg('提交中…');
    fetch(apiBase() + '/issues', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(true)),
      body: JSON.stringify({ title: GH.prefix + ' ' + title, body: body, labels: [GH.label] })
    }).then(function (r) {
      if (!r.ok) throw new Error('写入失败 (' + r.status + ')');
      return r.json();
    }).then(function () {
      form.reset();
      setMsg('已加入时间轴。');
      return loadIssues();
    }).catch(function (e) {
      setMsg('提交失败：' + (e && e.message ? e.message : '网络异常'));
    }).then(function () {
      state.busy = false;
    });
  }

  // 编辑已有条目：Issues 条目 PATCH；手写种子首次编辑时创建覆盖记录（meta.seed）
  function submitEdit(ev) {
    ev.preventDefault();
    if (!isMember() || state.busy) return;
    var form = ev.target;
    var fd = new FormData(form);
    var msgEl = form.querySelector('.pl-edit-msg');
    function msg(t) { if (msgEl) msgEl.textContent = t; }
    var title = String(fd.get('title') || '').trim();
    if (!title) { msg('请先填写条目名称。'); return; }
    if (!token()) { msg('请先用右上角协作者登录。'); return; }
    var status = String(fd.get('status') || 'planned');
    var sel = form.querySelector('select[name="status"]');
    var labelText = sel ? sel.options[sel.selectedIndex].text : '规划中';
    var meta = {
      scope: String(fd.get('scope') || ''),
      quarter: String(fd.get('quarter') || '待排期'),
      state: status,
      statusLabel: labelText
    };
    var seed = form.dataset.seed || '';
    if (seed) meta.seed = seed;
    var body = '<!-- EF_PLAN ' + JSON.stringify(meta) + ' -->\n' + String(fd.get('note') || '').trim();
    var num = form.dataset.num || '';
    var payload = { title: GH.prefix + ' ' + title, body: body };
    if (!num) payload.labels = [GH.label];
    state.busy = true;
    msg('保存中…');
    fetch(apiBase() + '/issues' + (num ? '/' + num : ''), {
      method: num ? 'PATCH' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(true)),
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('保存失败 (' + r.status + ')');
      return r.json();
    }).then(function () {
      state.editing = '';
      return loadIssues();
    }).catch(function (e) {
      msg('保存失败：' + (e && e.message ? e.message : '网络异常'));
    }).then(function () {
      state.busy = false;
    });
  }

  function removeIssue(num, isSeed) {
    if (!isMember() || !token()) return;
    var ask = isSeed
      ? '恢复这条计划的手写默认内容？（当前修改会被撤销）'
      : '从时间轴移除这条计划？（对应 GitHub Issue 会被关闭）';
    if (!window.confirm(ask)) return;
    fetch(apiBase() + '/issues/' + num, {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers(true)),
      body: JSON.stringify({ state: 'closed', state_reason: 'not_planned', labels: [] })
    }).then(function (r) {
      if (!r.ok) throw new Error('移除失败 (' + r.status + ')');
      return loadIssues();
    }).catch(function (e) {
      state.error = e && e.message ? e.message : '移除失败';
      renderTimeline();
    });
  }

  /* ---------- 装配 ---------- */
  function syncCompose() {
    var member = isMember();
    var box = rootEl && rootEl.querySelector('#ef-pl-compose');
    if (box) box.hidden = !member;
    // 失去协作者身份时收起正在编辑的表单
    if (!member && state.editing) {
      state.editing = '';
      renderTimeline();
    }
  }

  function render(root) {
    if (!root || root.dataset.plReady === '1') return;
    root.dataset.plReady = '1';
    rootEl = root;
    root.innerHTML =
      '<p class="ef-field pl-lede" id="ef-pl-lede"></p>' +
      '<ol class="pl-list" id="ef-pl-list"></ol>' +
      '<section class="pl-sec" id="pl-timeline">' +
      '<header class="pl-sec-head"><span class="ef-eyebrow slash">Roadmap</span>' +
      '<h2>开发规划排期</h2></header>' +
      '<p class="ef-field pl-sec-note">上方为在研版本，本段时间轴只排后续计划；' +
      '季度按实际排期填写，未定档的条目统一落在「待排期」。协作者可直接编辑条目。</p>' +
      '<div class="pl-tl" id="ef-pl-tl"><p class="ef-field pl-empty">正在读取排期…</p></div>' +
      '</section>' +
      composeHtml();

    rootEl.addEventListener('submit', function (ev) {
      if (!ev.target) return;
      if (ev.target.id === 'ef-pl-form') submitIssue(ev);
      else if (ev.target.classList.contains('pl-edit')) submitEdit(ev);
    });
    rootEl.addEventListener('click', function (ev) {
      var editBtn = ev.target.closest('[data-pl-edit-btn]');
      if (editBtn) {
        state.editing = editBtn.dataset.plEditBtn;
        renderTimeline();
        return;
      }
      if (ev.target.closest('[data-pl-cancel]')) {
        state.editing = '';
        renderTimeline();
        return;
      }
      var del = ev.target.closest('[data-pl-del]');
      if (del) removeIssue(del.dataset.plDel, del.dataset.plSeed === '1');
    });

    renderVersions();
    renderTimeline();
    syncCompose();
    loadIssues();
    if (window.EF_ACCESS) window.EF_ACCESS.onChange(syncCompose);
  }

  function count() {
    return VERSIONS.length + SEEDS.length + state.issues.length;
  }

  // 胶囊计数 = 在研版本 + 时间轴条目；Issues 异步返回后同步一次
  function syncChip() {
    var el = document.querySelector('#ef-projects [data-proj="plan"] .n');
    if (el) el.textContent = count();
  }

  function sidenav() {
    var out = VERSIONS.map(function (v, i) {
      return { n: pad(i + 1), t: v.short + ' ' + v.version, href: '#pl-v-' + v.key };
    });
    out.push({ n: pad(VERSIONS.length + 1), t: '开发规划排期', href: '#pl-timeline' });
    if (isMember()) out.push({ n: pad(VERSIONS.length + 2), t: '填写排期', href: '#ef-pl-compose' });
    return out;
  }

  window.EF_PLAN_VIEW = {
    render: render,
    count: count,
    sidenav: sidenav,
    refreshAccess: syncCompose
  };
})();
