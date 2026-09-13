// ====== src/systems/SaveSystem.js ======
// localStorage 持久化封装：闯关进度 / 无尽最高分 / 成就 / 统计
// 独立于游戏运行时，仅做读写

const SaveSystem = {
  KEY: 'neon_abyss_save_v1',

  // 默认存档结构
  _default() {
    return {
      version: 1,
      // 金币（武器商店货币）
      coins: 0,
      // 累计获得金币（只增不减，用于解锁）
      coinsEarnedTotal: 0,
      // 武器商店：已购永久强化 + 消耗品库存
      shop: {
        owned: [],
        consumables: {
          shield_token: 0,
          revive_token: 0,
        },
      },
      // 每日挑战：日期 + 当日最高分
      daily: {
        date: '',
        bestScore: 0,
      },
      // 本地排行榜（Top 8）
      leaderboard: [],
      // 闯关模式
      stage: {
        unlockedStages: ['stage1'],          // 已解锁关卡键名
        stars: {                              // 每关星级 [bool,bool,bool,bool]
          stage1: [false, false, false, false],
          stage2: [false, false, false, false],
          stage3: [false, false, false, false],
          stage4: [false, false, false, false],
        },
        bestStageScore: { stage1: 0, stage2: 0, stage3: 0, stage4: 0 },
        clearedAll: false,
        playCount: 0,                         // 闯关总次数（用于难度递增参考）
      },
      // 当前选中战机
      selectedPlane: 'pioneer',
      // 无尽模式
      endless: {
        bestScore: 0,
        bestTime: 0,
        bestKills: 0,
        bestWave: 0,
        playCount: 0,
      },
      // 成就
      achievements: {
        unlocked: [],                          // 已解锁 id 列表
      },
      // 全局统计
      stats: {
        totalKills: 0,
        totalScore: 0,
        totalPlayTime: 0,                       // 秒
        maxCombo: 0,
        totalGraze: 0,
        totalBombs: 0,
        totalBossKills: 0,
        totalRuns: 0,                           // 总局数
        stageClears: 0,
        endlessRuns: 0,
      },
    };
  },

  _cache: null,

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) {
        this._cache = this._default();
        return this._cache;
      }
      const data = JSON.parse(raw);
      // 兼容性：合并默认字段
      const def = this._default();
      this._cache = this._merge(def, data);
      return this._cache;
    } catch (e) {
      this._cache = this._default();
      return this._cache;
    }
  },

  // 浅层合并（仅一层对象）
  _merge(def, data) {
    const out = {};
    for (const k in def) {
      if (typeof def[k] === 'object' && def[k] !== null && !Array.isArray(def[k])) {
        out[k] = this._merge(def[k], data[k] || {});
      } else {
        out[k] = data[k] !== undefined ? data[k] : def[k];
      }
    }
    return out;
  },

  _save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this._cache));
    } catch (e) {
      // 配额满或隐私模式，忽略
    }
  },

  // ===== 通用 =====
  getAll() { return this._load(); },
  save() { this._save(); },
  reset() {
    this._cache = this._default();
    this._save();
  },

  // ===== 闯关 =====
  isStageUnlocked(key) {
    return this._load().stage.unlockedStages.indexOf(key) >= 0;
  },
  unlockStage(key) {
    const d = this._load();
    if (d.stage.unlockedStages.indexOf(key) < 0) {
      d.stage.unlockedStages.push(key);
      this._save();
    }
  },
  getStageStars(key) {
    return this._load().stage.stars[key] || [false, false, false, false];
  },
  setStageStars(key, stars) {
    const d = this._load();
    const cur = d.stage.stars[key] || [false, false, false, false];
    let changed = false;
    for (let i = 0; i < cur.length; i++) {
      if (stars[i] && !cur[i]) { cur[i] = true; changed = true; }
    }
    d.stage.stars[key] = cur;
    if (changed) this._save();
  },
  getStageBestScore(key) {
    return this._load().stage.bestStageScore[key] || 0;
  },
  setStageBestScore(key, score) {
    const d = this._load();
    if (score > (d.stage.bestStageScore[key] || 0)) {
      d.stage.bestStageScore[key] = score;
      this._save();
    }
  },
  setClearedAll() {
    const d = this._load();
    d.stage.clearedAll = true;
    this._save();
  },
  incStagePlayCount() {
    const d = this._load();
    d.stage.playCount = (d.stage.playCount || 0) + 1;
    this._save();
    return d.stage.playCount;
  },
  getStagePlayCount() {
    return this._load().stage.playCount || 0;
  },

  // ===== 无尽 =====
  getEndlessBest() {
    return this._load().endless;
  },
  updateEndlessBest(score, time, kills, wave) {
    const d = this._load();
    let changed = false;
    if (score > d.endless.bestScore) { d.endless.bestScore = score; changed = true; }
    if (time > d.endless.bestTime) { d.endless.bestTime = time; changed = true; }
    if (kills > d.endless.bestKills) { d.endless.bestKills = kills; changed = true; }
    if (wave > d.endless.bestWave) { d.endless.bestWave = wave; changed = true; }
    if (changed) this._save();
  },
  incEndlessPlayCount() {
    const d = this._load();
    d.endless.playCount = (d.endless.playCount || 0) + 1;
    this._save();
  },

  // ===== 成就 =====
  isAchievementUnlocked(id) {
    return this._load().achievements.unlocked.indexOf(id) >= 0;
  },
  unlockAchievement(id) {
    const d = this._load();
    if (d.achievements.unlocked.indexOf(id) < 0) {
      d.achievements.unlocked.push(id);
      this._save();
      return true;    // 新解锁
    }
    return false;
  },
  getUnlockedAchievements() {
    return this._load().achievements.unlocked.slice();
  },

  // ===== 金币 =====
  getCoins() {
    return this._load().coins || 0;
  },
  addCoins(n) {
    const d = this._load();
    if (n > 0) d.coinsEarnedTotal = (d.coinsEarnedTotal || 0) + n;
    d.coins = Math.max(0, (d.coins || 0) + (n || 0));
    this._save();
    return d.coins;
  },
  // 消费金币：余额不足返回 false
  spendCoins(n) {
    const d = this._load();
    if ((d.coins || 0) < n) return false;
    d.coins -= n;
    this._save();
    return true;
  },
  getCoinsEarnedTotal() {
    return this._load().coinsEarnedTotal || 0;
  },

  // ===== 武器商店 =====
  isOwned(itemId) {
    const owned = this._load().shop.owned;
    return owned && owned.indexOf(itemId) >= 0;
  },
  // 购买：扣费 + 记录，成功返回 true
  buyItem(itemId, price) {
    if (this.isOwned(itemId)) return false;
    if (!this.spendCoins(price)) return false;
    const d = this._load();
    d.shop.owned.push(itemId);
    this._save();
    return true;
  },
  getOwnedItems() {
    const owned = this._load().shop.owned;
    return owned ? owned.slice() : [];
  },

  // ===== 消耗品 =====
  getConsumableCount(kind) {
    const c = this._load().shop.consumables;
    return (c && c[kind]) || 0;
  },
  // 购买消耗品：扣费 +1 库存，成功返回 true
  buyConsumable(kind, price) {
    if (!this.spendCoins(price)) return false;
    const d = this._load();
    if (!d.shop.consumables) d.shop.consumables = {};
    d.shop.consumables[kind] = (d.shop.consumables[kind] || 0) + 1;
    this._save();
    return true;
  },
  // 使用消耗品：有库存则 -1 并返回 true
  useConsumable(kind) {
    const d = this._load();
    if (!d.shop.consumables || !(d.shop.consumables[kind] > 0)) return false;
    d.shop.consumables[kind]--;
    this._save();
    return true;
  },

  // ===== 每日挑战 =====
  // 返回今日（本地时区）日期串 YYYY-MM-DD
  todayStr() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  },
  getDailyBest() {
    const d = this._load().daily;
    if (!d || d.date !== this.todayStr()) return 0;
    return d.bestScore || 0;
  },
  // 更新当日最高分，返回是否刷新纪录
  updateDailyBest(score) {
    const d = this._load();
    if (!d.daily || d.date !== this.todayStr()) {
      d.daily = { date: this.todayStr(), bestScore: score };
      this._save();
      return true;
    }
    if (score > (d.daily.bestScore || 0)) {
      d.daily.bestScore = score;
      this._save();
      return true;
    }
    return false;
  },

  // ===== 本地排行榜 =====
  getLeaderboard() {
    const lb = this._load().leaderboard;
    return (lb && lb.slice()) || [];
  },
  // 提交一条战绩：{score,kills,mode,stage,date}；返回名次（未上榜返回 0）
  submitLeaderboard(entry) {
    const d = this._load();
    if (!Array.isArray(d.leaderboard)) d.leaderboard = [];
    d.leaderboard.push(entry);
    d.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0));
    if (d.leaderboard.length > 8) d.leaderboard.length = 8;
    this._save();
    const idx = d.leaderboard.indexOf(entry);
    return idx >= 0 ? idx + 1 : 0;
  },

  // ===== 战机 =====
  getSelectedPlane() {
    return this._load().selectedPlane || 'pioneer';
  },
  selectPlane(key) {
    if (!Planes.isUnlocked(key)) return false;
    const d = this._load();
    d.selectedPlane = key;
    this._save();
    return true;
  },

  // ===== 统计 =====
  getStats() {
    return this._load().stats;
  },
  addStat(key, amount) {
    const d = this._load();
    d.stats[key] = (d.stats[key] || 0) + (amount || 0);
    this._save();
  },
  setStatMax(key, value) {
    const d = this._load();
    if (value > (d.stats[key] || 0)) {
      d.stats[key] = value;
      this._save();
    }
  },
};
