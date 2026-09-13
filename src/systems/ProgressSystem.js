// ====== src/systems/ProgressSystem.js ======
// 关卡进度条：实时反映击杀进度，击败 Boss/小怪时平滑更新

const ProgressSystem = {
  el: null,        // 进度条容器
  fillEl: null,    // 填充条
  percentEl: null, // 百分比文字
  killsEl: null,   // 击杀数
  totalEl: null,   // 总数
  percent: 0,      // 当前百分比
  _smoothed: 0,    // 平滑显示值（用于数字缓动）

  init() {
    this.el = document.getElementById('stage-progress');
    this.fillEl = document.getElementById('sp-fill');
    this.percentEl = this.el ? this.el.querySelector('.sp-percent') : null;
    this.killsEl = document.getElementById('sp-kills');
    this.totalEl = document.getElementById('sp-total');
    this.percent = 0;
    this._smoothed = 0;
  },

  // 关卡开始：重置并显示
  startStage(totalEnemies) {
    this.percent = 0;
    this._smoothed = 0;
    if (this.el) this.el.classList.remove('hidden');
    if (this.totalEl) this.totalEl.textContent = totalEnemies || 0;
    this._apply(0, 0);
  },

  // 无尽模式开始：按时间/波次计进度
  startEndless() {
    this.percent = 0;
    this._smoothed = 0;
    if (this.el) this.el.classList.remove('hidden');
    if (this.totalEl) this.totalEl.textContent = '∞';
    this._apply(0, 0);
  },

  // 隐藏（菜单/结算时）
  hide() {
    if (this.el) this.el.classList.add('hidden');
  },

  // 每帧更新
  update(dt) {
    if (!this.el || this.el.classList.contains('hidden')) return;

    let kills, total;
    if (Game.mode === 'endless') {
      // 无尽模式：按存活时间计算（每 90 秒一个循环，对应一个 Boss）
      const cycle = 90;
      const elapsed = Game.score ? Game.score.stageTime : 0;
      const cycleProgress = (elapsed % cycle) / cycle;
      this.percent = Math.min(100, cycleProgress * 100);
      kills = Game.score ? Game.score.kills : 0;
      this._apply(this.percent, kills);
    } else {
      // 闯关模式：击杀数 / 总敌人数
      kills = Game.score ? Game.score.kills : 0;
      total = Game.score ? Game.score.totalEnemies : 0;
      if (total > 0) {
        this.percent = Math.min(100, (kills / total) * 100);
      }
      // Boss 已被击败 → 100%
      if (Game.state === 'stage_clear') {
        this.percent = 100;
      }
      this._apply(this.percent, kills);
    }

    // 数字平滑缓动
    this._smoothed += (this.percent - this._smoothed) * Math.min(1, dt * 6);
    if (this.percentEl) {
      this.percentEl.textContent = Math.round(this._smoothed) + '%';
    }
  },

  _apply(percent, kills) {
    if (this.fillEl) {
      this.fillEl.style.width = percent.toFixed(1) + '%';
    }
    if (this.killsEl) {
      this.killsEl.textContent = kills;
    }
  },

  // Boss 被击败：直接拉满
  onBossDefeated() {
    this.percent = 100;
    this._apply(100, Game.score ? Game.score.kills : 0);
  },
};
