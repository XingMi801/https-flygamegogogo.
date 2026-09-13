// ====== src/systems/SpawnerEndless.js ======
// 无尽模式生成器：按时间程序化生成，难度阶梯递增
// 每 WAVE_TIME 秒一波，每 BOSS_INTERVAL 秒一个 Boss（HP 按 wave 缩放）

const SpawnerEndless = {
  time: 0,
  wave: 0,                  // 当前波次（1-based）
  waveTimer: 0,             // 当前波已持续时间
  bossTimer: 0,             // 距下次 Boss
  bossActive: false,
  spawnTimer: 0,            // 波内分批生成计时
  difficulty: 1,            // 难度倍率（基于 wave）
  ended: false,
  // 难度曲线（参考 Balance.endless）
  WAVE_TIME: 30,             // 每波时长
  BOSS_INTERVAL: 90,         // Boss 间隔
  // 敌人类型权重池，随难度解锁更强敌人
  _pools: {
    easy: ['grunt', 'zigzag'],
    mid: ['grunt', 'zigzag', 'arc', 'ram', 'bomber'],
    hard: ['zigzag', 'arc', 'ram', 'bomber', 'elite'],
  },

  start() {
    const cfg = Balance.endless || {};
    this.WAVE_TIME = cfg.waveTime || 30;
    this.BOSS_INTERVAL = cfg.bossInterval || 90;
    this.time = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.bossTimer = this.BOSS_INTERVAL;
    this.bossActive = false;
    this.spawnTimer = 0;
    this.difficulty = 1;
    this.ended = false;
    this._spawnNextWave();
  },

  // 当前波次的生成预算（敌人数量 / 类型池）
  _spawnNextWave() {
    this.wave++;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.difficulty = 1 + (this.wave - 1) * 0.15;
    if (Stats) Stats.onWave(this.wave);

    // 选择敌人池
    let pool;
    if (this.wave <= 3) pool = this._pools.easy;
    else if (this.wave <= 8) pool = this._pools.mid;
    else pool = this._pools.hard;

    // 每波总敌人数
    const baseCount = 8 + this.wave * 2;
    // 每波生成 budget，分批 spawn
    this._waveBudget = baseCount;
    this._waveSpawned = 0;
    this._wavePool = pool;
    this._spawnInterval = Math.max(0.15, 0.5 - this.wave * 0.02);

    // 波次提示粒子
    if (Game.particles && this.wave > 1) {
      Game.particles.spawnText(Balance.width / 2, Balance.height / 2 - 40, 'WAVE ' + this.wave, '#00f0ff');
    }
  },

  update(dt) {
    if (this.ended) return;
    this.time += dt;
    this.waveTimer += dt;

    // Boss 战期间停止普通生成
    if (this.bossActive) {
      if (!Game.boss || Game.boss.dead) {
        this.bossActive = false;
        this.bossTimer = this.BOSS_INTERVAL;
      }
      return;
    }

    // ===== 普通波内分批生成 =====
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this._waveSpawned < this._waveBudget) {
      this._spawnBatch();
      this.spawnTimer = this._spawnInterval;
    }

    // ===== 波次结束 -> 进入下一波 =====
    if (this.waveTimer >= this.WAVE_TIME && this._waveSpawned >= this._waveBudget) {
      this._spawnNextWave();
    }

    // ===== Boss 计时 =====
    this.bossTimer -= dt;
    if (this.bossTimer <= 0 && !this.bossActive) {
      this._spawnBoss();
    }
  },

  _spawnBatch() {
    // 一次生成 2~4 个敌人
    const n = 2 + Math.floor(Math.random() * 3);
    const pool = this._wavePool;
    for (let i = 0; i < n && this._waveSpawned < this._waveBudget; i++) {
      const type = pool[Math.floor(Math.random() * pool.length)];
      this._spawnOne(type);
      this._waveSpawned++;
    }
  },

  _spawnOne(type) {
    const W = Balance.width;
    const from = Math.random();
    let x, y;
    if (from < 0.7) { x = Utils.rndRange(40, W - 40); y = -20; }
    else if (from < 0.85) { x = -20; y = Utils.rndRange(40, 200); }
    else { x = W + 20; y = Utils.rndRange(40, 200); }

    const e = new Enemy(type, x, y, {
      pattern: 'line',
      targetY: type === 'arc' || type === 'elite' ? Utils.rndRange(80, 180) : 0,
      amp: Utils.rndRange(60, 120),
      freq: Utils.rndRange(1.0, 2.0),
    });
    // 难度缩放：HP/速度
    const cfg = Balance.enemy[type] || Balance.enemy.grunt;
    e.maxHp = Math.max(1, Math.round(cfg.hp * this.difficulty));
    e.hp = e.maxHp;
    e.speed = cfg.speed * (1 + (this.difficulty - 1) * 0.5);
    Game.enemies.push(e);
  },

  _spawnBoss() {
    // 每第二个 Boss 固定为无尽专属「混沌」，其余从关卡 Boss 随机（HP 按 wave 缩放）
    this._bossCount = (this._bossCount || 0) + 1;
    let key, cfg;
    if (this._bossCount % 2 === 0) {
      key = 'boss_endless';
      cfg = BossesData.boss_endless;
    } else {
      const keys = Object.keys(BossesData).filter(k => k !== 'boss_endless');
      key = keys[Math.floor(Math.random() * keys.length)];
      cfg = BossesData[key];
    }
    const clone = JSON.parse(JSON.stringify(cfg));
    // HP 倍率：基础 + wave 增长
    const hpMult = 1 + (this.wave - 1) * 0.25;
    clone.maxHp = Math.round(cfg.maxHp * hpMult);
    // 阶段 HP 阈值保持百分比不变，无需调整
    this.bossActive = true;
    if (Game) Game.spawnBoss(undefined, clone, key);
  },

  // 关卡开始前预估敌人总数（无尽模式无意义，返回 0）
  getTotalEnemies() { return 0; },

  // 无尽模式无显式 bossTriggered 流程
  get bossTriggered() { return this.bossActive; },
};
