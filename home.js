/* 首页门户：运营状态 / 作品 / 正在制作 / 更新公告 / 成员 / 门户入口
   数据口径全部取自运行时真实来源，不写死数字：
   - 工程与资产：window.EF_DATA.meta.projects / projects_data（sync_data.py 扫描生成）
   - 结项公告：window.EF_MILESTONES_VIEW.projects()
   - 在研版本：window.EF_PLAN_VIEW.versions()
   文案常量集中在 WORKSHOP / PROJECT_NOTES 中维护。 */
(function () {
  'use strict';

  /* ---------- 可维护文案 ---------- */
  var WORKSHOP = {
    name: '椰椰工坊',
    accounts: [
      { label: '网易创作者账号', value: 'Maks' },
      { label: 'B站 / 小红书 / 抖音', value: '伊茶Izawa Maks怜悯' }
    ],
    /* role 为分工，bio 为个人简介（留空时页面显示「待补充」） */
    crew: [
      { name: '伊茶Izawa', role: '程序 · 主策', bio: '' },
      { name: 'Maks怜悯', role: '美工 · 策划', bio: '' },
      { name: 'YK', role: '动画', bio: '' }
    ]
  };

  /* 工程介绍：便利店与中餐厅取介绍书原文并做书面化润色 */
  var PROJECT_NOTES = {
    yybld: {
      en: 'Convenience Store',
      desc: '140 款可互动、可自动连接、自带动画的家具、建材、食品饮品与装饰。全部内容通过介绍书内的合成配方合成「自动贩卖机」，右键购买获取；1 个椰椰金币由 2 个金粒合成。'
    },
    yyzct: {
      en: 'Chinese Restaurant',
      desc: '多款可互动、可自动连接、自带动画的家具、建材、菜品与装饰。通过介绍书内的合成配方合成「中餐厅点餐机」，右键购买获取；菜品需蹲下放置，手持筷子等餐具方可食用，空手可拿回。'
    },
    yycore: {
      en: 'Core Library',
      desc: '便利店与中餐厅的内置前置库。'
    }
  };

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function isMember() { return !!(window.EF_ACCESS && window.EF_ACCESS.isMember()); }
  function fmt(n) {
    return typeof n === 'number' ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
  }

  /* ---------- 真实数据 ---------- */
  function snapshot() {
    var meta = (window.EF_DATA && window.EF_DATA.meta) || {};
    return {
      projects: (meta.projects || []).filter(function (p) { return p.type !== 'doc'; }),
      pd: meta.projects_data || {},
      syncTime: meta.last_sync_time || ''
    };
  }

  // 每个玩法各取最新一条结项公告，前置库不参与
  function latestClosed() {
    var ms = window.EF_MILESTONES_VIEW;
    if (!ms || typeof ms.projects !== 'function') return [];
    return ms.projects().filter(function (p) { return p.key !== 'yycore'; })
      .map(function (p) {
        var v = (p.versions || [])[0];
        return v ? { project: p, ver: v } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) { return a.ver.date < b.ver.date ? 1 : -1; });
  }

  /* ---------- 分块渲染 ---------- */
  function head(en, cn) {
    return '<header class="hm-sec-head">' +
      '<span class="ef-eyebrow slash">' + esc(en) + '</span>' +
      '<h2>' + esc(cn) + '</h2>' +
      '</header>';
  }

  /* 运营状态：账号信息与资料库同步时间 */
  function consoleHtml(s) {
    var rows = WORKSHOP.accounts.map(function (a, i) {
      return '<div class="hm-con-row">' +
        '<span class="hm-con-no">' + pad(i + 1) + '</span>' +
        '<span class="hm-con-label">' + esc(a.label) + '</span>' +
        '<span class="hm-con-value">' + esc(a.value) + '</span></div>';
    });
    rows.push('<div class="hm-con-row">' +
      '<span class="hm-con-no">' + pad(rows.length + 1) + '</span>' +
      '<span class="hm-con-label">资料库同步</span>' +
      '<span class="hm-con-value">' + esc(s.syncTime || '未同步') + '</span></div>');
    return '<section class="hm-sec hm-console" id="hm-console">' +
      '<div class="hm-console-bar">' +
      '<h2>运营状态</h2>' +
      '<span class="ef-eyebrow slash">Operation</span>' +
      '</div>' +
      '<div class="hm-console-rows">' + rows.join('') + '</div>' +
      '</section>';
  }

  function projectsHtml(s) {
    var cards = s.projects.map(function (p, i) {
      var note = PROJECT_NOTES[p.key] || { en: 'Project', desc: '' };
      var d = s.pd[p.key] || {};
      var n = typeof d.total_entries === 'number' ? d.total_entries : p.count;
      // 前置库只说明用途，不再列资源量
      var meta = p.key === 'yycore'
        ? esc(p.key) + ' │ 内置前置库'
        : esc(p.key) + ' │ ' + fmt(n) + ' 条目 │ ' + fmt(d.total_models || 0) + ' 模型';
      return '<a class="ef-panel cut-br hm-proj" href="#' + esc(p.key) + '">' +
        '<span class="hm-proj-no" aria-hidden="true">' + pad(i + 1) + '</span>' +
        '<span class="ef-eyebrow slash">' + esc(note.en) + '</span>' +
        '<b class="hm-proj-name">' + esc(p.name) + '</b>' +
        '<span class="ef-field">' + meta + '</span>' +
        '<p class="hm-proj-desc">' + esc(note.desc) + '</p>' +
        '<span class="hm-go">浏览资产 →</span>' +
        '</a>';
    }).join('');
    return '<section class="hm-sec" id="hm-projects">' +
      head('Works', '作品') +
      '<div class="hm-proj-grid">' + cards + '</div>' +
      '</section>';
  }

  function liveHtml(s) {
    if (!s.live.length) {
      return '<section class="hm-sec" id="hm-live">' + head('In Development', '正在制作') +
        '<p class="ef-empty">开发计划暂未登记在研版本。</p></section>';
    }
    var items = s.live.map(function (v, i) {
      return '<article class="hm-ver">' +
        '<div class="hm-ver-top">' +
        '<span class="ef-tag">' + pad(i + 1) + '</span>' +
        '<b class="hm-ver-no">' + esc(v.version) + '</b>' +
        '<span class="ef-field">' + esc(v.short) + '</span>' +
        '<span class="ef-field">' + esc(v.quarter || '待排期') + '</span>' +
        '<span class="ef-state is-alert">' + esc(v.status) + '</span>' +
        '</div>' +
        '<p class="hm-ver-theme">' + esc(v.theme) + '</p>' +
        '<ul class="hm-goals">' + (v.goals || []).map(function (g) {
          return '<li>' + esc(g) + '</li>';
        }).join('') + '</ul>' +
        '</article>';
    }).join('');
    return '<section class="hm-sec" id="hm-live">' +
      head('In Development', '正在制作') +
      '<p class="ef-field hm-sec-note">以下版本正在制作、尚未结项，完整目标与排期见开发计划。</p>' +
      '<div class="hm-ver-grid">' + items + '</div>' +
      '<p class="hm-more"><a class="hm-go" href="#plan">在开发计划中查看完整排期 →</a></p>' +
      '</section>';
  }

  /* 更新公告：两个玩法各取最近一次结项的内容 */
  function newsHtml() {
    var items = latestClosed();
    if (!items.length) {
      return '<section class="hm-sec" id="hm-news">' + head('Latest Release', '更新公告') +
        '<p class="ef-empty">版本里程碑暂未登记结项版本。</p></section>';
    }
    var list = items.map(function (it, i) {
      var v = it.ver;
      var points = (v.summary || []).slice(0, 4).map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('');
      return '<article class="hm-news">' +
        '<div class="hm-news-meta">' +
        '<span class="ef-tag">' + pad(i + 1) + '</span>' +
        '<b class="hm-news-ver">' + esc(v.version) + '</b>' +
        '<span class="hm-news-date">' + esc(v.date) + '</span>' +
        '<span class="ef-field">' + esc(it.project.name) + '</span>' +
        '<span class="ef-state">' + esc(v.tag) + '</span>' +
        '</div>' +
        '<h3 class="hm-news-theme">' + esc(v.theme) + '</h3>' +
        '<ul class="hm-news-list">' + points + '</ul>' +
        '</article>';
    }).join('');
    return '<section class="hm-sec" id="hm-news">' +
      head('Latest Release', '更新公告') +
      '<p class="ef-field hm-sec-note">两个玩法各自最近一次结项的内容，完整清单见版本里程碑。</p>' +
      '<div class="hm-news-grid">' + list + '</div>' +
      '<p class="hm-more"><a class="hm-go" href="#milestones">查看全部版本公告 →</a></p>' +
      '</section>';
  }

  function crewHtml() {
    var cards = WORKSHOP.crew.map(function (m, i) {
      return '<article class="ef-panel hm-crew-card">' +
        '<span class="hm-crew-no" aria-hidden="true">' + pad(i + 1) + '</span>' +
        '<span class="ef-eyebrow slash">Crew</span>' +
        '<b class="hm-crew-name">' + esc(m.name) + '</b>' +
        '<p class="ef-field">' + esc(m.role || '分工待补充') + '</p>' +
        '<p class="hm-crew-bio' + (m.bio ? '' : ' hm-tbd') + '">' + esc(m.bio || '个人简介待补充') + '</p>' +
        '</article>';
    }).join('');
    return '<section class="hm-sec" id="hm-crew">' +
      head('Crew', '成员') +
      '<div class="hm-crew-grid">' + cards + '</div>' +
      '</section>';
  }

  function portalsHtml() {
    var items = [
      { href: '#tree', en: 'Asset Archive', cn: '资产对照', desc: '全部已实装资源按中文名归类，可查文件路径与关联配置。' },
      { href: '#milestones', en: 'Version Log', cn: '版本里程碑', desc: '已结项版本的更新重点、新增内容与问题修复。' },
      { href: '#plan', en: 'Dev Plan', cn: '开发计划', desc: '正在制作的版本与后续排期。' },
      { href: '#spec', en: 'Spec', cn: '美术资产规范', desc: '命名规则、资源链清单与交付自检表。', memberOnly: true }
    ].filter(function (x) { return !x.memberOnly || isMember(); });
    var cards = items.map(function (x, i) {
      return '<a class="ef-panel cut-br hm-portal" href="' + esc(x.href) + '">' +
        '<span class="ef-eyebrow slash">' + pad(i + 1) + '</span>' +
        '<b>' + esc(x.cn) + '</b>' +
        '<span class="ef-field">' + esc(x.en) + '</span>' +
        '<p>' + esc(x.desc) + '</p>' +
        '</a>';
    }).join('');
    return '<section class="hm-sec" id="hm-portals">' +
      head('Portals', '门户入口') +
      '<div class="hm-portal-grid">' + cards + '</div>' +
      '</section>';
  }

  function bodyHtml() {
    var s = snapshot();
    s.live = window.EF_PLAN_VIEW && typeof window.EF_PLAN_VIEW.versions === 'function'
      ? window.EF_PLAN_VIEW.versions() : [];
    return consoleHtml(s) + projectsHtml(s) + liveHtml(s) +
      newsHtml() + crewHtml() + portalsHtml();
  }

  /* ---------- 对外接口 ---------- */
  function render(root) {
    if (!root) return;
    rootEl = root;
    root.innerHTML = bodyHtml();
    // 访客 / 协作者切换时，门户入口（规范栏仅协作者可见）随之重绘
    if (window.EF_ACCESS && !root.dataset.hmBound) {
      root.dataset.hmBound = '1';
      window.EF_ACCESS.onChange(function () {
        if (!rootEl || !rootEl.querySelector('#hm-portals')) return;
        rootEl.querySelector('#hm-portals').outerHTML = portalsHtml();
      });
    }
  }

  function count() {
    return snapshot().projects.length + latestClosed().length + WORKSHOP.crew.length;
  }

  function sidenav() {
    return [
      { n: '00', t: '运营状态', href: '#hm-console' },
      { n: '01', t: '作品', href: '#hm-projects' },
      { n: '02', t: '正在制作', href: '#hm-live' },
      { n: '03', t: '更新公告', href: '#hm-news' },
      { n: '04', t: '成员', href: '#hm-crew' },
      { n: '05', t: '门户入口', href: '#hm-portals' }
    ];
  }

  var rootEl = null;

  window.EF_HOME_VIEW = {
    render: render,
    count: count,
    sidenav: sidenav
  };
})();
