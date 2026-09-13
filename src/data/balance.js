// ====== src/data/balance.js ======
// 全局数值平衡表 — 调整玩法节奏的关键

const Balance = {
  // 画布逻辑尺寸（逻辑像素）
  width: 480,
  height: 720,

  // 主循环
  fps: 60,
  dt: 1 / 60,

  // 玩家
  player: {
    speed: 320,             // px/s
    slowMultiplier: 0.4,   // 低速精确模式倍率
    maxHp: 5,
    startHp: 3,
    startBombs: 2,
    maxBombs: 3,
    invincibleTime: 1.5,    // 受伤后无敌秒数
    hitboxRadius: 2,        // 精确判定点
    grazeRadius: 12,        // 擦弹判定半径
    fireCooldown: {
      scatter: 0.10,
      laser: 0.06,
      homing: 0.14,
    },
    maxWeaponLevel: 5,
    optionFireMultiplier: 0.4,
  },

  // 能量与 Bomb
  energy: {
    max: 100,
    bombCost: 100,
    fromGraze: 5,
    fromKill: 2,
    fromPickup: 20,
    bombInvincibleTime: 1.5,
    bombAoEDamagePercent: 0.3,  // 对全屏敌造成最大生命 30% 伤害
  },

  // 连击
  combo: {
    maxMultiplier: 8,
    graceTime: 2.5,  // 不击杀则重置
    grazeScore: 50,
  },

  // 子弹速度
  bullet: {
    playerScatter: 720,
    playerLaser: 0,      // 激光为穿透
    playerHoming: 520,
    enemyStraight: 240,
    enemyFast: 360,
    enemySlow: 120,
    pickup: 140,
  },

  // 敌人配置
  enemy: {
    grunt:    { hp: 1,  score: 100, shoot: false, speed: 180, radius: 14 },
    zigzag:   { hp: 2,  score: 150, shoot: true,  speed: 140, radius: 14, shootInterval: 1.6 },
    arc:      { hp: 3,  score: 200, shoot: true,  speed: 110, radius: 16, shootInterval: 1.4 },
    ram:      { hp: 2,  score: 250, shoot: false, speed: 320, radius: 14 },
    bomber:   { hp: 2,  score: 200, shoot: false, speed: 130, radius: 14, explodeBullets: 8 },
    elite:    { hp: 12, score: 500, shoot: true,  speed: 100, radius: 22, shootInterval: 1.0, hasShield: true },
  },

  // 武器 DPS（满级，参考用）
  weaponDps: {
    scatter: 180,
    laser: 240,
    homing: 150,
  },

  // 金币经济（击杀奖励 / 通关奖励）
  coin: {
    rewards: {
      grunt: 5, zigzag: 8, arc: 10, ram: 12, bomber: 12, elite: 40,
    },
    boss: 300,             // Boss 击杀奖励
    stageClearBonus: 150,  // 每关通关奖励
    defaultReward: 8,      // 未知类型兜底
  },

  // 掉落概率
  dropRates: {
    normal: { P: 0.12, energy: 0.08, bomb: 0.01, shield: 0.03, life: 0.005, option: 0 },
    elite:  { P: 0.40, energy: 0.30, bomb: 0.08, shield: 0.15, life: 0.04, option: 0.10 },
    bossTransition: { P: 1.0, energy: 1.0, bomb: 0.5, shield: 0.3, life: 0.1, option: 0 },
  },

  // 颜色
  color: {
    bgDeep:   '#05060f',
    cyan:     '#00f0ff',
    magenta:  '#ff2e88',
    purple:   '#9b5cff',
    orange:   '#ffaa00',
    enemyRed: '#ff3050',
    playerBullet: '#00ffe1',
    text:     '#e8f4ff',
  },

  // 无尽模式参数
  endless: {
    waveTime: 30,            // 每波时长（秒）
    bossInterval: 90,        // Boss 间隔（秒）
    difficultyStep: 0.15,    // 每波难度增量
    hpScalePerWave: 0.25,    // Boss HP 每 wave 增长
    speedScale: 0.5,         // 敌人速度随难度增长系数
  },

  // 闯关模式难度递增（基于已通关次数重玩）
  stageScaling: {
    // 每通关一次重玩，敌人 HP/速度倍率（封顶）
    hpPerClear: 0.15,
    speedPerClear: 0.10,
    maxHpMult: 2.5,
    maxSpeedMult: 1.8,
  },

  // 调试
  debug: false,
};
