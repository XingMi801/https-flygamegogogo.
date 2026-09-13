// ====== src/systems/ScoreSystem.js ======
// 分数、连击、星级

const ScoreSystem = {
  score: 0,
  combo: 0,             // 连续击杀数
  comboMultiplier: 1,
  comboTimer: 0,
  maxMultiplier: Balance.combo.maxMultiplier,
  kills: 0,
  escaped: 0,
  grazeCount: 0,
  totalEnemies: 0,      // 关卡总敌人数（用于全灭判定）
  stageTime: 0,
  stageStartTime: 0,
  tookDamage: false,    // 关卡是否受过伤
  mult: 1,              // 全局得分倍率（每日挑战词条）
  coinMult: 1,          // 全局金币倍率

  reset() {
    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.escaped = 0;
    this.grazeCount = 0;
    this.tookDamage = false;
    this.stageStartTime = performance.now() / 1000;
    this.stageTime = 0;
  },

  // 局开始时设置倍率（不影响跨关 reset）
  setMult(mult, coinMult) {
    this.mult = mult || 1;
    this.coinMult = coinMult || 1;
  },

  // 关卡开始时调用，传入总敌人数（包含 Boss）
  startStage(totalEnemies) {
    this.totalEnemies = totalEnemies || 0;
    this.kills = 0;
    this.escaped = 0;
    this.grazeCount = 0;
    this.tookDamage = false;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.stageStartTime = performance.now() / 1000;
  },

  update(dt) {
    this.stageTime = performance.now() / 1000 - this.stageStartTime;
    // 连击计时
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
      }
    }
  },

  addKill(enemy) {
    this.kills++;
    this.combo++;
    if (this.combo > 1) {
      this.comboMultiplier = Math.min(this.maxMultiplier, this.combo);
    }
    this.comboTimer = Balance.combo.graceTime;
    const gain = Math.floor(enemy.scoreValue * this.comboMultiplier * this.mult);
    this.score += gain;
    if (Game.particles) {
      Game.particles.spawnText(enemy.x, enemy.y, '+' + gain, '#00f0ff');
    }
    // 金币奖励
    if (Game.addCoins) {
      const cr = Balance.coin ? Balance.coin.rewards[enemy.type] : 0;
      const base = cr !== undefined ? cr : (Balance.coin ? Balance.coin.defaultReward : 0);
      Game.addCoins(Math.round(base * this.coinMult));
    }
    // 同步到数据统计
    if (Game.stats) Game.stats.onKill(enemy);
  },

  addScore(amount) {
    this.score += amount;
  },

  addGraze() {
    this.grazeCount++;
    this.score += Balance.combo.grazeScore;
    if (Game.stats) Game.stats.onGraze();
  },

  markEscaped(enemy) {
    this.escaped++;
    // 不重置连击（已飞走的不算中断）
  },

  breakCombo() {
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.tookDamage = true;
  },

  // 关卡结束判定星级
  computeStars(stageData, bossPerfect) {
    const stars = [];
    // 1. 无伤
    stars.push(!this.tookDamage);
    // 2. 全灭（无逃逸即可视为全灭，bomber 自爆不算玩家击杀但也不算逃逸）
    stars.push(this.escaped === 0);
    // 3. 限时
    stars.push(this.stageTime <= stageData.duration);
    // 4. Boss 完美
    stars.push(!!bossPerfect);
    return stars;
  },
};
