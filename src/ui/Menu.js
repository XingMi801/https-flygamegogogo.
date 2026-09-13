// ====== src/ui/Menu.js ======
// 覆盖层菜单：标题 / 模式选择 / 关卡选择 / 成就 / 统计 / 暂停 / 通关 / 失败

const Menu = {
  overlay: null,
  box: null,
  titleEl: null,
  subEl: null,
  statsEl: null,
  buttonsEl: null,
  logoEl: null,

  init() {
    this.overlay = document.getElementById('overlay');
    this.box = document.getElementById('overlay-box');
    this.titleEl = document.getElementById('overlay-title');
    this.subEl = document.getElementById('overlay-sub');
    this.statsEl = document.getElementById('overlay-stats');
    this.buttonsEl = document.getElementById('overlay-buttons');
    this.logoEl = document.getElementById('wavepeak-logo');
  },

  show(title, sub, statsHtml, buttons, showLogo) {
    if (this.logoEl) {
      if (showLogo) this.logoEl.classList.remove('hidden');
      else this.logoEl.classList.add('hidden');
    }
    // 浪尖.jpg 横幅与 Logo 同步（仅标题界面显示）
    this._bannerEl = this._bannerEl || document.getElementById('langjian-banner');
    if (this._bannerEl) {
      if (showLogo) this._bannerEl.classList.remove('hidden');
      else this._bannerEl.classList.add('hidden');
    }
    this.titleEl.textContent = title;
    this.subEl.textContent = sub || '';
    this.statsEl.innerHTML = statsHtml || '';
    this.buttonsEl.innerHTML = '';
    if (buttons && buttons.length) {
      for (const b of buttons) {
        const btn = document.createElement('button');
        btn.className = 'menu-btn' + (b.danger ? ' danger' : '') + (b.accent ? ' accent' : '');
        btn.textContent = b.label;
        btn.addEventListener('click', () => {
          if (Game.audio) { Game.audio.resume(); Game.audio.play('toggle'); }
          if (b.onClick) b.onClick();
        });
        this.buttonsEl.appendChild(btn);
      }
    }
    this.overlay.classList.remove('hidden');
  },

  hide() {
    this.overlay.classList.add('hidden');
  },

  // ===== 标题 / 主菜单（模式选择）=====
  showTitle() {
    const st = SaveSystem.getAll();
    const stats = `
      <div class="stat-line"><span class="stat-label">移动</span><span class="stat-value">WASD / 方向键</span></div>
      <div class="stat-line"><span class="stat-label">开火</span><span class="stat-value">Space（自动开火）</span></div>
      <div class="stat-line"><span class="stat-label">低速</span><span class="stat-value">Shift</span></div>
      <div class="stat-line"><span class="stat-label">炸弹 BOMB</span><span class="stat-value">Z</span></div>
      <div class="stat-line"><span class="stat-label">清屏技能</span><span class="stat-value">Q（8s 冷却）</span></div>
      <div class="stat-line"><span class="stat-label">投降技能</span><span class="stat-value">X</span></div>
      <div class="stat-line"><span class="stat-label">僚机编队</span><span class="stat-value">V</span></div>
      <div class="stat-line"><span class="stat-label">暂停</span><span class="stat-value">Esc / P</span></div>
      <div class="stat-line"><span class="stat-label">成就</span><span class="stat-value">${Achievements.countUnlocked()}/${Achievements.total()}</span></div>
      <div class="stat-line"><span class="stat-label">金币</span><span class="stat-value">◉ ${st.coins || 0}</span></div>
      <div class="stat-line"><span class="stat-label">无尽最高</span><span class="stat-value">${st.endless.bestScore}</span></div>
      <div class="stat-line"><span class="stat-label">今日最佳</span><span class="stat-value">${SaveSystem.getDailyBest()}</span></div>
    `;
    const unlockedCount = Planes.allKeys.filter(k => Planes.isUnlocked(k)).length;
    const currentPlane = Planes[SaveSystem.getSelectedPlane()];
    this.show('霓虹深渊', 'STAR FIGHTER · NEON ABYSS', stats, [
      { label: '闯关模式', accent: true, onClick: () => this.showShipSelect(true) },
      { label: '无尽模式', onClick: () => Game.startEndlessMode() },
      { label: '每日挑战', onClick: () => this.showDaily() },
      { label: `选择战机 (${currentPlane.name} · ${unlockedCount}/${Planes.allKeys.length})`, onClick: () => this.showShipSelect() },
      { label: `武器商店 (◉ ${st.coins || 0})`, onClick: () => this.showShop() },
      { label: '排行榜', onClick: () => this.showLeaderboard() },
      { label: '成就', onClick: () => this.showAchievements() },
      { label: '数据统计', onClick: () => this.showStats() },
      { label: '关于', onClick: () => this.showAbout() },
      { label: '重置存档', danger: true, onClick: () => this._confirmReset() },
    ], true);
  },

  // ===== 每日挑战 =====
  showDaily() {
    const cfg = Game.dailyConfig();
    const plane = Planes[cfg.plane];
    const modNames = { score2: '得分 ×2', coin2: '金币 ×2', bomb1: '初始炸弹 1' };
    const modsHtml = cfg.mods.map(m => `<span class="daily-mod">${modNames[m]}</span>`).join(' ');
    const best = SaveSystem.getDailyBest();
    const stats = `
      <div class="stat-line"><span class="stat-label">日期</span><span class="stat-value">${cfg.date}</span></div>
      <div class="stat-line"><span class="stat-label">当日固定战机</span><span class="stat-value" style="color:${plane.color}">${plane.name}</span></div>
      <div class="stat-line"><span class="stat-label">词条</span><span class="stat-value">${modsHtml}</span></div>
      <div class="stat-line"><span class="stat-label">今日最佳</span><span class="stat-value">${best}</span></div>
    `;
    this.show('每日挑战', 'DAILY CHALLENGE', stats, [
      { label: '开始挑战', accent: true, onClick: () => Game.startDailyMode() },
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ]);
  },

  // ===== 排行榜 =====
  showLeaderboard() {
    const lb = SaveSystem.getLeaderboard();
    let html = '';
    if (lb.length === 0) {
      html = '<div class="lb-empty">暂无战绩，去创造第一个纪录吧！</div>';
    } else {
      const modeNames = { stage: '闯关', endless: '无尽', daily: '每日' };
      for (let i = 0; i < lb.length; i++) {
        const e = lb[i];
        const rank = i + 1;
        const rankCls = rank === 1 ? ' gold' : rank === 2 ? ' silver' : rank === 3 ? ' bronze' : '';
        html += `
          <div class="lb-row${rankCls}">
            <span class="lb-rank">${rank}</span>
            <span class="lb-score">${e.score || 0}</span>
            <span class="lb-meta">${modeNames[e.mode] || e.mode || '-'} ${e.stage || ''} · ✕${e.kills || 0} · ${e.date || ''}</span>
          </div>`;
      }
    }
    this.show('排行榜', 'LOCAL TOP 8', html, [
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ]);
  },

  // ===== 武器商店 =====
  showShop() {
    const coins = SaveSystem.getCoins();
    let html = `<div class="shop-coins">持有金币 <span class="coin-num">◉ ${coins}</span></div>`;
    html += `<div class="shop-grid">`;
    for (const key of ShopData.allKeys) {
      const item = ShopData.items[key];
      const owned = SaveSystem.isOwned(key);
      const affordable = coins >= item.price;
      html += `
        <div class="shop-card${owned ? ' owned' : ''}" style="--shop-color:${item.color}">
          <div class="shop-icon">${item.icon}</div>
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-price${affordable || owned ? '' : ' poor'}">${owned ? '✓ 已装备' : '◉ ' + item.price}</div>
          <button class="shop-buy${owned ? ' disabled' : affordable ? '' : ' disabled'}"
                  data-key="${key}" data-owned="${owned ? 1 : 0}" data-price="${item.price}">
            ${owned ? '已拥有' : affordable ? '购 买' : '金币不足'}
          </button>
        </div>`;
    }
    html += `</div>`;
    // 消耗品区
    html += `<div class="shop-section">消耗品（可叠加购买，使用后消耗）</div>`;
    html += `<div class="shop-grid">`;
    for (const key of ShopData.consumableKeys) {
      const item = ShopData.consumables[key];
      const count = SaveSystem.getConsumableCount(key);
      const affordable = coins >= item.price;
      html += `
        <div class="shop-card" style="--shop-color:${item.color}">
          <div class="shop-icon">${item.icon}</div>
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-price${affordable ? '' : ' poor'}">◉ ${item.price} <span class="stock">库存 ×${count}</span></div>
          <button class="shop-buy${affordable ? '' : ' disabled'}" data-kind="${key}" data-price="${item.price}">
            ${affordable ? '购 买' : '金币不足'}
          </button>
        </div>`;
    }
    html += `</div>`;
    html += `<div class="shop-tip">永久强化一次买断；消耗品每局限用，护盾开局生效，复活币自动触发</div>`;
    this.show('武器商店', 'WEAPON SHOP', html, [
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ], false);

    // 绑定购买事件
    setTimeout(() => {
      const btns = document.querySelectorAll('.shop-buy');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const permKey = btn.dataset.key;
          const kindKey = btn.dataset.kind;
          if (permKey) {
            if (btn.dataset.owned === '1') return;
            const price = parseInt(btn.dataset.price, 10);
            if (SaveSystem.buyItem(permKey, price)) {
              if (Game.audio) Game.audio.play('powerup');
              this.showShop();
            } else {
              if (Game.audio) Game.audio.play('hurt');
            }
          } else if (kindKey) {
            if (btn.classList.contains('disabled')) return;
            const price = parseInt(btn.dataset.price, 10);
            if (SaveSystem.buyConsumable(kindKey, price)) {
              if (Game.audio) Game.audio.play('powerup');
              this.showShop();
            } else {
              if (Game.audio) Game.audio.play('hurt');
            }
          }
        });
      });
    }, 30);
  },

  // ===== 关于 =====
  showAbout() {
    const html = `
      <div class="about-box">
        <div class="about-line">星际战机：霓虹深渊</div>
        <div class="about-sub">STAR FIGHTER · NEON ABYSS</div>
        <div class="about-desc">一款纯前端 Canvas 射击游戏，零素材依赖，全程序化绘制与合成音效。</div>
        <div class="about-section">核心特色</div>
        <div class="about-item">· 闯关模式：3 关递进 + Boss 战 + 星级评定</div>
        <div class="about-item">· 无尽模式：无限波次 + 动态难度</div>
        <div class="about-item">· 4 架战机，各有专属武器与解锁条件</div>
        <div class="about-item">· 一键清屏(Q) / 一键投降(X) / 炸弹(Z)</div>
        <div class="about-item">· 敌人嘲讽气泡 / Boss 专属胜利语音</div>
        <div class="about-item">· 成就系统 / 数据统计 / 进度保存</div>
        <div class="about-section">技术栈</div>
        <div class="about-item">HTML5 Canvas + Web Audio API + localStorage</div>
        <div class="about-item">固定步长游戏循环 + 对象池 + 圆形碰撞</div>
      </div>`;
    this.show('关于', 'ABOUT', html, [
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ], false);
  },

  // ===== 战机选择 =====
  // prep=true 时为闯关准备流程：选完战机后进入选关
  showShipSelect(prep = false) {
    this._prepMode = prep;
    const unlockedCount = Planes.allKeys.filter(k => Planes.isUnlocked(k)).length;
    const currentKey = SaveSystem.getSelectedPlane();
    let html = `<div class="ship-header">已解锁 ${unlockedCount}/${Planes.allKeys.length}</div>`;
    html += `<div class="ship-grid">`;
    for (const key of Planes.allKeys) {
      const cfg = Planes[key];
      const unlocked = Planes.isUnlocked(key);
      const selected = key === currentKey;
      const hint = unlocked ? cfg.desc : Planes.unlockHint(key);
      const selectedMark = selected ? '<span class="ship-selected">✓ 当前</span>' : '';
      const lockMark = !unlocked ? '<span class="ship-lock">🔒</span>' : '';
      // 属性条
      const bars = this._shipBars(cfg);
      html += `
        <div class="ship-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}"
             data-key="${key}" data-unlocked="${unlocked ? 1 : 0}">
          <div class="ship-icon" style="--ship-color:${cfg.color};--ship-accent:${cfg.accent}">
            <canvas width="80" height="80"></canvas>
          </div>
          <div class="ship-name">${lockMark}${cfg.name}</div>
          <div class="ship-sub">${cfg.subtitle}</div>
          <div class="ship-desc">${hint}</div>
          <div class="ship-bars">${bars}</div>
          ${selectedMark}
        </div>`;
    }
    html += `</div>`;
    const buttons = [];
    if (prep) {
      buttons.push({ label: '下一步：选择关卡', accent: true, onClick: () => this.showStageSelect() });
      buttons.push({ label: '返回', danger: true, onClick: () => this.showTitle() });
    } else {
      buttons.push({ label: '返回', danger: true, onClick: () => this.showTitle() });
    }
    this.show('选择战机', 'SELECT YOUR FIGHTER', html, buttons, false);

    // 绑定点击事件
    setTimeout(() => {
      const cards = document.querySelectorAll('.ship-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          if (card.dataset.unlocked !== '1') return;
          const key = card.dataset.key;
          if (SaveSystem.selectPlane(key)) {
            // 重绘（保持 prep 上下文）
            this.showShipSelect(this._prepMode);
            // 播放音效
            if (Game.audio) Game.audio.play('toggle');
          }
        });
      });
    }, 30);
  },

  _shipBars(cfg) {
    const speedRatio = Math.min(1, cfg.speed / (Balance.player.speed * 1.3));
    const hpRatio = Math.min(1, cfg.maxHp / 7);
    const bombRatio = Math.min(1, cfg.startBombs / 3);
    return `
      <div class="bar-row"><span>速</span><div class="bar"><i style="width:${Math.round(speedRatio*100)}%;background:${cfg.color}"></i></div></div>
      <div class="bar-row"><span>血</span><div class="bar"><i style="width:${Math.round(hpRatio*100)}%;background:${cfg.color}"></i></div></div>
      <div class="bar-row"><span>弹</span><div class="bar"><i style="width:${Math.round(bombRatio*100)}%;background:${cfg.color}"></i></div></div>`;
  },

  // ===== 关卡选择 =====
  showStageSelect() {
    const stages = WavesData.stages;
    let statsHtml = '';
    for (let i = 0; i < stages.length; i++) {
      const key = stages[i];
      const data = WavesData[key];
      const unlocked = SaveSystem.isStageUnlocked(key);
      const stars = SaveSystem.getStageStars(key);
      const starStr = stars.map(s => s ? '★' : '☆').join(' ');
      const best = SaveSystem.getStageBestScore(key);
      const lock = unlocked ? '' : ' 🔒';
      statsHtml += `
        <div class="stat-line stage-row${unlocked ? '' : ' locked'}">
          <span class="stat-label">STAGE ${data.stage}${lock}</span>
          <span class="stat-value">${starStr}</span>
          <span class="stat-label">BEST ${best}</span>
        </div>`;
    }
    const buttons = [
      { label: '从第 1 关开始', accent: true, onClick: () => Game.startStageMode() },
    ];
    // 为每个已解锁关卡加按钮
    for (let i = 0; i < stages.length; i++) {
      const key = stages[i];
      if (SaveSystem.isStageUnlocked(key)) {
        const data = WavesData[key];
        if (data.stage > 1) {
          buttons.push({ label: `第 ${data.stage} 关`, onClick: () => Game.startStageAt(key) });
        }
      }
    }
    buttons.push({ label: '返回', danger: true, onClick: () => this._prepMode ? this.showShipSelect(true) : this.showTitle() });
    this.show('闯关模式', 'STAGE SELECT', statsHtml, buttons);
  },

  // ===== 成就 =====
  showAchievements() {
    let html = '';
    for (let i = 0; i < Achievements.list.length; i++) {
      const a = Achievements.list[i];
      const unlocked = SaveSystem.isAchievementUnlocked(a.id);
      html += `
        <div class="ach-row${unlocked ? '' : ' locked'}">
          <span class="ach-icon-mini">${a.icon}</span>
          <div class="ach-info">
            <div class="ach-name-mini">${a.name}</div>
            <div class="ach-desc-mini">${a.desc}</div>
          </div>
          <span class="ach-status">${unlocked ? '已解锁' : '未解锁'}</span>
        </div>`;
    }
    const count = Achievements.countUnlocked();
    this.show('成就', `ACHIEVEMENTS ${count}/${Achievements.total()}`, html, [
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ]);
  },

  // ===== 数据统计 =====
  showStats() {
    const s = SaveSystem.getStats();
    const e = SaveSystem.getEndlessBest();
    const st = SaveSystem.getAll().stage;
    const html = `
      <div class="stat-line"><span class="stat-label">总局数</span><span class="stat-value">${s.totalRuns}</span></div>
      <div class="stat-line"><span class="stat-label">总击杀</span><span class="stat-value">${s.totalKills}</span></div>
      <div class="stat-label" style="font-size:11px;opacity:.5;margin-top:8px;">闯关模式</div>
      <div class="stat-line"><span class="stat-label">通关次数</span><span class="stat-value">${s.stageClears}</span></div>
      <div class="stat-line"><span class="stat-label">闯关次数</span><span class="stat-value">${st.playCount}</span></div>
      <div class="stat-label" style="font-size:11px;opacity:.5;margin-top:8px;">无尽模式</div>
      <div class="stat-line"><span class="stat-label">最高分</span><span class="stat-value">${e.bestScore}</span></div>
      <div class="stat-line"><span class="stat-label">最长存活</span><span class="stat-value">${e.bestTime.toFixed(1)}s</span></div>
      <div class="stat-line"><span class="stat-label">最多击杀</span><span class="stat-value">${e.bestKills}</span></div>
      <div class="stat-line"><span class="stat-label">最高波次</span><span class="stat-value">${e.bestWave}</span></div>
      <div class="stat-label" style="font-size:11px;opacity:.5;margin-top:8px;">累计</div>
      <div class="stat-line"><span class="stat-label">总分</span><span class="stat-value">${s.totalScore}</span></div>
      <div class="stat-line"><span class="stat-label">最长连击</span><span class="stat-value">${s.maxCombo}</span></div>
      <div class="stat-line"><span class="stat-label">总擦弹</span><span class="stat-value">${s.totalGraze}</span></div>
      <div class="stat-line"><span class="stat-label">总炸弹</span><span class="stat-value">${s.totalBombs}</span></div>
      <div class="stat-line"><span class="stat-label">Boss击杀</span><span class="stat-value">${s.totalBossKills}</span></div>
      <div class="stat-line"><span class="stat-label">游戏时长</span><span class="stat-value">${Math.floor(s.totalPlayTime/60)}m</span></div>
    `;
    this.show('数据统计', 'PLAYER STATS', html, [
      { label: '返回', danger: true, onClick: () => this.showTitle() },
    ]);
  },

  // ===== 确认重置 =====
  _confirmReset() {
    this.show('重置存档？', '将清除所有进度与成就', '', [
      { label: '确认重置', danger: true, onClick: () => { SaveSystem.reset(); this.showTitle(); } },
      { label: '取消', onClick: () => this.showTitle() },
    ]);
  },

  // ===== 暂停 =====
  showPause() {
    this.show('PAUSED', '游戏已暂停', '', [
      { label: '继续', onClick: () => Game.resumeGame() },
      { label: '重新开始', onClick: () => Game.restart() },
      { label: '返回主菜单', danger: true, onClick: () => Game.toTitle() },
    ]);
  },

  // ===== 失败 =====
  showGameOver() {
    const s = Game.score;
    const summ = Stats.summary();
    let extraStats = '';
    if (Game.mode === 'endless') {
      const best = SaveSystem.getEndlessBest();
      extraStats += `<div class="stat-line"><span class="stat-label">WAVE</span><span class="stat-value">${summ.wave}</span></div>`;
      extraStats += `<div class="stat-line"><span class="stat-label">存活</span><span class="stat-value">${summ.playTime.toFixed(1)}s</span></div>`;
      extraStats += `<div class="stat-line"><span class="stat-label">历史最高</span><span class="stat-value">${best.bestScore}</span></div>`;
    }
    if (Game.mode === 'daily') {
      extraStats += `<div class="stat-line"><span class="stat-label">WAVE</span><span class="stat-value">${summ.wave}</span></div>`;
      extraStats += `<div class="stat-line"><span class="stat-label">今日最佳</span><span class="stat-value">${SaveSystem.getDailyBest()}${Game._dailyNewRecord ? ' NEW!' : ''}</span></div>`;
    }
    if (Game.lastRank) {
      extraStats += `<div class="stat-line"><span class="stat-label">排行榜</span><span class="stat-value" style="color:#ffd43b">RANK #${Game.lastRank}</span></div>`;
    }
    const stats = `
      <div class="stat-line"><span class="stat-label">SCORE</span><span class="stat-value">${Game.totalScore + s.score}</span></div>
      <div class="stat-line"><span class="stat-label">KILLS</span><span class="stat-value">${s.kills}</span></div>
      <div class="stat-line"><span class="stat-label">GRAZE</span><span class="stat-value">${s.grazeCount}</span></div>
      <div class="stat-line"><span class="stat-label">COINS</span><span class="stat-value" style="color:#ffd43b">◉ +${Game.coinsRun || 0}</span></div>
      ${extraStats}
    `;
    this.show('GAME OVER',
      Game.mode === 'daily' ? 'DAILY FAILED'
        : Game.mode === 'endless' ? 'ENDLESS FAILED' : 'STAGE FAILED',
      stats, [
      { label: '重新开始', accent: true, onClick: () => Game.restart() },
      { label: '返回主菜单', danger: true, onClick: () => Game.toTitle() },
    ]);
  },

  // ===== 通关本关 =====
  showStageClear(stars, totalScore) {
    const s = Game.score;
    const starsHtml = Array.from({length: 4}, (_, i) =>
      `<span class="stat-value">${i < stars.filter(x=>x).length ? '★' : '☆'}</span>`
    ).join(' ');
    // 保存的最高分对比
    const best = SaveSystem.getStageBestScore(Game.stageKey);
    const newRecord = s.score >= best;
    const stats = `
      <div class="stat-line"><span class="stat-label">SCORE</span><span class="stat-value">${s.score}${newRecord ? ' NEW!' : ''}</span></div>
      <div class="stat-line"><span class="stat-label">BEST</span><span class="stat-value">${best}</span></div>
      <div class="stat-line"><span class="stat-label">KILLS</span><span class="stat-value">${s.kills}</span></div>
      <div class="stat-line"><span class="stat-label">TIME</span><span class="stat-value">${s.stageTime.toFixed(1)}s</span></div>
      <div class="stat-line"><span class="stat-label">STARS</span><span class="stat-value">${starsHtml}</span></div>
      <div class="stat-line"><span class="stat-label">COINS</span><span class="stat-value" style="color:#ffd43b">◉ +${Game.coinsRun || 0}</span></div>
    `;
    const isLast = Game.currentStage >= WavesData.stages.length;
    if (isLast) {
      this.show('CLEAR ALL', 'FINAL VICTORY', stats, [
        { label: '返回主菜单', accent: true, onClick: () => Game.toTitle() },
      ]);
    } else {
      this.show('STAGE CLEAR', `STAGE ${Game.currentStage} PASSED`, stats, [
        { label: '进入下一关', accent: true, onClick: () => Game.nextStage() },
        { label: '返回主菜单', danger: true, onClick: () => Game.toTitle() },
      ]);
    }
  },
};
