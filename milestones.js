/* 版本里程碑：已结项版本公告数据 + 渲染（手写维护，非自动同步生成）
   内容依据：QuMod框架知识库 01_项目来源与版本快照 / 更新日志归档 / 06 项目文档 / 12 修复记录
   口径：只收录已结项版本；制作中的版本不列入（在研计划见 plan.js）。 */
(function () {
  'use strict';

  var DATA = {
    updated: '2026.11.07',
    projects: [
      /* ================= 便利店 ================= */
      {
        key: 'yybld',
        name: '椰椰工坊：便利店',
        en: 'CONVENIENCE STORE',
        versions: [
          {
            version: 'v1.32',
            date: '2026.11.07',
            tag: '正式结项',
            theme: '万圣节主题 · 贴纸玩法 · 节日礼品盒',
            short: '万圣节与贴纸玩法',
            flows: [
              '万圣节专区：自动贩卖机内的万圣节商品统一排在最前，打开商店即可看到',
              '礼品盒：花 2 个椰椰金币买下万圣节礼品盒，右键拆开随机获得 3~5 种店内商品',
              '贴纸：用贴纸工具在墙面或家具上放出隐形贴纸架，再把贴纸贴上去；贴错可用滚轴取下',
              '南瓜灯 / 幽灵灯：右键切换三种表情状态，空手点击会挤压回应并发出声音'
            ],
            summary: [
              '万圣节主题上线：新增南瓜灯、幽灵灯、小彩灯、小彩旗等节日装饰',
              '新增 8 款万圣节贴纸与贴纸工具，可自由装饰店内墙面与家具',
              '新增 5 款糖果与 4 款巧克力，每种都有专属的吃法音效',
              '新增万圣节礼品盒，拆开可随机获得 3~5 种店内商品',
              '南瓜灯与幽灵灯支持三种状态切换、点击互动动画与环境照明',
              '个人设置新增「进门感应器音效」与「移动端进食按钮」两个开关',
              '版本更新后所有玩家各补发 1 枚便利店纪念币；最后一枚纪念币不会被兑换或销毁',
              '商店在售内容由 140 款增加到 163 款'
            ],
            additions: [
              { name: '节日装饰', count: 4, items: ['南瓜灯', '幽灵灯', '小彩灯', '小彩旗'] },
              { name: '贴纸', count: 8, items: ['蝙蝠贴纸', '幽灵贴纸', '黑猫贴纸', '礼物贴纸', '魔法帽贴纸', '南瓜贴纸', '糖果贴纸', '椰椰贴纸'] },
              { name: '贴纸工具', count: 1, items: ['贴纸工具（滚轴）'] },
              { name: '糖果', count: 5, items: ['糖果-橙子', '糖果-大白兔', '糖果-哈密瓜', '糖果-葡萄', '糖果-桃子'] },
              { name: '巧克力', count: 4, items: ['巧克力-黑巧', '巧克力-牛奶', '巧克力-白巧', '巧克力-草莓'] },
              { name: '节日礼品', count: 1, items: ['万圣节礼品盒'] }
            ],
            additionsNote: '共新增 23 款商品，商店在售内容由 140 款增至 163 款。',
            perf: [
              '商店商品按类别分组排列，节日商品置顶，翻找更快',
              '南瓜灯的发光只影响嘴和眼睛，灯体本身照常受光',
              '使用贴纸装饰不会产生碰撞，不会挡路',
              '糖果与巧克力改用各自的进食音效，不再统一为喝水声',
              '个人设置开关保存在本地，切换存档后依然生效'
            ],
            fixes: [
              '修复南瓜灯与幽灵灯切换状态时闪现原模型',
              '修复南瓜灯与幽灵灯嘴眼不发光（改为单 pass 自发光方案）',
              '修复贴纸工具第一人称手臂贴图错位',
              '修复货架展示贴纸时姿态歪斜',
              '修复背包最后一枚纪念币被误兑换、误丢弃',
              '修复老玩家升级后收不到纪念币'
            ]
          },
          {
            version: 'v1.3',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '统一币上线 · 金币检视',
            short: '统一币与金币检视',
            flows: [
              '兑换新币：自动贩卖机界面点「兑换新币」，背包与潜影盒 / 收纳袋里的旧币可 1:1 原地换成统一币',
              '金币检视：手持金币右键检视，第一人称展示；联机时其他玩家也能看到你手中的金币'
            ],
            summary: [
              '新增统一币，便利店所有交易改用统一币结算',
              '旧币改为纪念币：保留方块与掉落，不再能花',
              '自动贩卖机新增「兑换新币」入口，旧币 1:1 原地兑换，失败不吞币',
              '首次进入限时赠送 1 枚便利店纪念币',
              '金币支持第一人称检视，联机时其他玩家也能看到',
              '吃喝动作全面翻新，动作更顺',
              '便利店与中餐厅共用一套通用玩法，体验更统一',
              '吸顶灯碰撞、易拉宝显示与烧水壶放回等问题修复'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料；新增内容为统一币与旧币纪念币化。',
            perf: [
              '吃喝、购买与摆放等通用玩法集中到同一套组件，两个模组体验一致',
              '重复的外观与音效只保留一份，模组体积更小',
              '旧币不再出现在合成表与创造栏，翻找更清爽',
              '多个模组同时开启时，菜单不再反复报错'
            ],
            fixes: [
              '修复吸顶灯碰撞范围偏移，摆放更贴合',
              '修复易拉宝在光线下显示异常',
              '修复烧水壶放回底座后壶内状态丢失',
              '修复移动端食品按钮偶尔失效',
              '修复同时开启多个模组时离开菜单报错',
              '修复潜行放置金币被误判为空手取回',
              '修复其他玩家看不到你手中的金币'
            ]
          },
          {
            version: 'v1.23',
            date: '2026.10.23',
            tag: '正式结项',
            theme: '万能货架 · 进食动作重置 · 调校棒与清理棒',
            short: '万能货架与调校棒',
            flows: [
              '万能货架：潜行手持任意物品右键货架即可上架展示，空手右键取回',
              '货架调校棒：手持右键货架，现场微调物品的角度、大小与位置',
              '清理棒：房主可在设置里开关清理棒，一键清走残留展示物'
            ],
            summary: [
              '万能货架升级：16 大类物品各有专属摆法，原版内容和模组内容都能上架',
              '旧食物的外观、进食动作与音效整批重做，吃起来更顺',
              '新增货架调校棒：摆放不对可现场微调，不用反复拆装',
              '新增清理棒功能开关：房主可在设置里按需开关',
              '每种饮料与食物都有贴合自身口味的专属增益',
              '烧水壶可直接从炼药锅取水，取之不尽',
              '新增 7 款饮料与 3 款易拉宝装饰',
              '商店界面中文名不再忽大忽小、不再超框',
              '批量上架上百件商品不再卡顿',
              '弩摆上货架不再下陷，位置精准'
            ],
            additions: [
              { name: '饮料', count: 7, items: ['律动-柠檬味', '律动-桃子味', '律动-橘子味', '魔角-白色', '魔角-黑色', '魔角-红色', '魔角-蓝色'] },
              { name: '装饰方块', count: 3, items: ['易拉宝-招聘', '易拉宝-满减', '易拉宝-特惠'] }
            ],
            perf: [
              '货架外观整批翻新，摆件位置按新外观重新对齐',
              '调校棒界面字号加大、布局居中，操作更好按',
              '批量上架改为分批送达，上百件也不卡',
              '批量上架设有上限，长时间挂机不会越积越多',
              '玩家离线后自动清空其待送商品',
              '摆放失败会自动放弃，不会反复尝试拖慢画面',
              '区域清理遇到异常位置会跳过，不会中途中断',
              '带耐久的工具不会被摆成商品',
              '从炼药锅取水不改动锅本身，减少多余变化',
              '清理无用旧内容，运行更轻快'
            ],
            fixes: [
              '修复部分饮料仍带伤害吸收效果',
              '修复商店中文名忽大忽小与超框',
              '修复商品卡片仍显示剩余数量',
              '修复弩摆上货架后下陷约三格',
              '修复辣条等商品外观显示紫黑',
              '修复甜筒与老冰棍展示用错外观',
              '修复货架大件商品上架顺序随机',
              '修复魔角拿取动作被提前截断',
              '修复 25 款旧食物手持时外观错位拉伸',
              '修复 5 项旧食物手持外观错乱',
              '修复 12 段新音效没有声音',
              '修复律动与魔角长按没有进食动作',
              '修复魔角手持外观撕裂',
              '修复红茶饮料三种状态外观丢失',
              '修复易拉宝没有进入售卖列表',
              '修复辣条进食动作与动作时长不一致',
              '修复方便面动作重复播放'
            ]
          },
          {
            version: 'v1.22',
            date: '2026.09.29',
            tag: '正式结项',
            theme: '多模组兼容 · 光影优化 · 空手收回',
            short: '多模组兼容与光影',
            flows: [
              '空手右键摆好的食品饮品方块，可原样收回背包，方块不破坏'
            ],
            summary: [
              '多模组兼容：同时装多个椰椰工坊模组，便利店不再整体失效',
              '光影优化：光影环境下方块不再缺面、闪烁与透光',
              '空手右键即可把摆出的食品饮品收回，方块不被破坏',
              '商店界面与外观全面隔离，不再与其他模组串图',
              '51 款食品饮品方块均支持空手收回'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料，新增的是「空手收回」交互能力。',
            perf: [
              '多个模组同时开启时互不干扰',
              '三个模组的动作互不影响',
              '41 个方块的外观在光影下更稳定',
              '购物车外观回归原版标准',
              '冷柜雾气颜色更干净，不再发脏'
            ],
            fixes: [
              '修复同时开启多个模组时便利店整体失效',
              '修复手持动作互相干扰、外观消失',
              '修复光影下 41 个方块缺面闪烁',
              '修复购物车外观与画面不符',
              '修复冷柜雾气颜色发脏',
              '修复货架破坏后悬空商品清不掉',
              '修复商店界面与其他模组重名冲突'
            ]
          },
          {
            version: 'v1.21',
            date: '2026.09.26',
            tag: '正式结项',
            theme: '联机手持显示 · 营养效果 · 防刷加固',
            short: '联机与营养效果',
            summary: [
              '联机时能看到其他玩家手中的食物与姿势',
              '吃东西真正能回饱食度与饱和度',
              '瞄准空气长按吃东西不再中途取消',
              '村民等生物不再穿过便利店方块卡住',
              '清理棒可清掉货架破坏后残留的商品',
              '自动贩卖机不怕爆炸，破坏任意一格整机拆除',
              '中秋灯笼改用新做法，发光与碰撞更稳定'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料，集中加固联机、营养与安全。',
            perf: [
              '冷柜雾气改为逐步生成，不再一卡一卡',
              '冷柜放置即出雾、破坏即停止，不必干等四秒',
              '远处玩家的手持外观按需显示，切视野不卡',
              '低配设备图标统一压缩，画面不再整体变糊',
              '图标边缘的白色噪点清理干净',
              '货架上的商品数据更安全，重进世界仍在',
              '贩卖机连锁拆除不会重复结算',
              '商店界面底板补齐，不再缺失或溢出'
            ],
            fixes: [
              '修复买东西后背包潜影盒内容被清空',
              '修复货架可被重复刷物与盗物',
              '修复未加载区域留下永久残留的商品',
              '修复快捷栏异常导致越界',
              '修复未加载区域存档数据被误删',
              '修复扣款到零后留下数量为 1 的空位',
              '修复七处失效的点击与操作响应',
              '修复爆炸后残留的状态清不掉',
              '修复吃食物只加饥饿、不加饱食度',
              '修复长按食用被取消或只播开头',
              '修复东北老冰棍音效无声',
              '修复泡面方块破坏后掉双份',
              '修复第三人称左手残影悬空',
              '修复联机看不到别人手里的食物',
              '修复低配设备画面变糊与图标白边',
              '修复取用手持物品时崩溃',
              '修复冷柜雾气重进存档消失、放置不出雾',
              '修复贩卖机被炸出白色部件',
              '修复生物穿墙式穿过便利店方块',
              '修复中秋灯笼视角裁切与前后遮挡错乱'
            ]
          },
          {
            version: 'v1.2',
            date: '2026.09.20',
            tag: '正式结项',
            theme: '中秋专题 · 商品陈列治理',
            short: '中秋专题',
            summary: [
              '中秋专题上线：6 款月饼与 2 款发光中秋灯笼',
              '新增 12 款中秋商品：5 款牛奶、3 款薯片、4 款饮料',
              '方便面新增 4 个口味',
              '新增 5 款货架家具，11 款货架补上使用说明',
              '新商品可以正常摆上货架',
              '购买时不再把背包容器里的东西清空',
              '吃东西的增益不再冒药水粒子',
              '冷柜雾气只在附近显示，远处不再白刷'
            ],
            additions: [
              { name: '月饼', count: 6, items: ['月饼-白莲蓉', '月饼-蛋黄莲蓉', '月饼-红豆沙松子', '月饼-抹茶', '月饼-巧克力', '月饼-五仁火腿'] },
              { name: '牛奶', count: 5, items: ['牛奶盒装-白色', '牛奶三角盒装-蓝色', '牛奶饮料盒装-白绿色', '牛奶饮料盒装-粉色', '牛奶饮料盒装-绿色'] },
              { name: '桶装薯片', count: 3, items: ['薯片桶装-烧烤味', '薯片桶装-番茄味', '薯片桶装-海苔味'] },
              { name: '方便面新口味', count: 4, items: ['方便面-海鲜', '方便面-酸菜牛肉', '方便面-酸辣牛肉', '方便面-香辣牛肉'] },
              { name: '吼叫饮料', count: 4, items: ['吼叫饮料-橙色', '吼叫饮料-蓝色', '吼叫饮料-绿色', '吼叫饮料-紫色'] },
              { name: '货架家具', count: 5, items: ['柜子-白色', '玻璃柜-白色', '柜台-白色', '柜子-木头', '货架-木头'] },
              { name: '中秋灯笼', count: 2, items: ['中秋节灯笼-长', '中秋节灯笼-圆'] }
            ],
            perf: [
              '空调与烧水壶声音改为只在附近听到',
              '食品增益不再生成药水粒子',
              '扣款只改动金币，不影响背包其他物品',
              '商品内容去重合并，模组更精简',
              '清理多余的外观内容',
              '整理内部结构，清理棒不再牵连货架',
              '合并空调相关功能，结构更清爽'
            ],
            fixes: [
              '修复购买后潜影盒内物品被清空',
              '修复中秋灯笼多视角缺面闪烁',
              '修复新商品上架后立刻被退回',
              '修复月饼无法摆上货架',
              '修复 12 款中秋商品外观错配',
              '修复方便面方块破坏后掉双份',
              '修复东北老冰棍音效无声',
              '修复桶装薯片上架位置偏移',
              '修复牛奶音效配错',
              '修复空调要连点多次才能开关',
              '修复月饼货架位置与分组错误'
            ]
          },
          {
            version: 'v1.1',
            date: '2026.09.10',
            tag: '正式结项',
            theme: '整体翻新 · 历史问题集中修复',
            short: '整体翻新',
            flows: [
              '方便面：拆开取面饼，用烧水壶倒热水，等泡开后再逐口吃',
              '烧水壶：对水源装水，烧开后倒进面里'
            ],
            summary: [
              '新增方便面泡面玩法：拆袋、倒热水、等泡开、再逐口吃',
              '新增烧水壶：装水、烧开、倒水一步到位',
              '模组整体重写，重进世界不再丢状态',
              '与其他模组同时开启时，商店界面不再串界面',
              '所有自定义方块破坏手感统一为 0.8 秒',
              '音效从没声音恢复为正常播放',
              '破坏方块后能正常获得掉落',
              '自动贩卖机支持分页，买到最后几个币也不出错',
              '移动端新增一键触控的食品操作'
            ],
            additions: [
              { name: '方便面', count: 1, items: ['方便面-红烧牛肉（未开封 → 泡开 → 泡好共 6 个状态）'] },
              { name: '功能方块', count: 1, unit: '件', items: ['烧水壶（可装水、烧水、倒水）'] }
            ],
            perf: [
              '整体结构重写，启动顺序更稳定',
              '界面名称独立，避免与其他模组冲突',
              '204 个以上方块破坏时间统一为 0.8 秒',
              '音效统一为游戏可正常播放的格式',
              '掉落补齐，生存模式也能获得',
              '新增移动端一键触控操作界面'
            ],
            fixes: [
              '修复与其他模组界面命名冲突',
              '修复音效仍在却完全没声音',
              '修复方块破坏不掉落物品',
              '修复贩卖机分页与扣款边界异常',
              '修复旧结构下状态互相污染'
            ]
          },
          {
            version: 'v1.0',
            date: '早期发布',
            tag: '初始发布',
            theme: '初始发布版',
            short: '初始发布版',
            summary: [
              '第一版便利店内容：基础家具、建材、商品与装饰',
              '商品可摆上货架，也可在自动贩卖机购买',
              '使用椰椰金币结算，附介绍书与专属成就',
              '自带第一人称吃喝表现与基础音效',
              '已知遗留：界面冲突、音效无声、破坏无掉落'
            ],
            additions: [
              { name: '内容规模', count: 4, unit: '项', items: ['方块 133 款', '手持物品 28 件', '可展示对象 95 个（含 27 个货架展示位）', '售卖商品 90 款以上'] }
            ],
            additionsNote: '该版本未留存逐项食品清单，此处只保留整体内容规模。',
            perf: [],
            fixes: []
          }
        ]
      },
      /* ================= 中餐厅 ================= */
      {
        key: 'yyzct',
        name: '椰椰工坊：中餐厅',
        en: 'CHINESE RESTAURANT',
        versions: [
          {
            version: 'v1.1',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '统一币上线 · 4 道新菜 · 17 件建材与互动家具',
            short: '新菜与互动家具',
            flows: [
              '互动家具：壁灯、木玻璃门、大型木玻璃窗可直接点家具开关，移动端同样有效',
              '兑换新币：点餐机界面点「兑换新币」，旧币 1:1 原地换成统一币',
              '招牌放置：抬头放上、低头放下，连续叠放自动合并为整块'
            ],
            summary: [
              '与便利店共用同一种统一币，点餐机改用统一币结算',
              '旧币改为纪念币：保留方块与掉落，不再能花',
              '点餐机新增「兑换新币」入口，空餐具回收改发统一币',
              '首次进入限时赠送 1 枚中餐厅纪念币',
              '新增 4 道菜：锅包肉、麻婆豆腐、皮蛋豆腐、鲜肉包子',
              '新增 17 件建材：窗台、原木、招牌与壁灯、木玻璃门窗等',
              '壁灯 / 门 / 窗改为可开关的互动家具，点家具即可开关',
              '木窗深浅两色在光影下不再缺面'
            ],
            additions: [
              { name: '摆盘菜品', count: 4, unit: '道', items: ['锅包肉', '麻婆豆腐', '皮蛋豆腐', '鲜肉包子'] },
              { name: '特色建材', count: 10, items: ['窗台', '原木', '招牌等 10 款'] },
              { name: '互动建材', count: 7, items: ['壁灯', '木玻璃门', '大型木玻璃窗', '招牌字等 7 款'] }
            ],
            perf: [
              '吃喝动作与便利店风格统一，三个模组同时开启也不冲突',
              '移动端点哪开哪，点击更准',
              '开关距离与玩家自身够得到的范围一致，不再固定 12 格',
              '重复的手持外观与检视音效只保留一份，模组体积更小'
            ],
            fixes: [
              '修复移动端互动家具点按不准',
              '修复开关距离过大导致远处也能开门',
              '修复互动家具开合动作不播或播不完整',
              '修复菜品潜行放置后被立刻空手取回',
              '修复半砖外观错位',
              '修复木窗深浅两色在光影下缺面',
              '修复 4 道新菜口数计算错误',
              '修复鲜肉包子进食音效无声'
            ]
          },
          {
            version: 'v1.0',
            date: '2026.09.29',
            tag: '正式结项',
            theme: '正式发布版 · 摆盘菜与餐具闭环',
            short: '正式发布版',
            flows: [
              '筷子：手持筷子右键摆盘菜，一口一口夹着吃，直到只剩空盘',
              '空盘回收：吃完的空盘用海绵右键一擦，变成可回收的空餐具',
              '米饭：手持米饭长按右键，一口一口吃到空碗',
              '椅子：原木椅子右键坐下，再右键起身'
            ],
            summary: [
              '上架 10 道中式摆盘大菜，可放置、可夹着吃',
              '手持筷子右键菜品即可进食，菜量随每口递减',
              '每道菜配专属增益，如红烧肉加生命上限',
              '新增主食米饭，手持长按即可逐口吃完',
              '新增 5 款可手持也可上桌的空餐具',
              '空盘用海绵一擦即成空餐具，海绵不消耗',
              '空餐具可在点餐机回收换币，也能买回',
              '新增中餐厅点餐机，买卖菜品、餐具与家具',
              '新增 7 类原木中式家具，方桌可自动拼长桌',
              '椅子右键即可坐下，四个朝向坐姿都正确',
              '每口进食配独立音效，动作与声音同步'
            ],
            additions: [
              { name: '摆盘菜品', count: 10, unit: '道', items: ['红烧肉', '松鼠桂鱼', '红烧狮子头', '四喜丸子', '水煮肉片', '糖醋排骨', '可乐鸡翅', '香辣肉丝', '牛肉洋葱水饺', '西红柿炒鸡蛋'] },
              { name: '主食', count: 1, items: ['米饭（满碗 → 大半碗 → 少碗 → 空碗）'] },
              { name: '餐具', count: 5, items: ['饭碗', '长方盘', '薄汤盆', '厚汤盆', '大圆盘'] },
              { name: '家具装饰', count: 7, unit: '类', items: ['原木方桌', '原木椅子', '原木矮椅', '原木十字地板', '新中式方形吊灯', '原木栅栏隔板', '原木镂空栅栏隔板'] }
            ],
            perf: [
              '新玩家进服自动显示他人手持状态',
              '远处玩家的手持外观按需显示，不再抽搐',
              '玩家离开视野即释放，越玩越轻',
              '进食记录用完即清理，长时间游玩不膨胀',
              '椅子记录在离线、重生、切换世界时清理',
              '退出世界时统一关闭界面，再次进入不堆积',
              '普通物品互相切换不再重建外观',
              '停用无用的后台检查，减少空转',
              '方块外观与光泽统一，光影更稳定',
              '外观杂质清理干净，不再透光白边',
              '光影下菜品不再发黑',
              '点餐机界面放大 1.2 倍，长菜名不超框',
              '筷子可夹取的距离提升至 10 格'
            ],
            fixes: [
              '修复首次进入没拿到初始物品',
              '修复部分外观与介绍书图片丢失',
              '修复创造分类图标缺失',
              '修复点餐机商品超过 8 个无法翻页',
              '修复方块图标不刷新',
              '修复椅子坐姿朝向错误',
              '修复购买后潜影盒与附魔数据丢失',
              '修复爆炸破坏后隐形座椅残留',
              '修复方桌破坏后不刷新连接外观',
              '修复多数菜品吃完外观不切换',
              '修复第三人称端托重复显示错位',
              '修复筷子够不到、餐具动作不播',
              '修复米饭长按起手闪现完整外观',
              '修复进食音效无声且慢半拍',
              '修复手持闲置抽搐与进食撕扯',
              '修复红烧肉整段动作失效',
              '修复光影下菜品大面积发黑',
              '修复光影下白边与透明穿透',
              '修复空餐具被额外放成方块',
              '修复松鼠桂鱼残留多余状态',
              '修复十字地板相邻处中间发黑',
              '修复两个模组同开时点餐机界面串图',
              '修复购买按钮被横向拉伸',
              '修复中文菜名忽大忽小与超框',
              '修复商品卡片多余显示剩余数量',
              '修复多人同时夹同一道菜只少一格',
              '修复切换世界后进食状态失效',
              '修复异常退出后隐形座椅叠加',
              '修复初始物品重复发放与界面重复创建',
              '修复跨模组配方重复提示',
              '修复模组重名导致整体失效',
              '修复三个模组动作互相覆盖',
              '修复生物把餐厅方块当空气穿行',
              '修复手持筷子潜行放置异常'
            ]
          }
        ]
      },
      /* ================= 前置库 ================= */
      {
        key: 'yycore',
        name: '椰椰工坊：前置库',
        en: 'CORE LIBRARY',
        versions: [
          {
            version: 'v1.0',
            date: '2026.11.03',
            tag: '正式结项',
            theme: '首个正式版 · 统一币',
            short: '首个正式版',
            summary: [
              '便利店与中餐厅共用的前置库首个正式版',
              '两个模组共用同一套购买、摆放、吃喝与互动玩法',
              '统一币：两个模组通用，纪念币可 1:1 原地兑换',
              '统一币配有专属外观、音效与创造栏入口',
              '金币支持第一人称检视，联机时其他玩家也能看到'
            ],
            additions: [
              { name: '统一币', count: 1, unit: '套', items: ['统一币（方块、掉落、兑换与外观）'] }
            ],
            perf: [
              '公共玩法集中在一处维护，两个模组表现更一致',
              '重复的外观与音效只保留一份，模组体积更小'
            ],
            fixes: [
              '修复部分情况下前置库未生效，导致商店与互动失灵'
            ]
          }
        ]
      }
    ]
  };

  window.EF_MILESTONES = DATA;

  /* ---------------- 渲染 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function totalVersions() {
    return DATA.projects.reduce(function (n, p) { return n + p.versions.length; }, 0);
  }
  function projTotal(key) {
    var p = getProject(key);
    return p ? p.versions.length : 0;
  }
  function getProject(key) {
    for (var i = 0; i < DATA.projects.length; i++) {
      if (DATA.projects[i].key === key) return DATA.projects[i];
    }
    return null;
  }

  var rootEl = null;
  var state = { proj: DATA.projects[0] ? DATA.projects[0].key : '' };

  // 折叠块：默认收起，按钮切换；内容用 grid 行高过渡，避免脚本测高
  function foldBlock(eyebrow, label, countText, bodyHtml, open) {
    return '<section class="ms-fold' + (open ? ' is-open' : '') + '">' +
      '<button class="ef-btn small ms-fold-head" type="button" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<span class="ef-mono">' + esc(eyebrow) + '</span>' +
      '<span class="ms-fold-t">' + esc(label) + '</span>' +
      '<span class="ms-count">' + esc(countText) + '</span>' +
      '<span class="ms-caret" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="ms-fold-body"><div class="ms-fold-inner">' + bodyHtml + '</div></div>' +
      '</section>';
  }

  function listHtml(items, cls) {
    return '<ul class="' + cls + '">' + items.map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('') + '</ul>';
  }

  // 新互动流程：新增玩法入口单独置顶强调，避免被普通更新条目淹没
  function flowsHtml(v) {
    if (!v.flows || !v.flows.length) return '';
    return '<div class="ef-notice ms-flows" data-flag="新互动">' +
      '<ul>' + v.flows.map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('') + '</ul>' +
      '</div>';
  }

  function additionsHtml(v) {
    if (!v.additions || !v.additions.length) {
      return '<p class="ms-empty">' + esc(v.additionsNote || '本版本无新增食品饮料。') + '</p>';
    }
    var groups = v.additions.map(function (g) {
      return '<div class="ms-add">' +
        '<div class="ms-add-head"><span class="ms-add-name">' + esc(g.name) + '</span>' +
        '<span class="ef-field">' + g.count + ' ' + esc(g.unit || '款') + '</span></div>' +
        '<p class="ms-add-items">' + g.items.map(function (n) {
          return '<span class="ms-item-name">' + esc(n) + '</span>';
        }).join('') + '</p>' +
        '</div>';
    }).join('');
    var note = v.additionsNote ? '<p class="ms-note">' + esc(v.additionsNote) + '</p>' : '';
    return groups + note;
  }

  function versionHtml(v, idx) {
    var id = 'ms-' + state.proj + '-' + v.version.replace(/\./g, '');
    // 无新增内容时折叠块仍保留，展开看到一句说明（避免三个折叠块高度参差）
    var addCount = (v.additions || []).reduce(function (n, g) { return n + g.items.length; }, 0);
    var addLabel = v.additions && v.additions.length
      ? (v.additions.length + ' 类 / ' + addCount + ' 项')
      : '无新增';
    var perfHtml = v.perf && v.perf.length
      ? listHtml(v.perf, 'ms-points')
      : '<p class="ms-empty">该版本为初始发布，暂无优化记录。</p>';
    var fixHtml = v.fixes && v.fixes.length
      ? listHtml(v.fixes, 'ms-points')
      : '<p class="ms-empty">该版本为初始发布，暂无修复记录。</p>';

    return '<li class="ms-item" id="' + esc(id) + '">' +
      '<div class="ms-bar">' +
      '<span class="ef-tag ms-no">' + pad(idx + 1) + '</span>' +
      '<b class="ms-ver">' + esc(v.version) + '</b>' +
      '<span class="ef-field">' + esc(v.date) + '</span>' +
      '<span class="ef-state ms-state">' + esc(v.tag) + '</span>' +
      '</div>' +
      '<h3 class="ms-theme">' + esc(v.theme) + '</h3>' +
      flowsHtml(v) +
      '<div class="ms-sum-wrap"><span class="ef-eyebrow slash">Highlights</span>' +
      '<ol class="ms-sum">' + v.summary.map(function (t) {
        return '<li>' + esc(t) + '</li>';
      }).join('') + '</ol></div>' +
      '<div class="ms-folds">' +
      foldBlock('Added', '新增内容', addLabel, additionsHtml(v), false) +
      foldBlock('Optimized', '性能与体验优化', v.perf ? v.perf.length + ' 条' : '0 条', perfHtml, false) +
      foldBlock('Fixed', '问题修复', v.fixes ? v.fixes.length + ' 条' : '0 条', fixHtml, false) +
      '</div>' +
      '</li>';
  }

  function renderList() {
    var proj = getProject(state.proj);
    var listEl = rootEl.querySelector('#ef-ms-list');
    if (!proj || !listEl) return;
    // 数据按时间倒序存放（最新在前），直接渲染，最新版编号 01
    var list = proj.versions;
    listEl.innerHTML = list.map(function (v, i) { return versionHtml(v, i); }).join('');
    var lede = rootEl.querySelector('#ef-ms-lede');
    if (lede) {
      lede.textContent = '已结项版本 ' + proj.versions.length + ' 个 │ 数据更新于 ' + DATA.updated;
    }
    rootEl.querySelectorAll('[data-ms-proj]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.msProj === state.proj ? 'true' : 'false');
    });
  }

  function render(root) {
    rootEl = root;
    if (!rootEl || rootEl.dataset.msReady === '1') return;
    rootEl.dataset.msReady = '1';
    rootEl.innerHTML =
      '<div class="ms-tabs" role="group" aria-label="里程碑项目切换">' +
      DATA.projects.map(function (p) {
        return '<button class="ef-chip" type="button" data-ms-proj="' + esc(p.key) + '" aria-pressed="false">' +
          esc(p.name) + ' <span class="n">' + p.versions.length + '</span></button>';
      }).join('') +
      '</div>' +
      '<p class="ef-field ms-lede" id="ef-ms-lede"></p>' +
      '<ol class="ms-list" id="ef-ms-list"></ol>';

    rootEl.addEventListener('click', function (ev) {
      var tab = ev.target.closest('[data-ms-proj]');
      if (tab) {
        state.proj = tab.dataset.msProj;
        renderList();
        document.dispatchEvent(new CustomEvent('ef:ms-project-changed', { detail: state.proj }));
        return;
      }
      var head = ev.target.closest('.ms-fold-head');
      if (head) {
        var sec = head.parentNode;
        var open = sec.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });

    renderList();
  }

  window.EF_MILESTONES_VIEW = {
    render: render,
    count: totalVersions,
    projectCount: projTotal,
    current: function () { return state.proj; },
    setProject: function (key) {
      if (!getProject(key)) return;
      state.proj = key;
      renderList();
    },
    projects: function () { return DATA.projects; }
  };
})();
