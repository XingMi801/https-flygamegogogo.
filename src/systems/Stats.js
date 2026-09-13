// ====== src/systems/Stats.js ======
// 运行时数据统计：累计本次游戏的击杀/分数/时长/连击/擦弹等
// 在事件触发时调用对应方法，结束时统一同步到 SaveSystem

const Stats = {
  // 本局统计（每局开始重置）
  kills: 0,
  score: 0,
  startTime: 0,
  playTime: 0,
  maxCombo: 0,
  graze: 0,
  bombs: 0,
  bossKills: 0,
  wave: 0,             // 无尽模式波次
  // 累计跨局（在 end() 时同步到 SaveSystem）

  reset(mode) {
    this.mode = mode || 'stage';   // 'stage' / 'endless'
    this.kills = 0;
    this.score = 0;
    this.startTime = performance.now() / 1000;
    this.playTime = 0;
    this.maxCombo = 0;
    this.graze = 0;
    this.bombs = 0;
    this.bossKills = 0;
    this.wave = 0;
  },

  update(dt) {
    this.playTime = performance.now() / 1000 - this.startTime;
  },

  // ===== 事件接口 =====
  onKill(enemy) {
    this.kills++;
  },
  onScore(amount) {
    this.score += amount || 0;
  },
  onGraze() {
    this.graze++;
  },
  onBomb() {
    this.bombs++;
  },
  onBossKill() {
    this.bossKills++;
  },
  onCombo(combo) {
    if (combo > this.maxCombo) this.maxCombo = combo;
  },
  onWave(wave) {
    if (wave > this.wave) this.wave = wave;
  },

  // ===== 本局结束：同步到 SaveSystem =====
  end() {
    const s = SaveSystem.getStats();
    SaveSystem.addStat('totalKills', this.kills);
    SaveSystem.addStat('totalScore', this.score);
    SaveSystem.addStat('totalPlayTime', Math.floor(this.playTime));
    SaveSystem.setStatMax('maxCombo', this.maxCombo);
    SaveSystem.addStat('totalGraze', this.graze);
    SaveSystem.addStat('totalBombs', this.bombs);
    SaveSystem.addStat('totalBossKills', this.bossKills);
    SaveSystem.addStat('totalRuns', 1);
    if (this.mode === 'stage') {
      SaveSystem.addStat('stageClears', this.bossKills > 0 ? 1 : 0);
    } else {
      SaveSystem.addStat('endlessRuns', 1);
    }
  },

  // 取本局简报
  summary() {
    return {
      mode: this.mode,
      kills: this.kills,
      score: this.score,
      playTime: this.playTime,
      maxCombo: this.maxCombo,
      graze: this.graze,
      bombs: this.bombs,
      bossKills: this.bossKills,
      wave: this.wave,
    };
  },
};
