/* 资产对照主逻辑：数据索引、对照树/表渲染、详情抽屉、导航与访问控制。
   由 index.html 内联脚本原样迁出，执行顺序保持在 notes.js 之前。 */
      (function () {
        'use strict';

        /* ---------- 0. 数据（外链：同目录 data.js 由 sync_data.py 生成） ---------- */
        var RAW = window.EF_DATA || null;
        if (!RAW) {
          // 兼容：若页面仍残留旧版内嵌数据块，则回退读取
          var embedded = document.getElementById('ef-data');
          if (embedded) {
            try { RAW = JSON.parse(embedded.textContent); } catch (err) { console.error('[资产索引] 内嵌数据解析失败：', err); }
          }
        }
        if (!RAW) {
          RAW = { meta: {}, entries: {} };
          console.error('[资产索引] 未加载到 data.js，请先运行 sync_data.py 生成数据文件。');
        }
        var meta = RAW.meta || {};
        var ALL_ENTRIES = RAW.entries || {};               // { yybld:[...], yyzct:[...] }（按项目分桶）
        var PD = meta.projects_data || {};                 // 每个项目的元信息（分类 / 资源链 / 定义文案 / 头部文案）

        var KIND_CN = { model: '模型文件', animation: '动画文件', texture: '贴图文件' };
        // 资源标签文案（呈现层）：按「项目 × 资源分组」决定徽标文字，与数据层解耦
        var BADGE = {
          yybld: {
            block: ['普通方块', '贴图'], display: ['display', 'display贴图'],
            hand: ['hand', 'hand贴图'], hold: ['hold', 'hold贴图']
          },
          yyzct: {
            block: ['方块', '方块贴图'], hand: ['hand', 'hand贴图'],
            hold: ['hold', 'hold贴图'], state: ['state', 'state贴图'], item: ['物品', 'items贴图']
          }
        };
        // 前置库分类口径与便利店一致，资源徽标直接复用便利店文案
        BADGE.yycore = BADGE.yybld;

        // 分类内联图标（条目无游戏贴图时的兜底）
        var SVG = ' viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
        var CAT_ICON = {
          food: '<svg' + SVG + '><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M10 12v4M14 12v4"/></svg>',
          block: '<svg' + SVG + '><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
          block_entity: '<svg' + SVG + '><path d="M12 3 21 8v8l-9 5-9-5V8l9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/><circle cx="12" cy="8" r="1.5"/></svg>',
          item: '<svg' + SVG + '><path d="M7 7h10l1 12H6L7 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
          entity: '<svg' + SVG + '><circle cx="12" cy="6" r="3"/><path d="M12 9v7M6 12h12M9 21l3-5 3 5"/></svg>',
          common: '<svg' + SVG + '><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="17" r="1.6"/></svg>'
        };
        // 中餐厅新增分类的兜底图标（复用已有图形，避免重复内联 SVG）
        CAT_ICON.dish = CAT_ICON.food;
        CAT_ICON.staple = CAT_ICON.food;
        CAT_ICON.furniture = CAT_ICON.block;
        CAT_ICON.functional = CAT_ICON.block_entity;
        CAT_ICON.tableware = '<svg' + SVG + '><path d="M4 4v16"/><path d="M7 4v6a3 3 0 0 1-6 0"/><path d="M14 20 20 4"/><path d="M16 12h4"/></svg>';
        // 便利店六分类（即食/包装/饮品/设备/装饰/道具）图标
        CAT_ICON.instant = CAT_ICON.food;
        CAT_ICON.packaged = CAT_ICON.food;
        CAT_ICON.drink = '<svg' + SVG + '><path d="M9 3h6l-1 4h-4L9 3Z"/><path d="M8 7h8l1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L8 7Z"/><path d="M8 13h8"/></svg>';
        CAT_ICON.facility = CAT_ICON.block_entity;
        CAT_ICON.decor = CAT_ICON.block;
        CAT_ICON.prop = CAT_ICON.item;

        /* ---------- 1. 扁平索引（每个项目各建一份） ---------- */
        var KEYS = [['models', 'model'], ['animations', 'animation'], ['textures', 'texture']];
        // 为一份条目列表构建：扁平文件索引 + 模型/动画平铺表（动画按路径去重）
        function buildIndex(list) {
          var flat = [];
          list.forEach(function (e, i) {
            e._no = i + 1;
            e.models = e.models || [];
            e.animations = e.animations || [];
            e.textures = e.textures || [];
            e._nameHay = (e.chinese_name + '\n' + e.id + '\n' + e.identifier).toLowerCase();
            var hay = [e._nameHay];
            KEYS.forEach(function (pair) {
              e[pair[0]].forEach(function (f) {
                f._kind = pair[1];
                f._entry = e;
                f._flat = flat.length;
                flat.push(f);
                hay.push(String(f.file_name || f.path).toLowerCase(), String(f.rel_path).toLowerCase());
              });
            });
            e._hay = hay.join('\n');
          });
          var modelRows = flat.filter(function (f) { return f._kind === 'model'; });
          var seen = Object.create(null);
          var animRows = flat.filter(function (f) {
            if (f._kind !== 'animation' || seen[f.rel_path]) return false;
            seen[f.rel_path] = 1;
            return true;
          });
          // 贴图在共享条目间会重复出现，按路径去重后才是文件总数
          var seenTex = Object.create(null);
          var texRows = flat.filter(function (f) {
            if (f._kind !== 'texture' || seenTex[f.rel_path]) return false;
            seenTex[f.rel_path] = 1;
            return true;
          });
          return { FLAT: flat, MODEL_ROWS: modelRows, ANIM_ROWS: animRows, TEX_ROWS: texRows };
        }
        // 启动时按项目 categories 顺序对条目列表进行稳定排序，确保「全部」视图下严格按分类先后呈现
        Object.keys(ALL_ENTRIES).forEach(function (k) {
          var list = ALL_ENTRIES[k] || [];
          var cats = (PD[k] && PD[k].categories) || [];
          var catOrder = Object.create(null);
          cats.forEach(function (c, i) { catOrder[c.key] = i; });
          list.forEach(function (e, i) { e._origIdx = i; });
          list.sort(function (a, b) {
            var oa = catOrder[a.category] != null ? catOrder[a.category] : 999;
            var ob = catOrder[b.category] != null ? catOrder[b.category] : 999;
            if (oa !== ob) return oa - ob;
            return a._origIdx - b._origIdx;
          });
        });

        // 启动时一次性为所有项目建索引，切换项目零成本
        var INDEX = {};
        Object.keys(ALL_ENTRIES).forEach(function (k) { INDEX[k] = buildIndex(ALL_ENTRIES[k]); });

        /* ---------- 2. 工具函数 ---------- */
        function esc(s) {
          return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
          });
        }
        // 仅高亮第一处命中，避免破坏转义与超长文本
        function hl(text, q) {
          var s = String(text == null ? '' : text);
          if (!q) return esc(s);
          var i = s.toLowerCase().indexOf(q);
          if (i < 0) return esc(s);
          return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
        }
        function tagBadge(f) {
          var table = BADGE[(active && active.key) || 'yybld'] || BADGE.yybld;
          var g = f.group || (f.tag === 'hand' ? 'hand' : 'block');
          var pair = table[g] || table.block;
          var label = f._kind === 'texture' ? (pair ? pair[1] : '贴图') : (pair ? pair[0] : '方块');
          if (g === 'hand') return '<span class="ef-state">' + label + '</span>';
          if (g === 'display') return '<span class="ef-field" style="border-color:var(--ef-ink);">' + label + '</span>';
          return '<span class="ef-field">' + label + '</span>';
        }
        function iconHtml(e, cls) {
          var c = cls ? ' ' + cls : '';
          if (e.icon) return '<span class="ef-ico' + c + '"><img alt="" loading="lazy" decoding="async" src="' + e.icon + '"></span>';
          return '<span class="ef-ico' + c + '">' + (CAT_ICON[e.category] || CAT_ICON.common) + '</span>';
        }

        /* ---------- 3. 对照树渲染 ---------- */
        // 资源链渲染：链定义来自当前项目（active.CHAINS），便利店 4 链 / 中餐厅 5 链
        function renderFoodChains(e, q) {
          var html = [];
          (active.CHAINS || []).forEach(function (ch) {
            var mList = e.models.filter(function (m) { return (m.group || 'block') === ch.key; });
            var aList = e.animations.filter(function (a) { return (a.group || 'block') === ch.key; });
            var tList = e.textures.filter(function (t) { return (t.group || 'block') === ch.key; });
            var total = mList.length + aList.length + tList.length;
            if (!total) return;
            html.push(
              '<div class="ef-chain-sec" data-chain="' + ch.key + '">' +
                '<div class="ef-chain-head">' +
                  '<span class="ef-tag">' + ch.num + '</span>' +
                  '<span class="ef-chain-name">' + esc(ch.name) + '</span>' +
                  '<span class="ef-chain-tag">(' + esc(ch.tag) + ')</span>' +
                  '<span class="ef-field">' + total + ' 个资源</span>' +
                '</div>' +
                '<div class="ef-chain-body">' +
                  branchHtml('模型文件', 'Models', mList, q) +
                  branchHtml('动画文件', 'Animations', aList, q) +
                  texHtml(tList, q) +
                '</div>' +
              '</div>'
            );
          });
          return html.join('');
        }

        function leafHtml(f, q) {
          return '<li><button class="ef-leaf" type="button" data-flat="' + f._flat + '">' +
            '<span class="ef-leaf-name">' + hl(f.file_name, q) + '</span>' +
            '<span class="ef-leaf-tag">' + tagBadge(f) + '</span>' +
            '<span class="ef-leaf-size ef-field">' + esc(f.size_str) + '</span>' +
            '</button></li>';
        }
        function branchHtml(title, en, list, q) {
          if (!list.length) return '';
          return '<div class="ef-branch">' +
            '<p class="ef-branch-head"><span class="ef-eyebrow slash">' + en + ' · ' + title + '</span>' +
            '<span class="ef-field">' + list.length + '</span></p>' +
            '<ul class="ef-leaves">' + list.map(function (f) { return leafHtml(f, q); }).join('') + '</ul>' +
            '</div>';
        }
        function texHtml(list, q) {
          if (!list.length) return '';
          return '<div class="ef-branch">' +
            '<p class="ef-branch-head"><span class="ef-eyebrow slash">Textures · 贴图资源</span>' +
            '<span class="ef-field">' + list.length + '</span></p>' +
            '<div class="ef-tex-grid">' + list.map(function (t) {
              var thumb = t.thumb ? '<span class="ef-ico"><img alt="" loading="lazy" decoding="async" src="' + t.thumb + '"></span>' : '';
              return '<button class="ef-tex" type="button" data-flat="' + t._flat + '">' + thumb +
                '<span>' + hl(t.file_name || t.path, q) + '</span></button>';
            }).join('') + '</div></div>';
        }
        function nodeInnerHtml(e, q) {
          var inner = active.chainCats.indexOf(e.category) >= 0
            ? renderFoodChains(e, q)
            : branchHtml('模型文件', 'Models', e.models, q) +
              branchHtml('动画文件', 'Animations', e.animations, q) +
              texHtml(e.textures, q);
          return inner || '<p class="ef-empty">该中文名名下暂无已实装的资源文件。</p>';
        }

        // 折叠中的条目只留空壳，展开时才构建内部文件树，避免一次性生成上百个面板
        // 访客：只输出条目头部（中文名/分类/资源计数），不生成可展开的 body
        function nodeHtml(e, q, open, order, stagger, entryIdx) {
          var guest = !isMember();
          var body = guest
            ? ''
            : open
              ? '<div class="ef-node-body"><div class="ef-node-inner">' + nodeInnerHtml(e, q) + '</div></div>'
              : '<div class="ef-node-body" data-lazy="1"><div class="ef-node-inner"></div></div>';
          return '<li class="ef-node' + (open && !guest ? ' is-open' : '') + (stagger >= 0 ? ' ef-in-come' : '') + '"' +
            (stagger >= 0 ? ' style="--i:' + stagger + '"' : '') + ' data-idx="' + order + '" data-entry="' + entryIdx + '">' +
            '<button class="ef-node-head" type="button" aria-expanded="' + (open && !guest ? 'true' : 'false') + '"' +
            (guest ? ' aria-disabled="true"' : '') + '>' +
            '<span class="ef-node-name">' + hl(e.chinese_name, q) + '</span>' +
            iconHtml(e) +
            '<span class="ef-node-id">' + hl(e.identifier, q) + '</span>' +
            '<span class="ef-cat" data-cat="' + esc(e.category) + '">' + esc(e.category_name) + '</span>' +
            '<span class="ef-node-fields ef-field">模型 ' + e.model_count + ' │ 贴图 ' + e.texture_count + ' │ 动画 ' + e.anim_count + '</span>' +
            '<span class="ef-caret" aria-hidden="true"></span>' +
            '</button>' + body + '</li>';
        }

        // 首次展开时填充内容；之后直接复用已生成的 DOM
        function fillNodeBody(node) {
          var body = node.querySelector('.ef-node-body');
          if (!body || !body.hasAttribute('data-lazy')) return;
          var e = active.entries[Number(node.dataset.entry)];
          if (!e) return;
          body.removeAttribute('data-lazy');
          body.firstElementChild.innerHTML = nodeInnerHtml(e, state.q);
        }

        /* ---------- 4. 状态 ---------- */
        var state = { proj: 'yybld', view: 'tree', filter: 'all', q: '' };
        // 当前项目运行时上下文：渲染函数统一读它，切换项目时整体替换
        var active = null;
        function makeActive(key) {
          var pm = PD[key] || {};
          var idx = INDEX[key] || { FLAT: [], MODEL_ROWS: [], ANIM_ROWS: [], TEX_ROWS: [] };
          return {
            key: key,
            meta: pm,
            entries: ALL_ENTRIES[key] || [],
            CATS: pm.categories || [],
            CHAINS: pm.chains || [],
            chainCats: pm.chain_categories || [],
            defLabels: pm.def_labels || {},
            head: pm.head || {},
            FLAT: idx.FLAT, MODEL_ROWS: idx.MODEL_ROWS, ANIM_ROWS: idx.ANIM_ROWS, TEX_ROWS: idx.TEX_ROWS
          };
        }
        var treeEl = document.getElementById('ef-tree');
        var treeEmpty = document.getElementById('ef-tree-empty');
        var modelsBody = document.getElementById('ef-models-body');
        var modelsEmpty = document.getElementById('ef-models-empty');
        var animsBody = document.getElementById('ef-anims-body');
        var animsEmpty = document.getElementById('ef-anims-empty');
        var countEl = document.getElementById('ef-count');

        function rowHtml(f, q) {
          var e = f._entry || {};
          return '<tr>' +
            '<td><span class="ef-cell-name">' + iconHtml(e, 'ef-ico-sm') + hl(e.chinese_name || '—', q) + '</span></td>' +
            '<td><button class="ef-cell-btn" type="button" data-flat="' + f._flat + '">' + hl(f.file_name, q) + '</button></td>' +
            '<td>' + tagBadge(f) + '</td>' +
            '<td class="num">' + esc(f.size_str) + '</td>' +
            '<td class="num">' + esc(f.mtime) + '</td>' +
            '</tr>';
        }
        function matchesRow(f, q) {
          if (state.filter !== 'all' && (!f._entry || f._entry.category !== state.filter)) return false;
          if (!q) return true;
          return (String(f.file_name) + '\n' + f.rel_path + '\n' +
            (f._entry ? f._entry.chinese_name : '')).toLowerCase().indexOf(q) >= 0;
        }

        function renderTree(q, animate) {
          var html = [];
          var shown = 0;
          var order = 0;
          var cap = 12;
          active.entries.forEach(function (e, i) {
            if (state.filter !== 'all' && e.category !== state.filter) return;
            var nameHit = !q || e._nameHay.indexOf(q) >= 0;
            var childHit = q && !nameHit && e._hay.indexOf(q) >= 0;
            if (q && !nameHit && !childHit) return;
            shown++;
            html.push(nodeHtml(e, q, childHit, order, animate ? Math.min(order, cap) : -1, i));
            order++;
          });
          treeEl.innerHTML = html.join('');
          treeEmpty.hidden = shown > 0;
          syncExpandBtn();
          return shown;
        }

        function renderTables(q) {
          var mHtml = [];
          var mShown = 0;
          active.MODEL_ROWS.forEach(function (f, i) {
            if (!matchesRow(f, q)) return;
            mShown++;
            mHtml.push(rowHtml(f, q));
          });
          modelsBody.innerHTML = mHtml.join('');
          modelsEmpty.hidden = mShown > 0;

          var aHtml = [];
          var aShown = 0;
          active.ANIM_ROWS.forEach(function (f) {
            if (!matchesRow(f, q)) return;
            aShown++;
            aHtml.push(rowHtml(f, q));
          });
          animsBody.innerHTML = aHtml.join('');
          animsEmpty.hidden = aShown > 0;
          return { models: mShown, anims: aShown };
        }

        function render(animate) {
          var member = isMember();
          var q = state.q;
          var counts = { models: active.MODEL_ROWS.length, anims: active.ANIM_ROWS.length, textures: active.TEX_ROWS.length };
          var shown;
          if (state.view === 'tree') {
            shown = renderTree(q, animate);
            countEl.textContent = '显示 ' + shown + ' / ' + active.entries.length + ' 条目' +
              (q ? '　│　搜索「' + q + '」' : '') + '　│　模型 ' + counts.models + ' │ 贴图 ' + counts.textures + ' │ 动画 ' + counts.anims;
          } else if (member) {
            var r = renderTables(q);
            shown = state.view === 'models' ? r.models : r.anims;
            countEl.textContent = '显示 ' + shown + ' / ' + (state.view === 'models' ? counts.models + ' 模型文件' : counts.anims + ' 动画文件') +
              (q ? '　│　搜索「' + q + '」' : '');
          }
        }

        /* ---------- 5. 视图切换 ---------- */
        function syncViewBtns() {
          document.querySelectorAll('#ef-views [data-view]').forEach(function (b) {
            b.setAttribute('aria-pressed', b.dataset.view === state.view ? 'true' : 'false');
          });
        }
        function setView(view) {
          // 模型表 / 动画表直接暴露文件名，访客只保留对照树
          if (!isMember() && view !== 'tree') return;
          // 视图切换属于资产对照范畴：若当前在文档类 / 首页大分类，先切回默认项目
          if (state.proj === 'spec' || state.proj === 'milestones' || state.proj === 'plan' || state.proj === 'home') {
            if (typeof setProj === 'function') setProj(SPEC_KEYS[0] || 'yybld');
          }
          if (view === state.view) return;
          state.view = view;
          syncViewBtns();
          syncSidenav();
          ['tree', 'models', 'anims'].forEach(function (v) {
            document.getElementById('view-' + v).hidden = v !== view;
          });
          // 视图切换动效：表格类视图从左擦入，对照树用节点错峰入场（仅视窗内节点播放）
          var active = document.getElementById('view-' + view);
          if (active && view !== 'tree') {
            active.classList.remove('ef-in-wipe');
            void active.offsetWidth;
            active.classList.add('ef-in-wipe');
          }
          if (view === 'tree') {
            render(false);
            enterViewport([{ els: document.querySelectorAll('#view-tree .ef-node'), cls: 'ef-in-come', cap: 12 }]);
          } else {
            render(true);
          }
          if (history.replaceState) history.replaceState(null, '', '#' + view);
        }

        /* ---------- 6. 详情抽屉 ---------- */
        var drawer = document.getElementById('ef-drawer');
        var dKind = document.getElementById('ef-drawer-kind');
        var dTitle = document.getElementById('ef-drawer-title');
        var dRows = document.getElementById('ef-drawer-rows');
        var current = null;

        function defLabel(key) { return (active.defLabels && active.defLabels[key]) || key; }

        function openDrawer(f) {
          // 抽屉含相对路径等具体资料，仅协作者可用
          if (!isMember()) return;
          current = f;
          var e = f._entry || {};
          dKind.textContent = (KIND_CN[f._kind] || '文件') + ' / ' + (e.identifier || '');
          dTitle.textContent = f.file_name;

          var tagTxt = f._kind === 'texture' ? '贴图' : (f.tag === 'hand' ? '第一人称' : '普通');
          var rows = [
            ['文件类型', (KIND_CN[f._kind] || '—') + '（' + tagTxt + '）'],
            ['所属中文名', e.chinese_name || '—'],
            ['内容分类', e.category_name || '—'],
            ['资源标识符', f.identifier || e.identifier || f.path || '—'],
            ['相对路径', f.rel_path],
            ['文件大小', f.size_str || '—'],
            ['修改时间', f.mtime || '—']
          ];
          if (f.geometry_ids && f.geometry_ids.length) rows.push(['几何标识 geometry', f.geometry_ids.join('、')]);
          if (f.animation_ids && f.animation_ids.length) rows.push(['动画标识 animation', f.animation_ids.join('、')]);

          var defs = e.definitions || {};
          Object.keys(defs).forEach(function (key) {
            if (!defs[key]) return;
            rows.push([defLabel(key), '已配置']);
          });

          dRows.innerHTML = rows.map(function (r) {
            return '<li><span>' + esc(r[0]) + '</span><span class="ef-field">' + esc(r[1]) + '</span></li>';
          }).join('');

          if (typeof drawer.showModal === 'function') drawer.showModal();
          else drawer.setAttribute('open', '');
        }

        drawer.addEventListener('click', function (ev) {
          if (ev.target === drawer || ev.target.closest('[data-close]')) drawer.close();
        });

        function toast(msg) {
          var el = document.createElement('div');
          el.className = 'ef-toast';
          el.setAttribute('role', 'status');
          el.textContent = msg;
          document.body.appendChild(el);
          setTimeout(function () {
            el.classList.add('is-closing');
            setTimeout(function () { el.remove(); }, 200);
          }, 1900);
        }

        function copy(text, okMsg) {
          var done = function () { toast(okMsg); };
          var fail = function () { toast('复制失败，请手动选中文本复制。'); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fail);
          } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { fail(); }
            ta.remove();
          }
        }

        drawer.addEventListener('click', function (ev) {
          var btn = ev.target.closest('[data-copy]');
          if (!btn || !current) return;
          copy(current.rel_path, '已复制相对路径。');
        });

        /* ---------- 7. 交互绑定 ---------- */
        // 树：展开/折叠 + 打开详情
        treeEl.addEventListener('click', function (ev) {
          var leaf = ev.target.closest('.ef-leaf');
          if (leaf) {
            if (!isMember()) return;
            var item = active.FLAT[Number(leaf.dataset.flat)];
            if (item) openDrawer(item);
            return;
          }
          var head = ev.target.closest('.ef-node-head');
          if (head) {
            // 访客：条目可见但不可展开（不生成任何文件明细）
            if (!isMember()) return;
            var node = head.closest('.ef-node');
            // 展开前先填充惰性内容，让高度过渡有实际尺寸可量
            if (!node.classList.contains('is-open')) fillNodeBody(node);
            var open = node.classList.toggle('is-open');
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
            syncExpandBtn();
          }
        });

        // 平铺表：打开详情
        [modelsBody, animsBody].forEach(function (tb) {
          tb.addEventListener('click', function (ev) {
            var btn = ev.target.closest('[data-flat]');
            if (!btn) return;
            var item = active.FLAT[Number(btn.dataset.flat)];
            if (item) openDrawer(item);
          });
        });

        // 搜索
        var input = document.getElementById('ef-q');
        var timer = 0;
        input.addEventListener('input', function () {
          clearTimeout(timer);
          timer = setTimeout(function () {
            state.q = input.value.trim().toLowerCase();
            render();
          }, 90);
        });

        // 分类筛选（chips 由 JS 渲染，事件委托；与侧边栏双向联动）
        var filtersEl = document.getElementById('ef-filters');
        var sidenavEl = document.getElementById('ef-sidenav');

        function setFilter(filter, scroll) {
          state.filter = filter || 'all';
          if (filtersEl) {
            filtersEl.querySelectorAll('[data-filter]').forEach(function (c) {
              c.setAttribute('aria-pressed', c.dataset.filter === state.filter ? 'true' : 'false');
            });
          }
          if (sidenavEl) {
            sidenavEl.querySelectorAll('[data-nav-filter]').forEach(function (a) {
              if (a.dataset.navFilter === state.filter) a.setAttribute('aria-current', 'true');
              else a.removeAttribute('aria-current');
            });
          }
          if (scroll && state.view !== 'tree') {
            setView('tree');
          }
          render();
          if (scroll) {
            var target = document.querySelector('.bar') || document.getElementById('view-tree');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        filtersEl.addEventListener('click', function (ev) {
          var chip = ev.target.closest('[data-filter]');
          if (!chip) return;
          setFilter(chip.dataset.filter, false);
        });

        if (sidenavEl) {
          sidenavEl.addEventListener('click', function (ev) {
            var docLink = ev.target.closest('[data-nav-doc]');
            if (docLink) {
              ev.preventDefault();
              var sec = document.getElementById(docLink.dataset.navDoc);
              if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
              return;
            }
            var link = ev.target.closest('[data-nav-filter]');
            if (!link) return;
            ev.preventDefault();
            setFilter(link.dataset.navFilter, true);
          });
        }

        // 全部展开 / 收起
        var expandBtn = document.getElementById('ef-expand');
        // 按当前节点状态回写按钮文案：搜索自动展开、切换项目后也能保持一致
        function syncExpandBtn() {
          if (!expandBtn) return;
          var nodes = treeEl.querySelectorAll('.ef-node');
          var allOpen = nodes.length > 0 && Array.prototype.every.call(nodes, function (n) {
            return n.classList.contains('is-open');
          });
          expandBtn.textContent = allOpen ? '全部收起' : '全部展开';
        }
        expandBtn.addEventListener('click', function () {
          var nodes = treeEl.querySelectorAll('.ef-node');
          var anyClosed = Array.prototype.some.call(nodes, function (n) { return !n.classList.contains('is-open'); });
          Array.prototype.forEach.call(nodes, function (n) {
            if (anyClosed) fillNodeBody(n);
            n.classList.toggle('is-open', anyClosed);
            var h = n.querySelector('.ef-node-head');
            if (h) h.setAttribute('aria-expanded', anyClosed ? 'true' : 'false');
          });
          syncExpandBtn();
        });

        // 视图切换（命令栏导航 / 看板数字）
        document.addEventListener('click', function (ev) {
          var link = ev.target.closest('[data-view]');
          if (!link) return;
          ev.preventDefault();
          setView(link.dataset.view);
        });

        /* ---------- 侧边导航高亮 / 回到顶部 ---------- */
        var topBtn = document.getElementById('ef-totop');

        // 侧边栏只显示当前项目的分组（buildSidenav 会重建全部项目链接）
        function filterSidenavGroups(key) {
          if (!sidenavEl) return;
          sidenavEl.querySelectorAll('[data-proj-group]').forEach(function (a) {
            a.hidden = a.dataset.projGroup !== key;
          });
        }

        function syncSidenav() {
          if (!sidenavEl) return;
          if (state.proj === 'spec') return syncDocNav();
          Array.prototype.forEach.call(sidenavEl.querySelectorAll('[data-nav-filter]'), function (a) {
            if (a.dataset.navFilter === state.filter) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        }

        // 首页 / 里程碑 / 计划：滚动位置反查当前板块并高亮横滑条
        function syncSectionNav() {
          if (!sidenavEl) return;
          if (state.proj !== 'home' && state.proj !== 'milestones' && state.proj !== 'plan') return;
          var links = Array.prototype.slice.call(sidenavEl.querySelectorAll('a[href^="#"]'));
          if (!links.length) return;
          var probe = window.innerHeight * 0.3;
          var current = links[0];
          links.forEach(function (a) {
            var el = document.getElementById(a.getAttribute('href').slice(1));
            if (el && el.getBoundingClientRect().top <= probe) current = a;
          });
          var changed = false;
          links.forEach(function (a) {
            var on = a === current;
            if ((a.getAttribute('aria-current') === 'true') !== on) changed = true;
            if (on) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
          // 当前项横向滚出视野时带到中间，保证黄块始终可见
          if (changed && sidenavEl.scrollWidth > sidenavEl.clientWidth) {
            var ar = current.getBoundingClientRect();
            var sr = sidenavEl.getBoundingClientRect();
            if (ar.left < sr.left || ar.right > sr.right) {
              sidenavEl.scrollLeft += (ar.left - sr.left) - 16;
            }
          }
        }

        // 规范文档章节：滚动位置反查当前章节并高亮
        var docSecs = [];
        function syncDocNav() {
          if (!sidenavEl || state.proj !== 'spec') return;
          if (!docSecs.length) {
            docSecs = Array.prototype.slice.call(document.querySelectorAll('#proj-view-spec .ef-doc-sec'));
          }
          var probe = window.innerHeight * 0.28;
          var activeId = docSecs.length ? docSecs[0].id : '';
          docSecs.forEach(function (sec) {
            if (sec.getBoundingClientRect().top <= probe) activeId = sec.id;
          });
          sidenavEl.querySelectorAll('[data-nav-doc]').forEach(function (a) {
            if (a.dataset.navDoc === activeId) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        }

        // 回到顶部：滚过一屏后淡入
        function syncTopBtn() {
          if (!topBtn) return;
          var y = window.scrollY || document.documentElement.scrollTop || 0;
          topBtn.classList.toggle('is-on', y > 400);
        }

        var scrollTick = false;
        function onPageScroll() {
          if (scrollTick) return;
          scrollTick = true;
          requestAnimationFrame(function () {
            scrollTick = false;
            syncSidenav();
            syncSectionNav();
            syncTopBtn();
          });
        }
        window.addEventListener('scroll', onPageScroll, { passive: true });
        window.addEventListener('resize', onPageScroll);
        if (topBtn) {
          topBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
        syncSidenav();
        syncTopBtn();

        // 深浅切换
        var themeBtn = document.getElementById('ef-theme');
        function syncThemeBtn() {
          var dark = document.documentElement.dataset.theme === 'dark';
          themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
          themeBtn.textContent = dark ? '浅色' : '深色';
        }
        themeBtn.addEventListener('click', function () {
          var dark = document.documentElement.dataset.theme === 'dark';
          var next = dark ? 'light' : 'dark';
          document.documentElement.dataset.theme = next;
          try { localStorage.setItem('yybld-asset-theme', next); } catch (e) {}
          syncThemeBtn();
        });
        syncThemeBtn();

        // 字体大小调节（A− / A / A+）：写入 --ef-fs 并持久化
        var FS_STEPS = [0.95, 1.05, 1.125, 1.25, 1.4];
        var FS_DEFAULT = 1.05;
        var fsWrap = document.getElementById('ef-fontsize');
        var fsCur = FS_DEFAULT;
        try {
          var savedFs = parseFloat(localStorage.getItem('yybld-asset-fs'));
          if (isFinite(savedFs) && savedFs > 0) {
            // 如果用户之前存过旧版的 1.125 默认值，将其无缝升级为新默认 1.05
            if (savedFs === 1.125) {
              fsCur = FS_DEFAULT;
              localStorage.setItem('yybld-asset-fs', String(fsCur));
            } else {
              fsCur = savedFs;
            }
          }
        } catch (e) {}
        function fsIndex() {
          var i = FS_STEPS.indexOf(fsCur);
          return i >= 0 ? i : FS_STEPS.indexOf(FS_DEFAULT);
        }
        function applyFs() {
          document.documentElement.style.setProperty('--ef-fs', String(fsCur));
          fsWrap.querySelectorAll('button[data-fs]').forEach(function (b) {
            var on = b.dataset.fs === 'reset' && fsCur === FS_DEFAULT;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
        }
        fsWrap.addEventListener('click', function (ev) {
          var b = ev.target.closest('button[data-fs]');
          if (!b) return;
          var d = b.dataset.fs;
          if (d === 'reset') {
            fsCur = FS_DEFAULT;
          } else {
            var i = Math.max(0, Math.min(FS_STEPS.length - 1, fsIndex() + (d === '+' ? 1 : -1)));
            fsCur = FS_STEPS[i];
          }
          try { localStorage.setItem('yybld-asset-fs', String(fsCur)); } catch (e) {}
          applyFs();
        });
        applyFs();

        /* ---------- 8. 项目导航 / 分类 chips / 统计注入 ---------- */
        function setText(sel, val) {
          document.querySelectorAll(sel).forEach(function (el) { el.textContent = val; });
        }

        // 8.1 大分类导航（工程项目来自同步数据，末尾附加文档类）
        var PROJ_LIST = (meta.projects && meta.projects.length) ? meta.projects : [
          { key: 'yybld', name: '椰椰工坊：便利店', count: 0 },
          { key: 'yyzct', name: '椰椰工坊：中餐厅', count: 0 },
          { key: 'spec', name: '美术资产规范', count: '规范文档', type: 'doc' }
        ];
        // 首页门户：与版本里程碑 / 开发计划同级的大分类，固定排在导航最前
        var HOME_VIEW = window.EF_HOME_VIEW || null;
        var HOME_ENTRY = { key: 'home', name: '首页', count: HOME_VIEW ? HOME_VIEW.count() : 0, type: 'doc' };
        // 版本里程碑：与项目同级的大分类，插在文档类之前
        var MS_VIEW = window.EF_MILESTONES_VIEW || null;
        var MS_ENTRY = { key: 'milestones', name: '版本里程碑', count: MS_VIEW ? MS_VIEW.count() : 0, type: 'doc' };
        // 开发计划：与版本里程碑同级，插在文档类之前
        var PLAN_VIEW = window.EF_PLAN_VIEW || null;
        var PLAN_ENTRY = { key: 'plan', name: '开发计划', count: PLAN_VIEW ? PLAN_VIEW.count() : 0, type: 'doc' };
        PROJ_LIST.unshift(HOME_ENTRY);
        (function () {
          var specIdx = -1;
          PROJ_LIST.forEach(function (p, i) { if (p.key === 'spec') specIdx = i; });
          var docs = [MS_ENTRY, PLAN_ENTRY];
          if (specIdx >= 0) PROJ_LIST.splice.apply(PROJ_LIST, [specIdx, 0].concat(docs));
          else PROJ_LIST.push.apply(PROJ_LIST, docs);
        })();
        // 参与资产对照的项目顺序（排除文档类），首个作为默认项目
        var SPEC_KEYS = PROJ_LIST.filter(function (p) { return p.type !== 'doc'; })
          .map(function (p) { return p.key; });
        var projNavEl = document.getElementById('ef-projects');
        var viewMain = document.getElementById('proj-view-main');
        var viewSpec = document.getElementById('proj-view-spec');
        var viewMs = document.getElementById('proj-view-milestones');
        var viewPlan = document.getElementById('proj-view-plan');
        var viewHome = document.getElementById('proj-view-home');
        var brandEl = document.querySelector('.ef-cmdbar .brand');
        var cmdbarEl = document.querySelector('.ef-cmdbar');
        var appMenuBtn = document.getElementById('ef-app-menu-btn');
        var appTabbar = document.getElementById('ef-app-tabbar');
        // 各项目留言板容器（侧边栏「小纸条」跳转锚点）
        var NOTES_IDS = { yybld: 'ef-notes', yyzct: 'ef-z-notes' };
        // 规范文档章节目录（侧边栏 spec 分组）
        var SIDENAV_DOC = [['doc-sec-00', '全局铁律'], ['doc-sec-01', '资源链清单'],
          ['doc-sec-02', '动画规范'], ['doc-sec-03', '自检表']];

        /* ---------- 8.0 访问控制：仓库协作者 / 访客 ---------- */
        // 访客可浏览条目，但不可展开/查看明细；小纸条、规范栏、模型表与搜索不展示
        function isMember() {
          return !!(window.EF_ACCESS && window.EF_ACCESS.isMember());
        }

        // 项目胶囊：访客不生成「美术资产规范」入口；首页独立呈现为「首页」，不带次要徽章
        function renderProjectNav() {
          projNavEl.innerHTML = PROJ_LIST.filter(function (p) {
            return isMember() || p.key !== 'spec';
          }).map(function (p) {
            if (p.key === 'home') {
              return '<button class="ef-chip" type="button" data-type="doc" data-proj="' + esc(p.key) + '" aria-pressed="' +
                (p.key === state.proj ? 'true' : 'false') + '">' +
                esc(p.name) + '</button>';
            }
            var n = (p.type === 'doc' && p.key !== 'milestones' && p.key !== 'plan') ? '资料' : p.count;
            return '<button class="ef-chip" type="button" data-type="' + esc(p.type || 'asset') + '" data-proj="' + esc(p.key) + '" aria-pressed="' +
              (p.key === state.proj ? 'true' : 'false') + '">' +
              esc(p.name) + ' <span class="n">' + n + '</span></button>';
          }).join('');
        }

        // 访问状态变化后：导航 / 受限面板 / 侧栏 / 条目渲染全部对齐
        function applyRestrictedPanels() {
          var member = isMember();
          // 搜索会自动展开命中条目、视图切换会暴露文件名 → 访客隐藏整条工具条
          var bar = document.querySelector('#proj-view-main .bar');
          if (bar) bar.hidden = !member;
          if (filtersEl) filtersEl.hidden = false;
          if (countEl) countEl.hidden = false;
          ['tree', 'models', 'anims'].forEach(function (v) {
            var el = document.getElementById('view-' + v);
            if (el) el.hidden = v !== state.view || (!member && v !== 'tree');
          });
          SPEC_KEYS.forEach(function (k) {
            var el = document.getElementById(NOTES_IDS[k] || '');
            if (el) el.hidden = !member || k !== state.proj;
          });
          // 停留在仅协作者可见的规范栏时退回资产栏
          if (!member && state.proj === 'spec') setProj(SPEC_KEYS[0] || 'yybld');
        }

        var accessBtn = document.getElementById('ef-access-btn');
        function syncAccessBtn() {
          if (!accessBtn) return;
          var member = isMember();
          accessBtn.textContent = member ? '协作者 · 已解锁' : '协作者登录';
          accessBtn.setAttribute('aria-pressed', member ? 'true' : 'false');
        }

        // 访问状态变化后：导航 / 受限面板 / 侧栏 / 条目渲染全部对齐
        function applyAccessUI() {
          var member = isMember();
          document.documentElement.setAttribute('data-access', member ? 'member' : 'guest');
          renderProjectNav();
          applyRestrictedPanels();
          if (state.proj === 'milestones') buildMsSidenav();
          else if (state.proj === 'plan') buildPlanSidenav();
          else if (state.proj === 'home') buildHomeSidenav();
          else { buildSidenav(); syncSidenav(); filterSidenavGroups(state.proj); }
          if (active) render(false);
          syncAccessBtn();
        }

        function setAccessState(next) {
          if (!window.EF_ACCESS) return;
          var before = window.EF_ACCESS.state;
          window.EF_ACCESS.setState(next);
          if (before === next) applyAccessUI();
        }

        // 启动复核：有 Token 才请求 GitHub；网络异常沿用本地缓存，401/403 直接降级访客
        function verifyAccess() {
          var A = window.EF_ACCESS;
          if (!A) return;
          var token = A.token();
          if (!token) { A.setState('guest'); applyAccessUI(); return; }
          A.verify(token).then(function (ok) {
            if (ok === null) return;
            if (ok) {
              A.markMember(true);
              A.setState('member');
            } else {
              A.clearToken();
              A.setState('guest');
            }
            applyAccessUI();
          });
        }

        if (accessBtn) {
          accessBtn.addEventListener('click', function () {
            var A = window.EF_ACCESS;
            if (!A) return;
            var member = isMember();
            var cur = A.token();
            var msg = member
              ? '当前浏览器已保存协作者 Token（' + cur.slice(0, 4) + '****' + cur.slice(-4) + '）。\n\n' +
                '输入新 Token 可更换；留空并确定则清除 Token：'
              : '请输入 GitHub Token（需勾选 repo 权限）以验证仓库协作者身份。\n\n' +
                '生成方式：GitHub 头像 → Settings → Developer settings → Personal access tokens。\n' +
                '验证通过后本浏览器会自动记住，下次打开直接解锁。\n\n请输入 Token：';
            var next = window.prompt(msg, '');
            if (next === null) return;
            next = next.trim();
            if (!next) {
              if (!member) return;
              A.clearToken();
              setAccessState('guest');
              toast('已清除协作者 Token。');
              return;
            }
            A.verify(next).then(function (ok) {
              if (ok === true) {
                A.saveToken(next);
                A.markMember(true);
                setAccessState('member');
                toast('协作者验证通过，已解锁完整视图。');
              } else if (ok === false) {
                toast('该 Token 不具备仓库写权限。');
              } else {
                toast('验证请求失败，请检查网络后重试。');
              }
            });
          });
        }

        renderProjectNav();

        // 侧边栏导航项：每个项目「内容分类 + 小纸条」一组，规范文档章节目录一组
        function buildSidenav() {
          if (!sidenavEl) return;
          var member = isMember();
          var html = [];
          SPEC_KEYS.forEach(function (key) {
            var cats = (PD[key] || {}).categories || [];
            var pad = function (i) { return ('0' + i).slice(-2); };
            html.push('<a href="#tree" data-proj-group="' + esc(key) + '" data-nav-filter="all">' +
              '<span class="n">00</span><span class="t">全部</span></a>');
            cats.forEach(function (c, i) {
              html.push('<a href="#tree" data-proj-group="' + esc(key) + '" data-nav-filter="' + esc(c.key) + '">' +
                '<span class="n">' + pad(i + 1) + '</span><span class="t">' + esc(c.name) + '</span></a>');
            });
            // 无留言板实例的项目（如前置库）与访客均不生成小纸条导航
            if (NOTES_IDS[key] && member) {
              html.push('<a href="#' + NOTES_IDS[key] + '" data-proj-group="' + esc(key) + '" data-nav-notes="1">' +
                '<span class="n">' + pad(cats.length + 1) + '</span><span class="t">小纸条</span></a>');
            }
          });
          // 规范文档章节目录仅协作者可见
          if (!member) { sidenavEl.innerHTML = html.join(''); return; }
          SIDENAV_DOC.forEach(function (d, i) {
            html.push('<a href="#' + d[0] + '" data-proj-group="spec" data-nav-doc="' + d[0] + '">' +
              '<span class="n">0' + i + '</span><span class="t">' + esc(d[1]) + '</span></a>');
          });
          sidenavEl.innerHTML = html.join('');
        }

        // 版本里程碑侧边栏：列出当前项目的各版本锚点（最新在前）
        function buildMsSidenav() {
          if (!sidenavEl || !MS_VIEW) return;
          var key = MS_VIEW.current();
          var proj = MS_VIEW.projects().filter(function (p) { return p.key === key; })[0];
          if (!proj) { sidenavEl.innerHTML = ''; return; }
          var list = proj.versions; // 数据已按最新在前排列
          sidenavEl.innerHTML = list.map(function (v, i) {
            var anchor = 'ms-' + key + '-' + v.version.replace(/\./g, '');
            return '<a href="#' + esc(anchor) + '">' +
              '<span class="n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
              '<span class="t">' + esc(v.version) + ' ' + esc(v.short) + '</span></a>';
          }).join('');
        }

        // 首次进入里程碑页时才渲染（DOM 一次性构建，后续切项目只重绘列表）
        function renderMs() {
          var root = document.getElementById('ef-ms-root');
          if (MS_VIEW && root) MS_VIEW.render(root);
        }
        document.addEventListener('ef:ms-project-changed', function () {
          if (state.proj === 'milestones') buildMsSidenav();
        });

        // 开发计划侧边栏：在研版本 + 远期排期（填写板仅协作者）
        function buildPlanSidenav() {
          if (!sidenavEl || !PLAN_VIEW) return;
          sidenavEl.innerHTML = PLAN_VIEW.sidenav().map(function (s) {
            return '<a href="' + esc(s.href) + '"><span class="n">' + esc(s.n) + '</span>' +
              '<span class="t">' + esc(s.t) + '</span></a>';
          }).join('');
        }

        // 首次进入开发计划页时才渲染（DOM 一次性构建，后续只刷新时间轴）
        function renderPlan() {
          var root = document.getElementById('ef-pl-root');
          if (PLAN_VIEW && root) PLAN_VIEW.render(root);
        }

        // 首页门户侧边栏：工作总览 → 作品矩阵 → 在研 → 项目组 → 门户入口
        function buildHomeSidenav() {
          if (!sidenavEl || !HOME_VIEW) return;
          sidenavEl.innerHTML = HOME_VIEW.sidenav().map(function (s) {
            return '<a href="' + esc(s.href) + '"><span class="n">' + esc(s.n) + '</span>' +
              '<span class="t">' + esc(s.t) + '</span></a>';
          }).join('');
        }

        // 首次进入首页时才渲染（数据来自 data.js / 里程碑 / 开发计划）
        function renderHome() {
          var root = document.getElementById('ef-hm-root');
          if (HOME_VIEW && root) HOME_VIEW.render(root);
          // 顶部状态位与首页看板同源，进入首页即对齐同步时间，避免残留「未同步」占位
          setText('#ef-stamp', '同步于 ' + (meta.last_sync_time || '未同步'));
        }

        // 8.2 渲染当前项目的分类 chips（全部 + 内容分类，含内联图标与计数）
        function renderFilters() {
          if (!filtersEl || !active) return;
          var allOn = state.filter === 'all';
          filtersEl.innerHTML =
            '<button class="ef-chip" type="button" data-filter="all" aria-pressed="' + (allOn ? 'true' : 'false') + '">' +
            '<span class="ic">' + CAT_ICON.common + '</span>全部 <span class="n">' + active.entries.length + '</span></button>' +
            active.CATS.map(function (c) {
              return '<button class="ef-chip" type="button" data-filter="' + esc(c.key) + '" aria-pressed="' +
                (state.filter === c.key ? 'true' : 'false') + '" title="' + esc(c.desc || '') + '">' +
                '<span class="ic">' + (CAT_ICON[c.key] || CAT_ICON.common) + '</span>' +
                esc(c.name) + ' <span class="n">' + c.count + '</span></button>';
            }).join('');
        }

        // 8.3 头部文案与统计数字（随当前项目切换）
        var PROJ_EN = { yybld: 'Convenience Store', yyzct: 'Chinese Restaurant', yycore: 'Core Library' };
        function renderHead() {
          if (!active) return;
          var h = active.head || {};
          setText('#ef-head-title', h.title || '内容索引');
          setText('#ef-head-sub', h.sub || 'Model / Animation / Texture / Name');
          setText('#ef-head-desc', h.desc || '');
          setText('#ef-head-en', PROJ_EN[active.key] || 'Project Archive');
          setText('#ef-head-ns', '命名空间 ' + active.key);
        }
        function renderStats() {
          if (!active) return;
          setText('[data-fig="entries"]', String(active.meta.total_entries || active.entries.length));
          setText('[data-fig="models"]', String(active.meta.total_models || active.MODEL_ROWS.length));
          setText('[data-fig="textures"]', String(active.meta.total_textures || active.TEX_ROWS.length));
          setText('[data-fig="anims"]', String(active.meta.total_animations || active.ANIM_ROWS.length));
          setText('#ef-stamp, #ef-stamp-2', '同步于 ' + (meta.last_sync_time || '未同步'));
          setText('#ef-head-sync', '同步于 ' + (meta.last_sync_time || '未同步'));
        }

        // 8.4 切换资产项目：重置筛选/搜索，重建 chips、统计、侧边栏与主体
        function switchProject(key) {
          active = makeActive(key);
          state.filter = 'all';
          state.q = '';
          if (input) input.value = '';
          renderHead();
          renderFilters();
          renderStats();
          buildSidenav();
          syncViewBtns();
          render(true);
        }

        /* ---------- 入场动效重放：切栏时复现首次进入的展开效果 ---------- */
        var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        var enterIO = null;

        // 视窗内才播放：先摘掉动画类，视窗内的元素立即补回（零帧延迟），
        // 屏幕外的交给 IntersectionObserver，滚动进入时再播放。
        function enterViewport(groups) {
          var pending = [];
          groups.forEach(function (g) {
            Array.prototype.forEach.call(g.els || [], function (el, i) {
              el.classList.remove(g.cls);
              pending.push({ el: el, cls: g.cls, i: g.cap != null ? Math.min(i, g.cap) : null });
            });
          });
          if (!pending.length) return;
          function apply(p) {
            if (p.i != null) p.el.style.setProperty('--i', p.i);
            p.el.classList.add(p.cls);
          }
          function inView(el) {
            var r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 &&
              r.top < (window.innerHeight || document.documentElement.clientHeight) &&
              r.left < (window.innerWidth || document.documentElement.clientWidth);
          }
          var deferred = [];
          pending.forEach(function (p) {
            if (inView(p.el)) apply(p);
            else deferred.push(p);
          });
          if (!deferred.length || !('IntersectionObserver' in window)) {
            deferred.forEach(apply);
            return;
          }
          if (enterIO) enterIO.disconnect();
          enterIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              var p = entry.target.__enter;
              if (!p) return;
              apply(p);
              delete entry.target.__enter;
              enterIO.unobserve(entry.target);
            });
          }, { threshold: 0.01 });
          deferred.forEach(function (p) {
            p.el.__enter = p;
            enterIO.observe(p.el);
          });
        }

        function playEnter(key) {
          if (reduceMotion && reduceMotion.matches) return;
          var groups = [{ els: [document.querySelector('.ef-tri')], cls: 'ef-in-sweep' }];
          if (key === 'milestones') {
            groups.push({ els: viewMs.querySelectorAll('.ef-doc-head'), cls: 'ef-in-drive' });
            groups.push({ els: viewMs.querySelectorAll('.ms-tabs'), cls: 'ef-in-rise' });
            groups.push({ els: viewMs.querySelectorAll('.ms-item'), cls: 'ef-in-come', cap: 8 });
            // 卡片内部的要点与流程条目逐条上浮
            groups.push({ els: viewMs.querySelectorAll('.ms-sum > li, .ms-flows li'), cls: 'ef-in-rise', cap: 12 });
            groups.push({ els: viewMs.querySelectorAll('.ms-fold'), cls: 'ef-in-rise', cap: 6 });
          } else if (key === 'plan' && viewPlan) {
            groups.push({ els: viewPlan.querySelectorAll('.ef-doc-head'), cls: 'ef-in-drive' });
            groups.push({ els: viewPlan.querySelectorAll('.pl-item'), cls: 'ef-in-come', cap: 6 });
            groups.push({ els: viewPlan.querySelectorAll('.ms-sum > li'), cls: 'ef-in-rise', cap: 12 });
            groups.push({ els: viewPlan.querySelectorAll('.pl-q, .pl-sec'), cls: 'ef-in-rise', cap: 10 });
          } else if (key === 'spec') {
            groups.push({ els: viewSpec.querySelectorAll('.ef-doc-head'), cls: 'ef-in-drive' });
            groups.push({ els: viewSpec.querySelectorAll('.ef-doc-sec'), cls: 'ef-in-come', cap: 6 });
            // 章节标题、规范卡片、表格行与清单条目全部参与展开
            groups.push({ els: viewSpec.querySelectorAll('.ef-doc-sectitle, .ef-law-card, .ef-chain-block'), cls: 'ef-in-rise', cap: 8 });
            groups.push({ els: viewSpec.querySelectorAll('.ef-doc-sec li, .ef-doc-sec tbody tr'), cls: 'ef-in-rise', cap: 16 });
          } else if (key === 'home' && viewHome) {
            groups.push({ els: viewHome.querySelectorAll('.ef-doc-head'), cls: 'ef-in-drive' });
            groups.push({ els: viewHome.querySelectorAll('.ef-figs'), cls: 'ef-in-power', cap: 0 });
            groups.push({ els: viewHome.querySelectorAll('.hm-sec-head, .hm-sec-note'), cls: 'ef-in-rise', cap: 8 });
            groups.push({ els: viewHome.querySelectorAll('.hm-proj, .hm-ver, .hm-crew-card, .hm-portal'), cls: 'ef-in-come', cap: 10 });
          } else {
            // 资产项目栏：标题擦入 → 总览通电 → 条目错峰入场（与首屏一致）
            groups.push({ els: viewMain.querySelectorAll('.ef-head'), cls: 'ef-in-drive' });
            groups.push({ els: [document.getElementById('overview')], cls: 'ef-in-power', cap: 0 });
            groups.push({ els: viewMain.querySelectorAll('.ef-node'), cls: 'ef-in-come', cap: 12 });
          }
          enterViewport(groups);
        }

        // 移动端 App 壳层：顶部标题、资产/文档形态与底部标签栏高亮
        var APP_TITLES = { home: '首页', milestones: '版本里程碑', plan: '开发计划', spec: '美术资产规范' };
        function syncAppShell(key) {
          var isDoc = key === 'home' || key === 'milestones' || key === 'plan' || key === 'spec';
          document.documentElement.dataset.projKind = isDoc ? 'doc' : 'asset';
          var titleEl = document.getElementById('ef-app-title');
          if (titleEl) {
            var t = APP_TITLES[key];
            if (!t) {
              var p = PROJ_LIST.filter(function (x) { return x.key === key; })[0];
              t = p ? String(p.name).split('：').pop() : '项目资料库';
            }
            titleEl.textContent = t;
          }
          if (!appTabbar) return;
          var tabKey = isDoc ? key : 'archive';
          appTabbar.querySelectorAll('[data-tab]').forEach(function (b) {
            if (b.dataset.tab === tabKey) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
          });
        }

        // 手机端设置浮层（复用桌面 .util 节点）
        function closeAppMenu() {
          if (!cmdbarEl || !appMenuBtn) return;
          cmdbarEl.classList.remove('is-menu-open');
          appMenuBtn.setAttribute('aria-expanded', 'false');
        }
        if (appMenuBtn && cmdbarEl) {
          appMenuBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var open = cmdbarEl.classList.toggle('is-menu-open');
            appMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
          });
          document.addEventListener('click', function (ev) {
            if (!ev.target.closest('.ef-cmdbar')) closeAppMenu();
          });
          document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') closeAppMenu();
          });
        }

        // 大分类切换：同步主视图、导航胶囊、侧边栏分组与地址栏
        function setProj(key) {
          // 规范文档仅对仓库协作者开放，访客直达 hash 时回退到资产栏
          if (key === 'spec' && !isMember()) key = SPEC_KEYS[0] || 'yybld';
          var isSpec = key === 'spec';
          var isMs = key === 'milestones';
          var isPlan = key === 'plan';
          var isHome = key === 'home';
          var wasMs = state.proj === 'milestones';
          var wasPlan = state.proj === 'plan';
          var wasHome = state.proj === 'home';
          if (!isSpec && !isMs && !isPlan && !isHome && SPEC_KEYS.indexOf(key) < 0) key = SPEC_KEYS[0] || 'yybld';
          state.proj = key;
          syncAppShell(key);
          closeAppMenu();
          if (viewMain) viewMain.hidden = isSpec || isMs || isPlan || isHome;
          if (viewSpec) viewSpec.hidden = !isSpec;
          if (viewMs) viewMs.hidden = !isMs;
          if (viewPlan) viewPlan.hidden = !isPlan;
          if (viewHome) viewHome.hidden = !isHome;
          projNavEl.querySelectorAll('[data-proj]').forEach(function (b) {
            b.setAttribute('aria-pressed', b.dataset.proj === key ? 'true' : 'false');
          });
          // 各项目留言板：仅协作者可见，且只显示当前项目的留言板
          SPEC_KEYS.forEach(function (k) {
            var el = document.getElementById(NOTES_IDS[k] || '');
            if (el) el.hidden = !isMember() || k !== key;
          });
          if (!isSpec && !isMs && !isPlan && !isHome && (!active || active.key !== key)) switchProject(key);
          // 里程碑 / 开发计划 / 首页会接管侧边栏，离开时重建资产/文档导航，避免残留旧链接
          if ((wasMs || wasPlan || wasHome) && !isMs && !isPlan && !isHome) buildSidenav();
          if (isMs) {
            renderMs();
            buildMsSidenav();
            syncSectionNav();
          } else if (isPlan) {
            renderPlan();
            buildPlanSidenav();
            syncSectionNav();
          } else if (isHome) {
            renderHome();
            buildHomeSidenav();
            syncSectionNav();
          } else if (sidenavEl) {
            // 侧边栏联动：按分组显隐导航项
            filterSidenavGroups(key);
          }
          // 品牌标识跟随当前大分类
          if (brandEl) {
            brandEl.innerHTML = isSpec
              ? '<span class="seal">Y</span><span class="brand-text">YY · MINIAPP SPEC</span>'
              : isMs
                ? '<span class="seal">Y</span><span class="brand-text">YY · VERSION LOG</span>'
                : isPlan
                  ? '<span class="seal">Y</span><span class="brand-text">YY · DEV PLAN</span>'
                  : isHome
                    ? '<span class="seal">Y</span><span class="brand-text">YY · WORKSHOP</span>'
                    : '<span class="seal">Y</span><span class="brand-text">YY · PROJECT ARCHIVE</span>';
          }
          if (isSpec) {
            state.view = 'tree';
            syncViewBtns();
            syncDocNav();
          } else if (!isMs && !isPlan && !isHome) {
            syncSidenav();
          }
          if (history.replaceState) {
            history.replaceState(null, '', '#' + (isSpec ? 'spec' : isMs ? 'milestones' : isPlan ? 'plan' : isHome ? 'home' : state.view));
          }
          // 切栏重放入场动效（首次进入也走这里，保证文档栏同样有展开效果）
          playEnter(key);
        }

        projNavEl.addEventListener('click', function (ev) {
          var btn = ev.target.closest('[data-proj]');
          if (!btn || btn.disabled) return;
          setProj(btn.dataset.proj);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // 底部标签栏：资料库回到最近一次资产项目，其余为一级栏目
        if (appTabbar) {
          appTabbar.addEventListener('click', function (ev) {
            var btn = ev.target.closest('[data-tab]');
            if (!btn) return;
            var tab = btn.dataset.tab;
            setProj(tab === 'archive'
              ? ((active && active.key) || SPEC_KEYS[0] || 'yybld')
              : tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }

        /* ---------- 9. 首次渲染：支持 #home / #models / #anims / #spec / #milestones / #yyzct 直达 ---------- */
        var hash = (location.hash || '').replace('#', '');
        if (hash === 'models' || hash === 'anims') state.view = hash;
        // 访客只保留对照树，模型/动画明细视图不对其开放
        if (!isMember()) state.view = 'tree';
        ['tree', 'models', 'anims'].forEach(function (v) {
          document.getElementById('view-' + v).hidden = v !== state.view;
        });
        // 访问控制：先按本地缓存套用受限界面（避免闪现条目标题），再异步复核 Token
        if (window.EF_ACCESS) {
          window.EF_ACCESS.onChange(applyAccessUI);
          applyAccessUI();
        }
        // 首页内锚点（#hm-*）整页加载时，先落到首页再滚到对应板块
        var homeAnchor = /^hm-/.test(hash);
        setProj(hash === 'spec' ? 'spec'
          : hash === 'milestones' ? 'milestones'
            : hash === 'plan' ? 'plan'
              : (hash === 'home' || homeAnchor) ? 'home'
                : (hash === 'tree' || hash === 'models' || hash === 'anims')
                  ? (SPEC_KEYS[0] || 'yybld')
                  : (SPEC_KEYS.indexOf(hash) >= 0 ? hash : 'home'));
        if (homeAnchor) {
          var anchorEl = document.getElementById(hash);
          if (anchorEl) anchorEl.scrollIntoView({ block: 'start' });
        }
        verifyAccess();

        /* hash 直达：站内改变地址栏 hash 时同步切换项目 / 视图（整页加载已在上方处理） */
        window.addEventListener('hashchange', function () {
          var h = (location.hash || '').replace('#', '');
          if (h === 'spec' || h === 'milestones' || h === 'plan' || h === 'home' || SPEC_KEYS.indexOf(h) >= 0) setProj(h);
          else if (h === 'tree' || h === 'models' || h === 'anims') {
            // 文档类 / 首页栏目下改 hash 到资产视图时，先退回资产栏（否则主视图仍隐藏）
            if (state.proj === 'spec' || state.proj === 'milestones' || state.proj === 'plan' || state.proj === 'home') {
              setProj(SPEC_KEYS[0] || 'yybld');
            }
            setView(h);
          }
        });

        /* ---------- 10. 规范文档：自检清单（可勾选 · 本地持久化） ---------- */
        var CHECK_ITEMS = [
          ['摆盘 / 主食骨骼扁平', '<code>eat1</code>~<code>eatN</code> 或 <code>rice_1</code>~<code>rice_N</code> 内部无嵌套子骨骼（所有 cubes 直挂在对应骨骼下）。'],
          ['餐具与筷子命名固定', '盘子为 <code>plate</code> / <code>bowl</code>，筷子为 <code>kz</code>，手臂为 <code>arm</code>。'],
          ['手模防花屏（64×64）', '第一人称手模（<code>_hand</code>）贴图尺寸严格为 64×64，手臂 UV 严格保持原版不动（严禁 16×16/32×32，防止手臂材质采样越界导致严重花屏）。'],
          ['前缀检查', '所有文件名、内部 Identifier、动画 Key 都有 <code>&lt;ns&gt;_</code>（如 <code>yyzct_</code>）。'],
          ['全小写无空格', '没有大写、中文、空格和 <code>_final</code> 后缀。'],
          ['图标规格对齐', '2D 物品图标已统一为 64×64（超大图已跑压缩工具）。'],
          ['贴图无黑缝', 'UV 选区距离贴图外边缘留有 1~2 像素间隙。'],
          ['贴图无半透明', 'Alpha 纯透明或纯实体，无半透明杂质边缘。'],
          ['即食动画齐备', '即食动画文件内已集齐 <code>first_hold/scale/idle/take/eat</code> 五个动作。'],
          ['端托腿部无关键帧', '第三人称端托动画未给腿部打帧。']
        ];
        var CHECK_KEY = 'yybld-spec-checklist';

        (function initChecklist() {
          var listEl = document.getElementById('ef-checklist');
          if (!listEl) return;
          var countEl = document.getElementById('ef-check-count');
          var totalEl = document.getElementById('ef-check-total');
          var barEl = document.getElementById('ef-check-bar');
          var stampEl = document.getElementById('ef-check-stamp');
          var resetBtn = document.getElementById('ef-check-reset');
          var done = [];

          try {
            var saved = JSON.parse(localStorage.getItem(CHECK_KEY) || '[]');
            if (Object.prototype.toString.call(saved) === '[object Array]') done = saved;
          } catch (e) { done = []; }

          var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>';
          listEl.innerHTML = CHECK_ITEMS.map(function (it, i) {
            return '<div class="ef-check-item" role="checkbox" tabindex="0" data-check="' + i + '" aria-checked="false">' +
              '<span class="ef-checkbox">' + CHECK_SVG + '</span>' +
              '<span class="ef-check-label"><b>' + it[0] + '</b>：' + it[1] + '</span></div>';
          }).join('');

          var items = Array.prototype.slice.call(listEl.querySelectorAll('[data-check]'));
          totalEl.textContent = String(items.length);

          function apply() {
            var n = 0;
            items.forEach(function (el) {
              var on = done.indexOf(Number(el.dataset.check)) >= 0;
              el.classList.toggle('is-done', on);
              el.setAttribute('aria-checked', on ? 'true' : 'false');
              if (on) n++;
            });
            countEl.textContent = String(n);
            if (barEl) barEl.style.width = (items.length ? (n / items.length * 100) : 0) + '%';
            if (stampEl) stampEl.hidden = n !== items.length;
          }

          function toggle(el) {
            var i = Number(el.dataset.check);
            var at = done.indexOf(i);
            if (at >= 0) done.splice(at, 1);
            else done.push(i);
            try { localStorage.setItem(CHECK_KEY, JSON.stringify(done)); } catch (e) {}
            apply();
          }

          listEl.addEventListener('click', function (ev) {
            var el = ev.target.closest('[data-check]');
            if (el) toggle(el);
          });
          listEl.addEventListener('keydown', function (ev) {
            if (ev.key !== ' ' && ev.key !== 'Enter') return;
            var el = ev.target.closest('[data-check]');
            if (!el) return;
            ev.preventDefault();
            toggle(el);
          });
          resetBtn.addEventListener('click', function () {
            done = [];
            try { localStorage.setItem(CHECK_KEY, JSON.stringify(done)); } catch (e) {}
            apply();
          });

          apply();
        })();

        // 规范文档：代码片段点击即复制（沿用全局 toast / copy）
        document.addEventListener('click', function (ev) {
          var code = ev.target.closest('#proj-view-spec .ef-doc-code[data-copy]');
          if (!code) return;
          copy(code.dataset.copy, '已复制：' + code.dataset.copy);
        });

        /* 导出给小纸条模块联动：每个项目一份资产访问器（切换项目后再定位文件） */
        function makeAssets(key) {
          var idx = INDEX[key] || { FLAT: [] };
          return {
            KEY: key,
            FLAT: idx.FLAT,
            ENTRIES: ALL_ENTRIES[key] || [],
            openDrawerByRelPath: function (relPath) {
              if (!relPath) return;
              if (state.proj !== key) setProj(key);
              var target = idx.FLAT.find(function (f) { return f.rel_path === relPath; });
              if (target) openDrawer(target);
            }
          };
        }
        window.EF_ASSETS = {};
        Object.keys(ALL_ENTRIES).forEach(function (k) { window.EF_ASSETS[k] = makeAssets(k); });
        // 跨项目共享资产：前置库的资产对所有项目的「小纸条」贴上/文件选择可见
        window.EF_SHARED_ASSET_KEYS = ['yycore'];
      })();
