/* 意见征集：提交问卷（腾讯问卷 iframe）+ 便利店 / 中餐厅分项目公示
   数据来源：suggestions.json（由 sync_suggestions.py 按审核结果生成）
   公示表只读取已审核通过的数据，未通过内容不会进入本文件。 */
(function () {
  'use strict';

  var CFG = window.EF_SUGGEST_CONFIG || {};
  var PROJECTS = Array.isArray(CFG.projects) ? CFG.projects : [];
  var TYPES = Array.isArray(CFG.types) ? CFG.types : [];
  var DATA_URL = CFG.dataUrl || 'suggestions.json';
  var PAGE_SIZE = Math.max(1, Number(CFG.pageSize) || 10);
  var HIDE_DAYS = Math.max(1, Number(CFG.submitHideDays) || 30);
  var SUBMIT_KEY = CFG.submitKey || 'ef_suggest_submitted_at';
  var SUBMIT_MSG = CFG.submitMessage || 'ef-suggest-submitted';
  var DAY_MS = 86400000;

  var state = {
    data: null,
    loading: true,
    error: '',
    project: PROJECTS.length ? PROJECTS[0].key : '',
    type: 'all',
    q: '',
    page: 1
  };

  var rootEl = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function projectName(key) {
    var p = PROJECTS.filter(function (x) { return x.key === key; })[0];
    return p ? p.name : key;
  }

  function itemsOf(key) {
    var bag = (state.data && state.data.projects) || {};
    return Array.isArray(bag[key]) ? bag[key] : [];
  }

  function total() {
    return PROJECTS.reduce(function (n, p) { return n + itemsOf(p.key).length; }, 0);
  }

  function sorted(items) {
    return items.slice().sort(function (a, b) {
      var da = String(a.date || '');
      var db = String(b.date || '');
      if (da !== db) return da < db ? 1 : -1;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return sorted(itemsOf(state.project)).filter(function (it) {
      if (state.type !== 'all' && String(it.type || '') !== state.type) return false;
      if (!q) return true;
      return (String(it.content || '') + ' ' + String(it.type || ''))
        .toLowerCase().indexOf(q) >= 0;
    });
  }

  /* ---------- 问卷嵌入 ---------- */
  function embedSrc(v) {
    var raw = String(v || '').trim();
    var m = raw.match(/src\s*=\s*["']([^"']+)["']/i);
    return m ? m[1] : raw;
  }

  // 本机提交记录：只用于访客侧隐藏问卷，不是服务端防重复提交
  function submittedLeftDays() {
    var at = 0;
    try { at = Number(localStorage.getItem(SUBMIT_KEY) || 0); } catch (e) { at = 0; }
    if (!at || !isFinite(at)) return 0;
    var left = at + HIDE_DAYS * DAY_MS - Date.now();
    if (left <= 0) {
      try { localStorage.removeItem(SUBMIT_KEY); } catch (e) {}
      return 0;
    }
    return Math.ceil(left / DAY_MS);
  }

  function markSubmitted() {
    try { localStorage.setItem(SUBMIT_KEY, String(Date.now())); } catch (e) {}
  }

  function renderSurvey() {
    var box = rootEl.querySelector('#sg-embed');
    var links = rootEl.querySelector('#sg-links');
    var s = CFG.survey || {};
    var src = embedSrc(s.embedUrl);
    var url = String(s.url || '').trim() || src;
    var left = submittedLeftDays();

    // 状态没变就不重建 iframe，避免切换标签页时把已填写一半的问卷刷新掉
    var nextState = left > 0 ? 'hidden' : (src ? 'form' : 'empty');
    if (box.dataset.sgState === nextState) return;
    box.dataset.sgState = nextState;

    if (left > 0) {
      box.innerHTML = '<div class="ef-panel cut-br sg-done">' +
        '<b>你已提交过内容征集</b>' +
        '<p class="ef-field">问卷已在本机隐藏，' + left + ' 天后重新显示。你可以先查看下方公示结果。</p></div>';
      links.innerHTML = '';
      return;
    }

    if (!src) {
      box.innerHTML = '<div class="ef-panel cut-br sg-placeholder">' +
        '<b>问卷尚未配置</b>' +
        '<p class="ef-field">创建腾讯问卷后，把「网站嵌入」代码粘贴到 ' +
        '<code>suggest-config.js</code> 的 <code>survey.embedUrl</code>。</p></div>';
    } else {
      var h = Math.max(480, Number(s.embedHeight) || 900);
      box.innerHTML = '<div class="sg-frame">' +
        '<iframe src="' + esc(src) + '" title="' + esc(s.title || '内容征集问卷') +
        '" allowfullscreen ' +
        'sandbox="allow-same-origin allow-scripts allow-modals allow-downloads allow-forms allow-popups" ' +
        'style="height:' + h + 'px"></iframe></div>';
    }
    links.innerHTML = url
      ? '<a class="hm-go" href="' + esc(url) + '" target="_blank" rel="noopener">在新窗口打开问卷 →</a>'
      : '';
  }

  /* ---------- 公示表 ---------- */
  function renderTabs() {
    var el = rootEl.querySelector('#sg-tabs');
    el.innerHTML = PROJECTS.map(function (p) {
      var n = itemsOf(p.key).length;
      return '<button type="button" role="tab" data-sg-project="' + esc(p.key) +
        '" aria-selected="' + (state.project === p.key ? 'true' : 'false') + '">' +
        esc(p.name) + '<span class="sg-count">' + n + '</span></button>';
    }).join('');
  }

  function renderTypes() {
    var el = rootEl.querySelector('#sg-types');
    var opts = [{ key: 'all', name: '全部' }].concat(TYPES.map(function (t) {
      return { key: t, name: t };
    }));
    el.innerHTML = opts.map(function (o) {
      return '<button type="button" data-sg-type="' + esc(o.key) +
        '" aria-pressed="' + (state.type === o.key ? 'true' : 'false') + '">' +
        esc(o.name) + '</button>';
    }).join('');
  }

  function rowHtml(it) {
    return '<tr class="sg-row">' +
      '<td data-label="编号"><span class="ef-tag">' + esc(it.id || '—') + '</span></td>' +
      '<td data-label="日期"><span class="ef-field">' + esc(it.date || '—') + '</span></td>' +
      '<td data-label="类型"><span class="sg-type">' + esc(it.type || '未分类') + '</span></td>' +
      '<td data-label="内容"><div class="sg-content">' + esc(it.content || '') + '</div></td>' +
      '</tr>';
  }

  function renderList() {
    var listEl = rootEl.querySelector('#sg-list');
    var metaEl = rootEl.querySelector('#sg-meta');
    var pagerEl = rootEl.querySelector('#sg-pager');

    if (state.loading) {
      listEl.innerHTML = '<p class="ef-empty">正在读取公示数据…</p>';
      metaEl.textContent = '';
      pagerEl.innerHTML = '';
      return;
    }
    if (state.error) {
      listEl.innerHTML = '<p class="ef-empty">' + esc(state.error) + '</p>';
      metaEl.textContent = '';
      pagerEl.innerHTML = '';
      return;
    }

    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pages);
    var start = (state.page - 1) * PAGE_SIZE;
    var pageRows = rows.slice(start, start + PAGE_SIZE);

    metaEl.textContent = projectName(state.project) + ' · 共 ' + rows.length + ' 条已公示';
    if (!rows.length) {
      listEl.innerHTML = '<p class="ef-empty">该分类下暂无可公开展示的征集内容。</p>';
      pagerEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = '<div class="sg-table-wrap"><table class="sg-table">' +
      '<thead><tr><th>编号</th><th>日期</th><th>类型</th><th>内容</th></tr></thead>' +
      '<tbody>' + pageRows.map(rowHtml).join('') + '</tbody></table></div>';

    pagerEl.innerHTML = pages > 1
      ? '<button type="button" data-sg-page="prev"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button>' +
        '<span class="ef-field">第 ' + state.page + ' / ' + pages + ' 页</span>' +
        '<button type="button" data-sg-page="next"' + (state.page >= pages ? ' disabled' : '') + '>下一页</button>'
      : '';
  }

  function updateStamp() {
    var el = document.getElementById('ef-sg-updated');
    if (!el) return;
    var t = state.data && state.data.updated_at;
    el.textContent = '数据更新于 ' + (t || '—');
  }

  function syncChip() {
    var el = document.querySelector('#ef-projects [data-proj="suggest"] .n');
    if (el) el.textContent = total();
  }

  function renderAll() {
    renderTabs();
    renderTypes();
    renderList();
    updateStamp();
    syncChip();
  }

  function load() {
    state.loading = true;
    state.error = '';
    renderList();
    fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        state.data = d || {};
        state.loading = false;
        renderAll();
      })
      .catch(function () {
        state.loading = false;
        state.error = '公示数据读取失败，请稍后重试。';
        renderAll();
      });
  }

  /* ---------- 页面骨架与事件 ---------- */
  function shellHtml() {
    return '<section class="hm-sec sg-submit" id="sg-submit">' +
      '<header class="hm-sec-head">' +
      '<span class="ef-eyebrow slash">Submit</span><h2>提交征集</h2></header>' +
      '<p class="ef-field hm-sec-note">问卷第 1 题请选择「便利店」或「中餐厅」；' +
      '提交内容经协作者审核通过后，会显示在下方对应项目的公示表。</p>' +
      '<div id="sg-embed"></div>' +
      '<p class="sg-links" id="sg-links"></p>' +
      '</section>' +
      '<section class="hm-sec" id="sg-board">' +
      '<header class="hm-sec-head">' +
      '<span class="ef-eyebrow slash">Public Board</span><h2>公示结果</h2></header>' +
      '<div class="sg-tabs" id="sg-tabs" role="tablist" aria-label="公示项目"></div>' +
      '<div class="sg-toolbar">' +
      '<div class="sg-types" id="sg-types" role="group" aria-label="内容类型"></div>' +
      '<label class="ef-search sg-search"><input type="search" id="sg-q" ' +
      'placeholder="搜索已公示内容…" autocomplete="off" /></label>' +
      '</div>' +
      '<p class="ef-field sg-meta" id="sg-meta"></p>' +
      '<div id="sg-list"></div>' +
      '<div class="sg-pager" id="sg-pager"></div>' +
      '</section>';
  }

  function bind() {
    rootEl.addEventListener('click', function (ev) {
      var tab = ev.target.closest('[data-sg-project]');
      if (tab) {
        state.project = tab.dataset.sgProject;
        state.page = 1;
        renderTabs();
        renderList();
        return;
      }
      var type = ev.target.closest('[data-sg-type]');
      if (type) {
        state.type = type.dataset.sgType;
        state.page = 1;
        renderTypes();
        renderList();
        return;
      }
      var page = ev.target.closest('[data-sg-page]');
      if (page && !page.disabled) {
        state.page += page.dataset.sgPage === 'next' ? 1 : -1;
        renderList();
      }
    });
    rootEl.addEventListener('input', function (ev) {
      if (ev.target.id !== 'sg-q') return;
      state.q = ev.target.value || '';
      state.page = 1;
      renderList();
    });
  }

  function render(root) {
    if (!root) return;
    rootEl = root;
    if (root.dataset.sgReady === '1') return;
    root.dataset.sgReady = '1';
    root.innerHTML = shellHtml();
    bind();
    renderSurvey();
    renderAll();
    load();
    // 浏览器前进/后退或从后台恢复时，重新核对本机提交记录，避免缓存页面状态过期
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted && rootEl && rootEl.querySelector('#sg-embed')) renderSurvey();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && rootEl && rootEl.querySelector('#sg-embed')) renderSurvey();
    });
    // SeaTable 表单提交后跳转到 survey-done.html，由回调页通知这里立即隐藏
    window.addEventListener('message', function (ev) {
      if (ev.origin !== window.location.origin) return;
      var data = ev.data || {};
      if (data.type !== SUBMIT_MSG) return;
      markSubmitted();
      renderSurvey();
    });
  }

  function count() {
    return total();
  }

  function sidenav() {
    return [
      { n: '00', t: '提交征集', href: '#sg-submit' },
      { n: '01', t: '公示结果', href: '#sg-board' }
    ];
  }

  window.EF_SUGGEST_VIEW = {
    render: render,
    count: count,
    sidenav: sidenav
  };
})();
