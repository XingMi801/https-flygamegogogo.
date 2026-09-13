// ====== src/systems/Spawner.js ======
// 波次生成器：根据 waves 数据配置按时间生成敌人

const Spawner = {
  stageData: null,
  time: 0,
  spawnQueue: [],     // 排序后的波次
  cursor: 0,
  spawned: 0,
  bossTriggered: false,
  totalEnemies: 0,    // 关卡预计总敌人数（用于全灭判定）

  start(stageData) {
    this.stageData = stageData;
    this.time = 0;
    this.bossTriggered = false;
    this.spawnQueue = stageData.waves.slice();
    // 排序按 time
    this.spawnQueue.sort((a, b) => a.time - b.time);
    this.cursor = 0;
    this.spawned = 0;
    // 计算总敌人数（不含 Boss）
    this.totalEnemies = 0;
    for (let i = 0; i < this.spawnQueue.length; i++) {
      const w = this.spawnQueue[i];
      if (w.type) this.totalEnemies += (w.count || 1);
    }
  },

  update(dt) {
    if (this.bossTriggered) return;
    this.time += dt;

    // 触发所有 time <= 当前时间的波次
    while (this.cursor < this.spawnQueue.length) {
      const w = this.spawnQueue[this.cursor];
      if (w.time > this.time) break;

      if (w.boss) {
        // 触发 Boss
        this.bossTriggered = true;
        if (Game) Game.spawnBoss(w.boss);
        this.cursor++;
        return;
      }
      if (w.type) {
        this._spawnWave(w);
      }
      this.cursor++;
    }
  },

  _spawnWave(w) {
    const count = w.count || 1;
    const interval = w.interval || 0.3;
    // 用 setTimeout 串行生成（让敌人依次入场）
    for (let i = 0; i < count; i++) {
      const delay = i * interval * 1000;
      setTimeout(() => this._spawnOne(w), delay);
    }
  },

  _spawnOne(w) {
    if (!Game || Game.state !== 'play') return;
    const type = w.type;
    const W = Balance.width;
    let x, y;
    if (w.from === 'top' || !w.from) {
      x = Utils.rndRange(40, W - 40);
      y = -20;
    } else if (w.from === 'left') {
      x = -20; y = Utils.rndRange(40, 200);
    } else if (w.from === 'right') {
      x = W + 20; y = Utils.rndRange(40, 200);
    } else {
      x = Utils.rndRange(40, W - 40);
      y = -20;
    }

    // 阵型
    if (w.pattern === 'line' && w.count > 1 && this.spawned % w.count !== w.count - 1) {
      // 等距排列（已被 interval 处理，这里仅调整 x）
      // 简化：每个 enemy 在中部分布
      const slot = this.spawned % w.count;
      const center = W / 2;
      const spread = Math.min(w.count * 30, W - 80);
      x = center - spread / 2 + slot * (spread / Math.max(1, w.count - 1));
    }

    const e = new Enemy(type, x, y, {
      pattern: w.pattern || 'line',
      dropGuaranteed: w.dropGuaranteed || null,
      targetY: type === 'arc' || type === 'elite' ? Utils.rndRange(80, 180) : 0,
      amp: Utils.rndRange(60, 120),
      freq: Utils.rndRange(1.0, 2.0),
    });
    // 难度缩放（闯关重玩递增）
    if (Game.scaleEnemy) Game.scaleEnemy(e);
    Game.enemies.push(e);
    this.spawned++;
  },

  // 用于关卡开始前预估敌人总数
  getTotalEnemies() {
    return this.totalEnemies;
  },
};
