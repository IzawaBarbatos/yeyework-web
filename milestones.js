/* 版本里程碑：已结项版本公告数据 + 渲染（手写维护，非自动同步生成）
   内容依据：QuMod框架知识库 01_项目来源与版本快照 / 更新日志归档 / 06 项目文档 / 12 修复记录
   口径：只收录已结项版本；制作中的版本不列入（在研计划见 plan.js）。 */
(function () {
  'use strict';

  var DATA = {
    updated: '2026.10.31',
    projects: [
      /* ================= 便利店 ================= */
      {
        key: 'yybld',
        name: '椰椰工坊：便利店',
        en: 'CONVENIENCE STORE',
        versions: [
          {
            version: 'v1.3',
            pkg: '1.3.0',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '统一币落地 · 前置库接入 · 金币手模闭环',
            short: '统一币与金币手模',
            flows: [
              '兑换新币：自动贩卖机界面点「兑换新币」，背包与潜影盒 / 收纳袋里的旧币可 1:1 原地换成统一币',
              '金币检视：手持金币右键检视，第一人称展示；联机时其他玩家也能看到你手中的金币'
            ],
            summary: [
              '新增统一币，便利店所有交易改用统一币结算',
              '旧币改为纪念币：保留方块与掉落，不再能花',
              '自动贩卖机新增「兑换新币」入口，旧币 1:1 原地兑换，失败不吞币',
              '首次进入限时赠送 1 枚便利店纪念币',
              '金币支持第一人称检视，联机跨玩家可见',
              '第一人称吃喝动画架构重构，动作更顺',
              '前置库接入：饮食、交易、放置守卫与币种策略统一收口',
              '吸顶灯碰撞箱、易拉宝材质与烧水壶放回等问题修复'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料；新增内容为统一币与旧币纪念币化，统一币资源由前置库提供。',
            perf: [
              '前置库纯逻辑接管饮食扣物 / 效果 / 轮次 / 音效与商店交易',
              '手模资源副本收口前置库，包体更精简',
              '动画控制器改为运行时注入，不再覆盖原版文件',
              '玩家渲染控制器改纯 query.mod 求值，三包同载不刷屏',
              '旧币移出合成表与创造栏，界面更清爽',
              '脚本跨包依赖改为平台动态装载，提审更稳'
            ],
            fixes: [
              '修复吸顶灯碰撞箱偏移',
              '修复易拉宝模型环境光遮蔽导致的显示异常',
              '修复烧水壶放回底座后壶内状态丢失',
              '修复移动端食品 HUD 卸载期报错',
              '修复三包同载时 ESC 菜单每帧刷实体查询错误',
              '修复潜行放置金币被误判为空手取回',
              '修复金币第三人称跨玩家不可见'
            ]
          },
          {
            version: 'v1.23',
            pkg: '1.2.3',
            date: '2026.10.23',
            tag: '正式结项',
            theme: '万能货架 · 进食动画重置 · 调校棒与清理棒',
            short: '万能货架与调校棒',
            flows: [
              '万能货架：潜行手持任意物品右键货架即可上架展示，空手右键取回',
              '货架调校棒：手持右键货架，现场微调物品的角度、大小与位置',
              '清理棒：房主可在设置里开关清理棒，一键清走残留展示物'
            ],
            summary: [
              '万能货架升级：16 大类物品各有专属摆法，原版内容和模组内容都能上架',
              '旧食物的模型、进食动作与音效整批重做，吃起来更顺',
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
              '货架模型整批翻新，摆件位置按新模型重新对齐',
              '调校棒界面字号加大、参数居中，操作更好按',
              '货架批量上架改为分批送达，上百件也不卡',
              '批量上架设有队列上限，长时间挂机不膨胀',
              '玩家离线后自动清空其待送商品',
              '摆件绑定失败会自动止损，不再反复重试',
              '区域清理遇到异常坐标会跳过，不会中断',
              '货架品类判定前置，带耐久工具不会被摆错',
              '炼药锅取水不改锅本身，减少多余变化',
              '清理无用旧代码，运行更轻快',
              '通过平台审核合规检查，上架更顺利'
            ],
            fixes: [
              '修复部分饮料仍带伤害吸收效果',
              '修复商店中文名忽大忽小与超框',
              '修复商品卡片仍显示剩余数量',
              '修复弩摆上货架后下陷约三格',
              '修复辣条等商品贴图显示紫黑',
              '修复甜筒与老冰棍展示模型用错模板',
              '修复货架大件商品上架顺序随机',
              '修复魔角拿起动画被提前截断',
              '修复 25 款旧食物手部贴图错位拉伸',
              '修复 5 项旧食物手模与索引错位',
              '修复 12 段新音效没有声音',
              '修复律动与魔角长按没有进食动画',
              '修复魔角手部贴图撕裂',
              '修复红茶饮料三态贴图丢失',
              '修复易拉宝没有进入售卖列表',
              '修复辣条食用动画与状态时长不一致',
              '修复方便面重复动画导致资源告警'
            ]
          },
          {
            version: 'v1.22',
            pkg: '1.2.2',
            date: '2026.09.29',
            tag: '正式结项',
            theme: '多模组兼容 · 光影优化 · 空手收回',
            short: '多模组兼容与光影',
            flows: [
              '空手右键摆好的食品饮品方块，可原样收回背包，方块不破坏'
            ],
            summary: [
              '多模组兼容：同时装多个椰椰工坊模组，便利店不再整体失效',
              '光影优化：光影环境下方块不再丢面、闪烁与透光',
              '空手右键即可把摆出的食品饮品收回，方块不被破坏',
              '商店界面与贴图全面隔离，不再与其他模组串图',
              '51 款食品饮品方块均支持空手收回'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料，新增的是「空手收回」交互能力。',
            perf: [
              '脚本目录改为全局唯一命名，多包互不覆盖',
              '三个模组的手持动画变量各加专属前缀',
              '41 个方块渲染方式统一修正，光影更稳',
              '购物车材质回归原版标准',
              '冷雾贴图底色净化，不再发脏',
              '交付前全量自检并清理缓存，减少异常'
            ],
            fixes: [
              '修复多包同开时便利店整包失效',
              '修复手持动画变量被覆盖、模型消失',
              '修复光影下 41 个方块丢面闪烁',
              '修复购物车材质与画面不符',
              '修复冷雾粒子底色发脏',
              '修复货架破坏后悬空商品清不掉',
              '修复商店界面与其他模组命名冲突'
            ]
          },
          {
            version: 'v1.21',
            pkg: '1.2.1',
            date: '2026.09.26',
            tag: '正式结项',
            theme: '联机手持同步 · 营养数值 · 防刷加固',
            short: '联机与营养数值',
            summary: [
              '联机时能看到其他玩家手中的食物模型与姿势',
              '吃东西真正能回饱食度与饱和度',
              '瞄准空气长按吃东西不再中途取消',
              '村民等生物不再穿过便利店方块卡住',
              '清理棒可清掉货架破坏后残留的幽灵商品',
              '自动贩卖机不怕爆炸，破坏任意一格整机拆除',
              '中秋灯笼改用新方案，发光与碰撞更稳定'
            ],
            additions: null,
            additionsNote: '本版本无新增食品饮料，集中加固联机、数值与安全。',
            perf: [
              '冷雾扫描改为分帧推进，不再一卡一卡',
              '冷雾放置即出、破坏即停，不必干等四秒',
              '远端玩家手持模型按需加载，切视野不卡',
              '低端机图标统一压缩，画面不再整体变糊',
              '图标边缘白噪点清理干净',
              '保护货架数据不被误删，重载后仍在',
              '贩卖机连锁拆除加防重入，不会重复结算',
              '商店界面底板补齐，不再缺失或溢出'
            ],
            fixes: [
              '修复买东西后背包潜影盒内容被洗白',
              '修复货架可被重复刷物与盗物',
              '修复区块未加载时展示实体永久残留',
              '修复快捷栏槽位异常导致越界',
              '修复区块未加载时存档数据被误删',
              '修复扣款到零后留下数量为 1 的空槽',
              '修复七处失效的事件监听',
              '修复爆炸后追踪状态残留',
              '修复吃食物只加饥饿、不加饱食度',
              '修复长按食用被取消或只播开头',
              '修复东北老冰棍音效无声',
              '修复泡面方块破坏后掉双份',
              '修复第三人称左手残影悬空',
              '修复联机看不到别人手里的食物',
              '修复低端机贴图变糊与图标白边',
              '修复取用手持物品时崩溃',
              '修复冷雾重进存档消失、放置不出雾',
              '修复贩卖机被炸出白色部件',
              '修复生物穿墙式穿过便利店方块',
              '修复中秋灯笼视角裁切与前后遮挡错乱'
            ]
          },
          {
            version: 'v1.2',
            pkg: '1.2.0',
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
              '购买时不再把背包容器里的东西洗白',
              '吃东西的增益不再冒药水粒子',
              '冷柜冷雾只在附近显示，远处不再白刷'
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
              '空调与烧水壶声音改为附近播放',
              '新增附近玩家与音效工具，减少重复计算',
              '冷雾加入视距剔除，远处直接跳过',
              '食品增益不再生成药水粒子',
              '扣款只动货币槽位，不再整包写回',
              '掉落表去重合并，资源更精简',
              '清理悬空贴图与多余模型',
              '服务依赖拆分，清理棒不再牵连货架',
              '合并空调相关模块，结构更清爽'
            ],
            fixes: [
              '修复购买后潜影盒内物品被洗白',
              '修复中秋灯笼多视角丢面闪烁',
              '修复新商品上架后立刻被退回',
              '修复月饼无法摆上货架',
              '修复 12 款中秋商品资源错配',
              '修复方便面方块破坏后掉双份',
              '修复东北老冰棍音效无声',
              '修复桶装薯片上架位置偏移',
              '修复牛奶音效配错',
              '修复空调要连点多次才能开关',
              '修复月饼货架定位与分组错误'
            ]
          },
          {
            version: 'v1.1',
            pkg: '1.1.0',
            date: '2026.09.10',
            tag: '正式结项',
            theme: '框架重写 · 历史问题集中修复',
            short: '框架重写',
            flows: [
              '方便面：拆开取面饼，用烧水壶倒热水，等泡开后再逐口吃',
              '烧水壶：对水源装水，烧开后倒进面里'
            ],
            summary: [
              '新增方便面泡面玩法：拆袋、倒热水、等泡开、再逐口吃',
              '新增烧水壶：装水、烧开、倒水一步到位',
              '模组底层全面重写，重进世界不再丢状态',
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
              '底层改为服务化结构，启动顺序更稳定',
              '界面命名隔离，避免与其他模组冲突',
              '204 个以上方块破坏时间统一为 0.8 秒',
              '音效统一转码为引擎可识别的格式',
              '掉落表补全，生存模式也能获得',
              '新增移动端一键触控操作界面'
            ],
            fixes: [
              '修复与其他模组界面命名冲突',
              '修复音效文件在但完全没声音',
              '修复方块破坏不掉落物品',
              '修复贩卖机分页与扣款边界异常',
              '修复旧架构下状态互相污染'
            ]
          },
          {
            version: 'v1.0',
            pkg: '1.0.0',
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
              { name: '内容规模', count: 4, unit: '项', items: ['方块定义 133 项', '手持物品 28 件', '实体 95 个（含 27 个货架展示实体）', '售卖商品 90 项以上'] }
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
            pkg: '1.1.0',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '统一币接入 · 4 道新菜 · 17 件建材与互动家具',
            short: '新菜与互动家具',
            flows: [
              '互动家具：壁灯、木玻璃门、大型木玻璃窗与招牌可直接点模型开关，移动端同样有效',
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
              '壁灯 / 门 / 窗 / 招牌改为可开关的互动家具，点模型即可开关',
              '木窗深浅两色支持单面渲染，光影下不再丢面'
            ],
            additions: [
              { name: '摆盘菜品', count: 4, unit: '道', items: ['锅包肉', '麻婆豆腐', '皮蛋豆腐', '鲜肉包子'] },
              { name: '模型方块', count: 10, items: ['窗台', '原木', '招牌等 10 个自定义模型方块'] },
              { name: '方块实体建材', count: 7, items: ['壁灯', '木玻璃门', '大型木玻璃窗', '招牌字等 7 个方块实体'] }
            ],
            perf: [
              '第一人称动画与便利店同源，三包同载不冲突',
              '移动端开关改屏幕坐标反算射线，点哪开哪',
              '交互距离按玩家自身准心距离收敛，不再固定 12 格',
              '手模与检视音效资源收口前置库，重复文件清理',
              '脚本跨包依赖改为平台动态装载，提审更稳'
            ],
            fixes: [
              '修复移动端互动家具点按不准',
              '修复开关交互距离过大导致远处也能开门',
              '修复互动家具过渡动画不播或播不完整',
              '修复菜品潜行放置后被立刻空手取回',
              '修复半砖 UV 错位',
              '修复木窗深浅色无法单面渲染',
              '修复 4 道新菜口数按末态序号计算错误',
              '修复鲜肉包子进食音效无声'
            ]
          },
          {
            version: 'v1.0',
            pkg: '1.0.0',
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
              '新玩家进服自动同步他人手持状态',
              '远端玩家手持模型按需加载，不再抽搐',
              '玩家离开视野即释放缓存，越玩越轻',
              '进食记录用完即回收，长时间游玩不膨胀',
              '椅子记录在离线、重生、切维度时清理',
              '停服时统一解绑界面监听，热重载不堆积',
              '普通物品互相切换不再重建模型',
              '停用空转的冷雾与感应门扫描',
              '文件数由 783 精简到 778',
              '方块渲染与微光参数统一，光影更稳定',
              '贴图半透明杂质清零，不再透光白边',
              '补全渲染覆盖，光影下菜品不再发黑',
              '点餐机界面放大 1.2 倍，长菜名不超框',
              '筷子交互距离提升至 10 格'
            ],
            fixes: [
              '修复首次进入没拿到初始物品',
              '修复部分贴图与介绍书图片丢失',
              '修复创造分类图标缺失',
              '修复点餐机商品超过 8 个无法翻页',
              '修复方块图标不刷新',
              '修复椅子坐姿朝向错误',
              '修复购买后潜影盒与附魔数据丢失',
              '修复爆炸破坏后隐形座椅残留',
              '修复方桌破坏后不刷新连接外观',
              '修复多数菜品吃完外观不切换',
              '修复第三人称端托双重渲染错位',
              '修复筷子够不到、餐具动画不播',
              '修复米饭长按起手闪现完整模型',
              '修复进食音效无声且慢半拍',
              '修复手持闲置抽搐与进食撕扯',
              '修复红烧肉整段动画失效',
              '修复光影下菜品大面积发黑',
              '修复光影下白边与透明穿透',
              '修复空餐具被额外放成方块',
              '修复松鼠桂鱼残留多余状态',
              '修复十字地板相邻处中间发黑',
              '修复双模组同开时点餐机界面串图',
              '修复购买按钮被横向拉伸',
              '修复中文菜名忽大忽小与超框',
              '修复商品卡片多余显示剩余数量',
              '修复多人同时夹同一道菜只少一格',
              '修复切换维度后进食状态失效',
              '修复异常退出后隐形座椅叠加',
              '修复初始物品重复发放与界面重复创建',
              '修复跨模组配方重复提示',
              '修复模组目录撞名导致整包失效',
              '修复三包动画变量互相覆盖',
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
            version: 'v1.0.2',
            pkg: '1.0.2',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '包版本递增（平台识别）',
            short: '版本递增',
            summary: [
              '仅 BP / RP 4 处 manifest 版本递增至 [1, 0, 2]',
              'API_VERSION 保持 8，对外接口与 v1.0.1 完全一致',
              '便利店 v1.3 / 中餐厅 v1.1 无需改动，平台按 UUID 关联'
            ],
            additions: null,
            additionsNote: '本版本工程侧零逻辑 / 资源改动，仅做版本递增。',
            perf: ['包版本递增，便于平台识别前置库新包'],
            fixes: ['无代码修复，能力范围与上一版一致']
          },
          {
            version: 'v1.0.1',
            pkg: '1.0.1',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '补丁结项版',
            short: '补丁结项',
            summary: [
              '补丁结项版，包版本递增至 [1, 0, 1]',
              '工程侧无新增或删除逻辑，能力范围与 v1.0 完全一致',
              'API_VERSION 保持 8'
            ],
            additions: null,
            additionsNote: '本版本无新增资源与逻辑。',
            perf: ['BP / RP 4 处 manifest 对齐，平台可识别新包'],
            fixes: ['无代码修复，纯版本递增']
          },
          {
            version: 'v1.0',
            pkg: '1.0.0',
            date: '2026.10.29',
            tag: '正式结项',
            theme: '首个正式版 · 纯逻辑前置库与统一币',
            short: '首个正式版',
            summary: [
              '首个正式结项版：不依赖 QuModLibs 的纯逻辑前置库',
              '提供通用逻辑：方块工具、初始物品、联通方块、放置守卫、商店交易与移动端 HUD',
              '币种体系：统一币可支付策略与纪念币 1:1 原地兑换',
              '统一币资源包：方块、模型、贴图、语言与创造分页',
              '金币第一人称检视渲染与检视音效',
              'BP / RP 4 处 manifest 对齐 [1, 0, 0]'
            ],
            additions: [
              { name: '统一币', count: 1, unit: '套', items: ['统一币资源链（方块 / 掉落 / 配方 / 模型 / 贴图 / 语言）'] }
            ],
            perf: [
              '纯逻辑以组合方式调用，事件监听与服务生命周期留在业务模组',
              '对外接口只增不删，API_VERSION 仅递增',
              '补齐 entities 目录修复 MCS 审核错误码 24'
            ],
            fixes: []
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
      (v.pkg ? '<span class="ef-field">包版本 ' + esc(v.pkg) + '</span>' : '') +
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
