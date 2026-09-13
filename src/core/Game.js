// ====== src/core/Game.js ======
// 全局游戏对象：状态机、实体集合、流程调度
// 支持双模式：闯关模式 (stage) / 无尽模式 (endless)

const Game = {
  // 状态：title / stage_intro / play / pause / stage_clear / endless_clear / game_over
  state: 'title',
  // 模式：'stage' / 'endless'
  mode: 'stage',
  canvas: null,
  player: null,
  enemies: [],
  boss: null,
  pickups: [],
  particles: ParticleSystem,
  score: ScoreSystem,
  audio: AudioSystem,
  hud: HUD,
  bossUI: BossUI,
  // 生成器：根据模式切换
  spawner: Spawner,            // 闯关模式
  spawnerEndless: SpawnerEndless, // 无尽模式
  effects: Effects,
  background: Background,
  renderer: Renderer,
  input: Input,
  save: SaveSystem,
  stats: Stats,
  achievements: Achievements,
  progress: ProgressSystem,
  // 关卡
  currentStage: 0,       // 1-based
  stageKey: null,         // 当前关卡键名
  stageData: null,
  totalScore: 0,
  coinsRun: 0,            // 本局已获得金币
  // 时间
  lastTime: 0,
  accumulator: 0,
  // 暂存玩家状态用于跨关继承
  playerSnapshot: null,
  // 当前所用生成器引用（update 时用）
  _activeSpawner: null,
  // 难度倍率（闯关重玩递增）
  _difficultyMult: { hp: 1, speed: 1 },

  init(canvas) {
    this.canvas = canvas;
    Renderer.init(canvas);
    Input.init(canvas);
    Effects.init();
    Menu.init();
    PlayerBulletPool.init();
    EnemyBulletPool.init();
    ParticleSystem.init();
    AudioSystem.init();
    Background.init();
    BossUI.init && BossUI.init();
    Achievements.init();
    ProgressSystem.init();
    SaveSystem.getAll(); // 预加载存档

    // 事件：点击/按键解锁音频
    const unlockAudio = () => {
      AudioSystem.resume();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this.state = 'title';
    this.mode = 'stage';
    Menu.showTitle();
  },

  // ===== 金币 =====
  addCoins(n) {
    if (!n) return;
    this.coinsRun += n;
    if (this.save) this.save.addCoins(n);
  },

  // ===== 状态切换：闯关 =====
  startGame() {
    // 兼容旧入口：默认闯关从第 1 关
    this.startStageMode();
  },

  startStageMode() {
    this.mode = 'stage';
    this.currentStage = 0;
    this.totalScore = 0;
    this.coinsRun = 0;
    this.playerSnapshot = null;
    this._dailyPlane = null;
    ScoreSystem.setMult(1, 1);
    // 消耗品：临时护盾（本局开局生效一次）
    this._shieldPending = SaveSystem.useConsumable('shield_token');
    SaveSystem.incStagePlayCount();
    this._applyDifficultyScaling();
    Menu.hide();
    this.nextStage();
  },

  // 关卡选择：从指定关卡开始（需已解锁）
  startStageAt(stageKey) {
    if (!SaveSystem.isStageUnlocked(stageKey)) return;
    this.mode = 'stage';
    this.stageKey = stageKey;
    // 找到 stage 在 stages 数组中的位置
    const idx = WavesData.stages.indexOf(stageKey);
    this.currentStage = idx;   // nextStage 会 +1
    this.totalScore = 0;
    this.coinsRun = 0;
    this.playerSnapshot = null;
    this._dailyPlane = null;
    ScoreSystem.setMult(1, 1);
    // 消耗品：临时护盾（本局开局生效一次）
    this._shieldPending = SaveSystem.useConsumable('shield_token');
    this._applyDifficultyScaling();
    Menu.hide();
    this.nextStage();
  },

  nextStage() {
    this.currentStage++;
    if (this.currentStage > WavesData.stages.length) {
      // 全通关：提交排行榜战绩
      SaveSystem.setClearedAll();
      this.lastRank = SaveSystem.submitLeaderboard({
        score: this.totalScore + ScoreSystem.score,
        kills: Stats.kills || 0,
        mode: 'stage',
        stage: 'ALL CLEAR',
        date: SaveSystem.todayStr(),
      });
      Achievements.checkAll();
      this.state = 'title';
      this._clearStage();
      Menu.showTitle();
      return;
    }
    Menu.hide();
    const key = WavesData.stages[this.currentStage - 1];
    this.stageKey = key;
    this._startStage(WavesData[key]);
  },

  // ===== 状态切换：无尽 =====
  startEndlessMode() {
    this.mode = 'endless';
    this.totalScore = 0;
    this.coinsRun = 0;
    this.playerSnapshot = null;
    this._dailyPlane = null;
    ScoreSystem.setMult(1, 1);
    // 消耗品：临时护盾（本局开局生效一次）
    this._shieldPending = SaveSystem.useConsumable('shield_token');
    SaveSystem.incEndlessPlayCount();
    Menu.hide();
    this._startEndless();
  },

  // ===== 每日挑战 =====
  // 由日期种子决定固定战机 + 随机词条（score2 得分x2 / coin2 金币x2 / bomb1 初始炸弹1）
  dailyConfig() {
    const date = SaveSystem.todayStr();
    let h = 0;
    for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
    const plane = Planes.allKeys[h % Planes.allKeys.length];
    const modPool = ['score2', 'coin2', 'bomb1'];
    const mods = [modPool[h % 3], modPool[(h >> 3) % 3]].filter((v, i, a) => a.indexOf(v) === i);
    return { date, plane, mods };
  },

  startDailyMode() {
    const cfg = this.dailyConfig();
    this.mode = 'daily';
    this.totalScore = 0;
    this.coinsRun = 0;
    this.playerSnapshot = null;
    this._dailyPlane = cfg.plane;
    // 词条倍率
    let mult = 1, coinMult = 1;
    for (const m of cfg.mods) {
      if (m === 'score2') mult *= 2;
      if (m === 'coin2') coinMult *= 2;
    }
    ScoreSystem.setMult(mult, coinMult);
    this._dailyMods = cfg.mods;
    // 消耗品：临时护盾（本局开局生效一次）
    this._shieldPending = SaveSystem.useConsumable('shield_token');
    Menu.hide();
    this._startEndless();
  },

  _startEndless() {
    this._clearStage();
    Background.init();
    PlayerBulletPool.clear();
    EnemyBulletPool.clear();
    ParticleSystem.clear();

    // 玩家：无尽模式从头开始（每日挑战用当日固定战机）
    const planeKey = this._dailyPlane || SaveSystem.getSelectedPlane();
    this.player = new Player(Balance.width / 2, Balance.height - 100, planeKey);
    if (this._dailyMods && this._dailyMods.includes('bomb1')) {
      this.player.bombs = 1;
    }
    this.player.invincible = 1.5;

    this.enemies = [];
    this.boss = null;
    this.pickups = [];
    BossUI.clear();

    SpawnerEndless.start();
    ScoreSystem.reset();
    ScoreSystem.startStage(0); // 无尽无总敌人数
    ProgressSystem.startEndless();

    Stats.reset('endless');
    this._activeSpawner = SpawnerEndless;

    // 入场提示
    this.state = 'stage_intro';
    this._stageIntroTimer = 1.5;
    this._showStageIntro({
      stage: this.mode === 'daily' ? 'DAILY' : 'ENDLESS',
      background: this.mode === 'daily' ? '每日挑战' : 'NEON ABYSS',
    });
  },

  // ===== 通用：重启 / 返回 =====
  restart() {
    Menu.hide();
    if (this.mode === 'daily') {
      this.startDailyMode();  // 每日挑战重启保持当日配置
    } else if (this.mode === 'endless') {
      this._startEndless();
    } else if (this.stageData) {
      // 闯关：重新开始当前关（保持跨关继承快照）
      this._startStage(this.stageData);
    }
  },

  toTitle() {
    Menu.hide();
    this.state = 'title';
    this._clearStage();
    this.playerSnapshot = null;
    this.totalScore = 0;
    ProgressSystem.hide();
    Menu.showTitle();
  },

  resumeGame() {
    Menu.hide();
    this.state = 'play';
  },

  pauseGame() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    Menu.showPause();
  },

  // ===== 关卡启动：闯关 =====
  _startStage(stageData) {
    this.stageData = stageData;
    this._clearStage();
    Background.init();
    PlayerBulletPool.clear();
    EnemyBulletPool.clear();
    ParticleSystem.clear();

    // 玩家：跨关继承
    const planeKey = SaveSystem.getSelectedPlane();
    this.player = new Player(Balance.width / 2, Balance.height - 100, planeKey);
    if (this.playerSnapshot) {
      this.player.weapon = this.playerSnapshot.weapon;
      this.player.weapon.level = Math.max(1, this.player.weapon.level);
      this.player.bombs = this.playerSnapshot.bombs;
      this.player.hp = this.playerSnapshot.hp;
      // 僚机不继承
    }
    this.player.invincible = 1.5;

    this.enemies = [];
    this.boss = null;
    this.pickups = [];
    BossUI.clear();

    Spawner.start(stageData);
    ScoreSystem.reset();
    ScoreSystem.startStage(Spawner.getTotalEnemies());
    ProgressSystem.startStage(Spawner.getTotalEnemies());

    Stats.reset('stage');
    this._activeSpawner = Spawner;

    // 关卡入场提示
    this.state = 'stage_intro';
    this._stageIntroTimer = 1.5;
    this._showStageIntro(stageData);
  },

  _showStageIntro(stageData) {
    Menu.show(
      `STAGE ${stageData.stage}`,
      stageData.background.toUpperCase().replace('_', ' '),
      '',
      [{ label: 'GO', onClick: () => { Menu.hide(); this.state = 'play'; } }]
    );
  },

  _clearStage() {
    this.enemies = [];
    this.boss = null;
    this.pickups = [];
    PlayerBulletPool.clear();
    EnemyBulletPool.clear();
    ParticleSystem.clear();
    BossUI.clear();
    this._activeSpawner = null;
  },

  // ===== 难度递增（闯关重玩）=====
  _applyDifficultyScaling() {
    const sc = Balance.stageScaling;
    const clears = SaveSystem.getStagePlayCount();
    const hpMult = Math.min(sc.maxHpMult, 1 + clears * sc.hpPerClear);
    const speedMult = Math.min(sc.maxSpeedMult, 1 + clears * sc.speedPerClear);
    this._difficultyMult = { hp: hpMult, speed: speedMult };
  },

  // 应用到敌人（在 Enemy 构造后由 Spawner 调用本钩子）
  scaleEnemy(e) {
    if (this.mode !== 'stage') return;
    const cfg = Balance.enemy[e.type] || Balance.enemy.grunt;
    e.maxHp = Math.max(1, Math.round(cfg.hp * this._difficultyMult.hp));
    e.hp = e.maxHp;
    e.speed = cfg.speed * this._difficultyMult.speed;
  },

  // ===== Boss 生成 =====
  // 闯关：spawnBoss(bossKey) 从 BossesData 取
  // 无尽：spawnBoss(undefined, cfg, endlessKey) 使用克隆配置
  spawnBoss(bossKey, cfg, endlessKey) {
    let config;
    if (cfg) {
      config = cfg;
    } else {
      config = BossesData[bossKey];
      if (!config) return;
    }
    this.boss = new Boss(config);
    this.boss._endlessKey = endlessKey || bossKey;
    BossUI.setBoss(this.boss);
    Effects.triggerBossWarning(1.8);
    if (this.audio) this.audio.play('warning');
  },

  onBossDefeated(boss) {
    this.boss = null;
    BossUI.clear();
    EnemyBulletPool.clearAll();
    Stats.onBossKill();
    Achievements.checkAll();

    if (this.mode === 'endless') {
      // 无尽：Boss 死后继续，给奖励，清场敌弹
      ScoreSystem.addScore(5000);
      // Boss 金币奖励
      this.addCoins(Balance.coin.boss);
      // 掉落道具
      this._dropEndlessReward(boss);
      // 进度条重置（进入下一个循环）
      ProgressSystem.onBossDefeated();
      setTimeout(() => { ProgressSystem.percent = 0; }, 800);
      // 状态回到 play（不切结算）
      this.state = 'play';
      if (Game.particles) Game.particles.spawnText(Balance.width / 2, Balance.height / 2, 'BOSS DOWN!', '#ffaa00');
      return;
    }

    // 闯关：计算星级 + 结算
    const perfectBoss = boss.perfectStage && !this.player.tookDamageThisStage;
    const stars = ScoreSystem.computeStars(this.stageData, perfectBoss);
    this.totalScore += ScoreSystem.score;
    // Boss 击杀 + 通关金币奖励
    this.addCoins(Balance.coin.boss + Balance.coin.stageClearBonus);
    // 保存星级与最高分
    SaveSystem.setStageStars(this.stageKey, stars);
    SaveSystem.setStageBestScore(this.stageKey, ScoreSystem.score);
    // 解锁下一关
    const idx = WavesData.stages.indexOf(this.stageKey);
    if (idx >= 0 && idx + 1 < WavesData.stages.length) {
      SaveSystem.unlockStage(WavesData.stages[idx + 1]);
    }
    if (this.currentStage >= WavesData.stages.length) {
      SaveSystem.setClearedAll();
    }
    Achievements.checkAll();

    // 持久化玩家状态
    this.playerSnapshot = {
      weapon: this.player.weapon,
      bombs: this.player.bombs,
      hp: this.player.hp,
    };
    this.state = 'stage_clear';
    ProgressSystem.onBossDefeated();
    const self = this;
    setTimeout(() => {
      // 通关进入下一关：播放激昂胜利旋律
      if (self.audio) self.audio.play('victory_melody');
      // Boss 专属胜利语音（爷们牛逼 / 牛来 / 胆子真是肥嘟嘟的）
      if (self.audio) self.audio.bossVictory(boss);
      // 播放胜利 CG 动画，结束后显示结算
      Effects.playCG('victory', {
        playerColor: self.player.color,
        title: 'STAGE CLEAR',
        subtitle: `STAGE ${self.currentStage} PASSED`,
        onComplete: () => Menu.showStageClear(stars, self.totalScore),
      });
    }, 800);
  },

  _dropEndlessReward(boss) {
    // Boss 死亡位置掉落多个道具
    if (!Game.pickups) return;
    const drops = ['P', 'energy', 'bomb', 'shield'];
    for (let i = 0; i < drops.length; i++) {
      const p = new Pickup(boss.x + Utils.rndRange(-30, 30), boss.y + 20, drops[i]);
      p.vy = 80 + i * 20;
      Game.pickups.push(p);
    }
  },

  onPlayerDeath() {
    this.state = 'game_over';
    ProgressSystem.hide();
    // 本局统计同步
    Stats.update(0);
    Stats.end();
    Achievements.checkAll();

    const finalScore = this.totalScore + ScoreSystem.score;
    if (this.mode === 'endless') {
      // 保存无尽最高分
      SaveSystem.updateEndlessBest(
        finalScore,
        Stats.playTime,
        Stats.kills,
        Stats.wave
      );
      Achievements.checkAll();
    }
    // 每日挑战：更新当日最高分
    if (this.mode === 'daily') {
      this._dailyNewRecord = SaveSystem.updateDailyBest(finalScore);
      Achievements.checkAll();
    }
    // 排行榜：提交本局战绩
    this.lastRank = SaveSystem.submitLeaderboard({
      score: finalScore,
      kills: Stats.kills || 0,
      mode: this.mode,
      stage: this.mode === 'stage' ? (this.stageKey || '') : (Stats.wave ? 'W' + Stats.wave : ''),
      date: SaveSystem.todayStr(),
    });
    // 播放失败 CG 动画，结束后显示结算
    const self = this;
    Effects.playCG('defeat', {
      playerColor: this.player ? this.player.color : '#00f0ff',
      title: 'GAME OVER',
      subtitle: this.mode === 'daily' ? 'DAILY FAILED'
        : this.mode === 'endless' ? 'ENDLESS FAILED' : 'STAGE FAILED',
      onComplete: () => Menu.showGameOver(),
    });
  },

  // ===== 工具：寻找最近敌人（homing 用） =====
  findNearestEnemy(x, y, maxRange = 600) {
    let nearest = null;
    let minD = maxRange * maxRange;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const d = Utils.dist2(x, y, e.x, e.y);
      if (d < minD) { minD = d; nearest = e; }
    }
    if (this.boss && this.boss.alive && this.boss.state === 'fight') {
      // 优先 Boss 核心
      const d = Utils.dist2(x, y, this.boss.x, this.boss.y);
      if (d < minD) { minD = d; nearest = this.boss; }
    }
    return nearest;
  },

  // ===== 主更新 =====
  update(dt) {
    Input.update();
    Achievements.update(dt);

    // 暂停切换
    if (Input.actions.pause) {
      if (this.state === 'play') this.pauseGame();
      else if (this.state === 'pause') this.resumeGame();
    }

    if (this.state === 'stage_intro') {
      this._stageIntroTimer -= dt;
      Background.update(dt);
      Effects.update(dt);
      if (this._stageIntroTimer <= 0) {
        Menu.hide();
        this.state = 'play';
      }
      Input.clearFrameActions();
      return;
    }

    if (this.state !== 'play') {
      // 暂停/结算时仍渲染但不更新实体
      Background.update(dt);
      Effects.update(dt);
      Input.clearFrameActions();
      return;
    }

    // ===== play 状态 =====
    Background.update(dt);
    Effects.update(dt);
    BossUI.update(dt);
    Stats.update(dt);

    // 玩家死亡倒计时处理（避免 setTimeout 跨重启污染）
    if (this.player && !this.player.alive && this.player.deathTimer !== undefined && this.player.deathTimer !== null) {
      this.player.deathTimer -= dt;
      if (this.player.deathTimer <= 0) {
        this.player.deathTimer = null;
        this.onPlayerDeath();
        Input.clearFrameActions();
        return;
      }
    }

    // 玩家
    if (this.player) this.player.update(dt);

    // 敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.dead) this.enemies.splice(i, 1);
    }

    // Boss
    if (this.boss) this.boss.update(dt);
    if (this.boss && this.boss.dead) {
      // 死亡动画在 Boss._die 中处理，最终 onBossDefeated 触发
    }

    // 道具
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(dt);
      if (pk.dead) this.pickups.splice(i, 1);
    }

    // 子弹
    PlayerBulletPool.update(dt);
    EnemyBulletPool.update(dt);

    // 粒子
    ParticleSystem.update(dt);

    // 分数系统
    ScoreSystem.update(dt);
    // 同步分数与连击到统计（stage 模式累加跨关 totalScore）
    Stats.score = (this.totalScore || 0) + ScoreSystem.score;
    Stats.onCombo(ScoreSystem.combo);

    // 生成器（根据模式）
    if (this._activeSpawner) this._activeSpawner.update(dt);

    // 进度条更新
    ProgressSystem.update(dt);

    // 碰撞
    Collision.detect();

    // 清空瞬时输入
    Input.clearFrameActions();
  },

  // 主绘制
  draw(time) {
    Renderer.draw(time);
  },
};
