// ====== src/systems/Achievements.js ======
// 成就系统：定义 + 解锁检测 + 解锁提示 toast
// 在事件触发时由 Game/Stats 调用 check()

const Achievements = {
  // 成就定义表
  // check(stats, game) 返回 true 表示达成
  list: [
    { id: 'first_clear',    name: '初次通关',   desc: '通关第 1 关',           icon: '★',
      check: (s) => SaveSystem.getStageStars('stage1').some(x => x) },
    { id: 'clear_all',      name: '霓虹征服者', desc: '通关全部关卡',           icon: '✦',
      check: (s) => SaveSystem.getAll().stage.clearedAll },
    { id: 'graze_100',       name: '擦弹大师',   desc: '累计擦弹 100 次',        icon: '◇',
      check: (s) => SaveSystem.getStats().totalGraze >= 100 },
    { id: 'graze_500',       name: '光速行者',   desc: '累计擦弹 500 次',        icon: '◈',
      check: (s) => SaveSystem.getStats().totalGraze >= 500 },
    { id: 'endless_5k',      name: '无尽先锋',   desc: '无尽模式得分 5000',      icon: '◉',
      check: (s) => SaveSystem.getEndlessBest().bestScore >= 5000 },
    { id: 'endless_20k',     name: '深渊行者',   desc: '无尽模式得分 20000',     icon: '◎',
      check: (s) => SaveSystem.getEndlessBest().bestScore >= 20000 },
    { id: 'endless_wave10',  name: '永夜续航',   desc: '无尽到达第 10 波',       icon: '▦',
      check: (s) => SaveSystem.getEndlessBest().bestWave >= 10 },
    { id: 'kills_500',       name: '老兵',       desc: '累计击杀 500',           icon: '✕',
      check: (s) => SaveSystem.getStats().totalKills >= 500 },
    { id: 'kills_2000',      name: '歼灭者',     desc: '累计击杀 2000',          icon: '☠',
      check: (s) => SaveSystem.getStats().totalKills >= 2000 },
    { id: 'combo_50',        name: '连击之王',   desc: '单局达成 50 连击',        icon: '⚡',
      check: (s) => SaveSystem.getStats().maxCombo >= 50 },
    { id: 'boss_5',          name: '弑神者',     desc: '累计击败 5 个 Boss',     icon: '♛',
      check: (s) => SaveSystem.getStats().totalBossKills >= 5 },
    { id: 'no_damage_stage', name: '完美无瑕',   desc: '任一关卡无伤通关',        icon: '✧',
      check: (s) => {
        const st = SaveSystem.getAll().stage.stars;
        for (const k in st) { if (st[k][0]) return true; }
        return false;
      } },
    { id: 'all_stars',       name: '霓虹至高',   desc: '集齐全部关卡 4 星',       icon: '✪',
      check: (s) => {
        const st = SaveSystem.getAll().stage.stars;
        for (const k in st) { if (st[k].some(x => !x)) return false; }
        return Object.keys(st).length > 0;
      } },
    // ---- 经济 / 商店 / 收集扩展 ----
    { id: 'coins_1k',        name: '掘金者',     desc: '累计获得 1000 金币',      icon: '◈',
      check: (s) => SaveSystem.getCoinsEarnedTotal() >= 1000 },
    { id: 'coins_10k',       name: '金币雨',     desc: '累计获得 10000 金币',     icon: '❋',
      check: (s) => SaveSystem.getCoinsEarnedTotal() >= 10000 },
    { id: 'arms_dealer',     name: '军火商',     desc: '购买任一永久强化',        icon: '⚒',
      check: (s) => SaveSystem.getOwnedItems().length >= 1 },
    { id: 'full_load',       name: '满配大师',   desc: '买齐全部 6 件永久强化',    icon: '✦',
      check: (s) => SaveSystem.getOwnedItems().length >= ShopData.allKeys.length },
    { id: 'stage4_clear',    name: '深渊突破',   desc: '通关第 4 关',             icon: '★',
      check: (s) => SaveSystem.getStageStars('stage4').some(x => x) },
    { id: 'wave_15',         name: '永夜之主',   desc: '无尽到达第 15 波',        icon: '▦',
      check: (s) => SaveSystem.getEndlessBest().bestWave >= 15 },
    { id: 'plane_all',       name: '战机收藏家', desc: '解锁全部 6 架战机',       icon: '✈',
      check: (s) => Planes.allKeys.every(k => Planes.isUnlocked(k)) },
    { id: 'daily_5k',        name: '日报之星',   desc: '每日挑战得分 5000',       icon: '✥',
      check: (s) => SaveSystem.getDailyBest() >= 5000 },
    { id: 'boss_15',         name: '屠神者',     desc: '累计击败 15 个 Boss',    icon: '♟',
      check: (s) => SaveSystem.getStats().totalBossKills >= 15 },
  ],

  _toastQueue: [],
  _toastEl: null,
  _toastTimer: 0,

  init() {
    // 创建 toast 容器（由 Menu/DOM 提供），此处只缓存引用
    this._toastEl = document.getElementById('achievement-toast') || this._createToast();
  },

  _createToast() {
    const el = document.createElement('div');
    el.id = 'achievement-toast';
    el.className = 'ach-toast hidden';
    document.getElementById('game-wrap').appendChild(el);
    return el;
  },

  // 遍历所有未解锁成就，达成则解锁并弹 toast
  checkAll() {
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      if (SaveSystem.isAchievementUnlocked(a.id)) continue;
      let ok = false;
      try { ok = a.check(); } catch (e) { ok = false; }
      if (ok) {
        SaveSystem.unlockAchievement(a.id);
        this._enqueue(a);
      }
    }
  },

  _enqueue(a) {
    this._toastQueue.push(a);
    if (this._toastQueue.length === 1) this._showNext();
  },

  _showNext() {
    if (this._toastQueue.length === 0) return;
    const a = this._toastQueue[0];
    if (!this._toastEl) this.init();
    this._toastEl.innerHTML =
      `<div class="ach-icon">${a.icon}</div>
       <div class="ach-text">
         <div class="ach-label">ACHIEVEMENT UNLOCKED</div>
         <div class="ach-name">${a.name}</div>
         <div class="ach-desc">${a.desc}</div>
       </div>`;
    this._toastEl.classList.remove('hidden');
    this._toastEl.classList.add('show');
    if (Game.audio) Game.audio.play('toggle');
    this._toastTimer = 3.0;
  },

  update(dt) {
    if (this._toastQueue.length === 0) return;
    this._toastTimer -= dt;
    if (this._toastTimer <= 0) {
      this._toastEl.classList.remove('show');
      this._toastEl.classList.add('hidden');
      this._toastQueue.shift();
      const self = this;
      setTimeout(() => self._showNext(), 200);
    }
  },

  // 统计已解锁数量
  countUnlocked() {
    let n = 0;
    for (let i = 0; i < this.list.length; i++) {
      if (SaveSystem.isAchievementUnlocked(this.list[i].id)) n++;
    }
    return n;
  },
  total() { return this.list.length; },
};
