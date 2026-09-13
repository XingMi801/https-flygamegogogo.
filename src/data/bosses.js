// ====== src/data/bosses.js ======
// Boss 配置：阶段、HP、弹幕图案、运动方式
//
// 弹幕 pattern 类型（在 Boss 类中实现）：
//   'spiral'    螺旋发射 n 条旋臂
//   'fan'       朝玩家方向扇形 n 发
//   'boomerang' 子弹飞出后减速返回
//   'cross'     两组垂直/斜向子弹交织
//   'random_even' 随机角度但保证可穿越间隙
//   'rotating_bars' 两条弹幕墙旋转
//   'split_homing'  追踪弹飞一段后分裂
//   'summon'    召唤小怪
//   'barrage'   高密度全方位弹幕

const BossesData = {
  // ===== 第 1 关 Boss：巡哨者（小狗戴帽）=====
  boss_stage1: {
    name: 'PATROL-01',
    title: '巡哨者',
    character: 'dog',
    victorySpeech: '爷们牛逼',
    color: '#ff2e88',
    maxHp: 220,
    radius: 50,
    coreRadius: 18,       // 阶段2 暴露核心，伤害×2
    spawnY: 140,
    // 入场移动到这个 Y 后悬停
    hoverY: 140,
    movePattern: 'sweep',  // 左右往返
    moveRange: 160,
    moveSpeed: 90,
    phases: [
      // 阶段 1：螺旋 + 偶尔扇形
      {
        hpThreshold: 1.0,  // 起始 100%
        patterns: [
          { type: 'spiral', arms: 3, fireRate: 0.08, bulletSpeed: 180, duration: 5.0 },
          { type: 'fan', count: 7, spread: 50, fireRate: 1.0, bulletSpeed: 220, duration: 3.0 },
        ],
        color: '#ff3050',
      },
      // 阶段 2：核心暴露 + 旋转栅栏
      {
        hpThreshold: 0.66,
        patterns: [
          { type: 'rotating_bars', bars: 2, barWidth: 30, fireRate: 0.04, bulletSpeed: 200, duration: 6.0 },
          { type: 'spiral', arms: 4, fireRate: 0.06, bulletSpeed: 200, duration: 4.0 },
        ],
        color: '#ff2e88',
        coreExposed: true,
      },
      // 阶段 3：高密度全方位弹幕
      {
        hpThreshold: 0.33,
        patterns: [
          { type: 'barrage', count: 16, fireRate: 0.5, bulletSpeed: 240, duration: 3.0 },
          { type: 'fan', count: 9, spread: 80, fireRate: 0.6, bulletSpeed: 280, duration: 3.0 },
          { type: 'spiral', arms: 5, fireRate: 0.05, bulletSpeed: 220, duration: 4.0 },
        ],
        color: '#ffaa00',
      },
    ],
  },

  // ===== 第 2 关 Boss：裂光（黄牛牛来）=====
  boss_stage2: {
    name: 'PRISM-02',
    title: '裂光',
    character: 'cow',
    victorySpeech: '牛来！我命由我不由天',
    color: '#9b5cff',
    maxHp: 320,
    radius: 56,
    coreRadius: 20,
    spawnY: 150,
    hoverY: 150,
    movePattern: 'sweep',
    moveRange: 180,
    moveSpeed: 110,
    phases: [
      // 阶段 1：旋转栅栏 + 螺旋
      {
        hpThreshold: 1.0,
        patterns: [
          { type: 'rotating_bars', bars: 2, barWidth: 24, fireRate: 0.05, bulletSpeed: 200, duration: 5.0 },
          { type: 'spiral', arms: 4, fireRate: 0.07, bulletSpeed: 200, duration: 5.0 },
        ],
        color: '#9b5cff',
      },
      // 阶段 2：追踪分裂
      {
        hpThreshold: 0.75,
        patterns: [
          { type: 'split_homing', count: 4, fireRate: 1.2, bulletSpeed: 200, splitTime: 1.5, splitCount: 3, duration: 5.0 },
          { type: 'fan', count: 8, spread: 60, fireRate: 0.7, bulletSpeed: 240, duration: 5.0 },
        ],
        color: '#ff2e88',
      },
      // 阶段 3：核心常开 + 交叉网
      {
        hpThreshold: 0.50,
        patterns: [
          { type: 'cross', groupCount: 4, fireRate: 0.1, bulletSpeed: 220, duration: 4.0 },
          { type: 'fan', count: 10, spread: 90, fireRate: 0.6, bulletSpeed: 280, duration: 4.0 },
        ],
        color: '#ff3050',
        coreExposed: true,
        coreAlwaysOpen: true,
      },
      // 阶段 4：混合高密度
      {
        hpThreshold: 0.25,
        patterns: [
          { type: 'barrage', count: 20, fireRate: 0.4, bulletSpeed: 260, duration: 3.0 },
          { type: 'rotating_bars', bars: 3, barWidth: 20, fireRate: 0.04, bulletSpeed: 240, duration: 4.0 },
          { type: 'split_homing', count: 6, fireRate: 0.9, bulletSpeed: 220, splitTime: 1.2, splitCount: 3, duration: 3.0 },
        ],
        color: '#ffaa00',
      },
    ],
  },

  // ===== 第 3 关 Boss：深渊母舰（黄袋鼠）=====
  boss_stage3: {
    name: 'ABYSS-03',
    title: '深渊',
    character: 'kangaroo',
    victorySpeech: '你胆子真是肥嘟嘟的',
    color: '#ff2e88',
    maxHp: 480,
    radius: 70,
    coreRadius: 24,
    spawnY: 160,
    hoverY: 160,
    movePattern: 'sweep',
    moveRange: 200,
    moveSpeed: 130,
    // 弱点：4 炮塔需先破
    turrets: [
      { offsetX: -45, offsetY: 10, hp: 40, color: '#9b5cff', pattern: 'fan', count: 5, spread: 60, fireRate: 0.8, bulletSpeed: 220 },
      { offsetX:  45, offsetY: 10, hp: 40, color: '#9b5cff', pattern: 'fan', count: 5, spread: 60, fireRate: 0.8, bulletSpeed: 220 },
      { offsetX: -25, offsetY: 35, hp: 30, color: '#ff3050', pattern: 'spiral', arms: 2, fireRate: 0.12, bulletSpeed: 200 },
      { offsetX:  25, offsetY: 35, hp: 30, color: '#ff3050', pattern: 'spiral', arms: 2, fireRate: 0.12, bulletSpeed: 200 },
    ],
    phases: [
      // 阶段 1：炮塔攻击（核心无敌，直到炮塔全破）
      {
        hpThreshold: 1.0,
        patterns: [
          { type: 'summon', count: 2, type_enemy: 'grunt', fireRate: 4.0, duration: 8.0 },
        ],
        color: '#9b5cff',
        invulnerable: true,  // 炮塔存活时核心无敌
      },
      // 阶段 2：螺旋全方位
      {
        hpThreshold: 0.80,
        patterns: [
          { type: 'spiral', arms: 5, fireRate: 0.05, bulletSpeed: 220, duration: 5.0 },
          { type: 'barrage', count: 14, fireRate: 0.6, bulletSpeed: 240, duration: 4.0 },
        ],
        color: '#9b5cff',
      },
      // 阶段 3：旋转栅栏 + 追踪
      {
        hpThreshold: 0.60,
        patterns: [
          { type: 'rotating_bars', bars: 3, barWidth: 22, fireRate: 0.04, bulletSpeed: 230, duration: 5.0 },
          { type: 'split_homing', count: 6, fireRate: 0.8, bulletSpeed: 220, splitTime: 1.2, splitCount: 4, duration: 4.0 },
        ],
        color: '#ff2e88',
      },
      // 阶段 4：高密度混合 + 召唤
      {
        hpThreshold: 0.35,
        patterns: [
          { type: 'barrage', count: 18, fireRate: 0.4, bulletSpeed: 260, duration: 3.0 },
          { type: 'summon', count: 3, type_enemy: 'zigzag', fireRate: 5.0, duration: 4.0 },
          { type: 'cross', groupCount: 5, fireRate: 0.08, bulletSpeed: 240, duration: 3.0 },
        ],
        color: '#ff3050',
        coreExposed: true,
      },
      // 阶段 5：最终狂暴
      {
        hpThreshold: 0.15,
        patterns: [
          { type: 'barrage', count: 24, fireRate: 0.3, bulletSpeed: 280, duration: 3.0 },
          { type: 'spiral', arms: 7, fireRate: 0.04, bulletSpeed: 240, duration: 4.0 },
          { type: 'rotating_bars', bars: 4, barWidth: 18, fireRate: 0.03, bulletSpeed: 260, duration: 3.0 },
        ],
        color: '#ffaa00',
      },
    ],
  },

  // ===== 第 4 关 Boss：终焉旗舰（金紫袋鼠·最难点）=====
  boss_stage4: {
    name: 'OVERLORD-04',
    title: '终焉',
    character: 'kangaroo',
    victorySpeech: '爷们！真的牛逼！',
    color: '#ffd43b',
    maxHp: 680,
    radius: 76,
    coreRadius: 26,
    spawnY: 165,
    hoverY: 165,
    movePattern: 'sweep',
    moveRange: 220,
    moveSpeed: 150,
    // 弱点：6 炮塔需先破
    turrets: [
      { offsetX: -52, offsetY: 8,  hp: 60, color: '#9b5cff', pattern: 'fan',    count: 6, spread: 70, fireRate: 0.7,  bulletSpeed: 240 },
      { offsetX:  52, offsetY: 8,  hp: 60, color: '#9b5cff', pattern: 'fan',    count: 6, spread: 70, fireRate: 0.7,  bulletSpeed: 240 },
      { offsetX: -28, offsetY: 40, hp: 45, color: '#ff3050', pattern: 'spiral', arms: 3, fireRate: 0.10, bulletSpeed: 220 },
      { offsetX:  28, offsetY: 40, hp: 45, color: '#ff3050', pattern: 'spiral', arms: 3, fireRate: 0.10, bulletSpeed: 220 },
      { offsetX: -14, offsetY: -30, hp: 35, color: '#00f0ff', pattern: 'fan',   count: 4, spread: 40, fireRate: 0.9, bulletSpeed: 260 },
      { offsetX:  14, offsetY: -30, hp: 35, color: '#00f0ff', pattern: 'fan',   count: 4, spread: 40, fireRate: 0.9, bulletSpeed: 260 },
    ],
    phases: [
      // 阶段 1：炮塔齐射（核心无敌）
      {
        hpThreshold: 1.0,
        patterns: [
          { type: 'summon', count: 3, type_enemy: 'grunt', fireRate: 3.5, duration: 8.0 },
        ],
        color: '#9b5cff',
        invulnerable: true,
      },
      // 阶段 2：旋转弹幕墙
      {
        hpThreshold: 0.85,
        patterns: [
          { type: 'rotating_bars', bars: 4, barWidth: 20, fireRate: 0.035, bulletSpeed: 240, duration: 5.0 },
          { type: 'spiral', arms: 6, fireRate: 0.045, bulletSpeed: 230, duration: 4.0 },
        ],
        color: '#9b5cff',
      },
      // 阶段 3：追踪分裂海
      {
        hpThreshold: 0.70,
        patterns: [
          { type: 'split_homing', count: 8, fireRate: 0.7, bulletSpeed: 230, splitTime: 1.1, splitCount: 4, duration: 5.0 },
          { type: 'wave_stream', count: 5, fireRate: 0.45, bulletSpeed: 250, waveAmp: 30, waveFreq: 1.8, spread: 14, duration: 4.0 },
        ],
        color: '#ff2e88',
      },
      // 阶段 4：核心常开 + 交叉网
      {
        hpThreshold: 0.50,
        patterns: [
          { type: 'cross', groupCount: 6, fireRate: 0.07, bulletSpeed: 250, duration: 4.0 },
          { type: 'barrage', count: 18, fireRate: 0.35, bulletSpeed: 260, duration: 3.0 },
        ],
        color: '#ff3050',
        coreExposed: true,
        coreAlwaysOpen: true,
      },
      // 阶段 5：召唤 + 混合
      {
        hpThreshold: 0.30,
        patterns: [
          { type: 'summon', count: 4, type_enemy: 'zigzag', fireRate: 4.0, duration: 4.0 },
          { type: 'ring_pulse', count: 20, fireRate: 0.85, bulletSpeed: 230, duration: 3.0 },
          { type: 'rotating_bars', bars: 3, barWidth: 18, fireRate: 0.04, bulletSpeed: 250, duration: 3.0 },
        ],
        color: '#ff2e88',
        coreExposed: true,
      },
      // 阶段 6：最终狂暴
      {
        hpThreshold: 0.12,
        patterns: [
          { type: 'barrage', count: 28, fireRate: 0.25, bulletSpeed: 290, duration: 3.0 },
          { type: 'spiral', arms: 8, fireRate: 0.035, bulletSpeed: 250, duration: 4.0 },
          { type: 'cross', groupCount: 7, fireRate: 0.06, bulletSpeed: 260, duration: 3.0 },
        ],
        color: '#ffaa00',
        coreExposed: true,
      },
    ],
  },

  // ===== 无尽模式专属 Boss：混沌（黑红猎犬·每第二个 Boss 出现）=====
  boss_endless: {
    name: 'CHAOS-∞',
    title: '混沌',
    character: 'dog',
    victorySpeech: '牛的！这都打得过？',
    color: '#ff3050',
    maxHp: 420,
    radius: 70,
    coreRadius: 24,
    spawnY: 160,
    hoverY: 160,
    movePattern: 'sweep',
    moveRange: 280,
    moveSpeed: 210,
    // 弱点：3 炮塔
    turrets: [
      { offsetX: -46, offsetY: 10, hp: 55, color: '#ff3050', pattern: 'spiral', arms: 2, fireRate: 0.09, bulletSpeed: 230 },
      { offsetX:  46, offsetY: 10, hp: 55, color: '#ff3050', pattern: 'spiral', arms: 2, fireRate: 0.09, bulletSpeed: 230 },
      { offsetX:   0, offsetY: -34, hp: 40, color: '#ffd43b', pattern: 'fan',   count: 5, spread: 55, fireRate: 0.8, bulletSpeed: 250 },
    ],
    phases: [
      // 阶段 1：炮塔阶段（核心无敌）
      {
        hpThreshold: 1.0,
        patterns: [
          { type: 'summon', count: 2, type_enemy: 'ram', fireRate: 3.0, duration: 6.0 },
        ],
        color: '#ff3050',
        invulnerable: true,
      },
      // 阶段 2：高速旋转弹幕
      {
        hpThreshold: 0.80,
        patterns: [
          { type: 'rotating_bars', bars: 3, barWidth: 16, fireRate: 0.03, bulletSpeed: 260, duration: 4.5 },
          { type: 'spiral', arms: 5, fireRate: 0.04, bulletSpeed: 240, duration: 3.5 },
        ],
        color: '#ff2e88',
      },
      // 阶段 3：追踪分裂
      {
        hpThreshold: 0.55,
        patterns: [
          { type: 'split_homing', count: 6, fireRate: 0.6, bulletSpeed: 240, splitTime: 1.0, splitCount: 3, duration: 4.0 },
          { type: 'wave_stream', count: 6, fireRate: 0.4, bulletSpeed: 260, waveAmp: 34, waveFreq: 2.0, spread: 12, duration: 3.5 },
        ],
        color: '#9b5cff',
        coreExposed: true,
      },
      // 阶段 4：狂暴终局
      {
        hpThreshold: 0.25,
        patterns: [
          { type: 'ring_pulse', count: 22, fireRate: 0.75, bulletSpeed: 240, duration: 3.0 },
          { type: 'spiral', arms: 7, fireRate: 0.035, bulletSpeed: 255, duration: 4.0 },
          { type: 'cross', groupCount: 6, fireRate: 0.055, bulletSpeed: 265, duration: 3.0 },
        ],
        color: '#ffaa00',
        coreExposed: true,
      },
    ],
  },
};
