// ====== src/entities/Boss.js ======
// Boss：多阶段、多弹幕图案、炮塔系统、入场仪式

class Boss extends Entity {
  constructor(config) {
    super(Balance.width / 2, -100);
    this.config = config;
    this.name = config.name;
    this.title = config.title;
    this.color = config.color;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.radius = config.radius;
    this.coreRadius = config.coreRadius || 18;
    this.hoverY = config.hoverY || 140;
    this.movePattern = config.movePattern || 'sweep';
    this.moveRange = config.moveRange || 160;
    this.moveSpeed = config.moveSpeed || 90;
    this.phases = config.phases;
    this.phaseIndex = 0;
    this.state = 'intro';      // intro / fight / transition / dead
    this.introTimer = 2.0;     // 入场时长
    this.invincible = 2.0;
    this.turrets = [];
    this.patternIndex = 0;
    this.patternTimer = 0;
    this.patternFireTimer = 0;
    this.moveDir = 1;
    this.moveOriginX = Balance.width / 2;
    this.transitionTimer = 0;
    this.coreExposed = false;
    this.coreAlwaysOpen = false;
    this.invulnerable = false;  // 炮塔存活时无敌（深渊Boss）
    this.summonTimer = 0;
    this.warningActive = true;  // 出场 WARNING
    this.warningTimer = 1.8;
    this.spawnArrived = false;
    this.tilt = 0;
    this.perfectStage = true;   // 完美阶段标记
    this.finalDeathTimer = 0;
    // 战斗台词计时器（黄牛 Boss 定时插入经典台词）
    this._dialogueTimer = 8 + Math.random() * 5;
    this._dialogueIndex = 0;

    // 创建炮塔
    if (config.turrets) {
      for (let i = 0; i < config.turrets.length; i++) {
        const t = config.turrets[i];
        this.turrets.push(new BossTurret(this, t));
      }
    }
  }

  _onUpdate(dt) {
    // WARNING 阶段
    if (this.warningActive) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.warningActive = false;
      return;
    }

    // 入场
    if (this.state === 'intro') {
      this.introTimer -= dt;
      this.y = Utils.lerp(this.y, this.hoverY, 0.04);
      if (this.introTimer <= 0 || Math.abs(this.y - this.hoverY) < 2) {
        this.y = this.hoverY;
        this.state = 'fight';
        this.introTimer = 0;
        this.invincible = 0;
      }
      return;
    }

    // 阶段过渡
    if (this.state === 'transition') {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.state = 'fight';
        this.invincible = 0;
      }
      return;
    }

    // 死亡动画
    if (this.state === 'dead') {
      this.finalDeathTimer -= dt;
      // 爆炸连锁
      if (Math.random() < 0.4) {
        const ex = this.x + Utils.rndRange(-this.radius, this.radius);
        const ey = this.y + Utils.rndRange(-this.radius, this.radius);
        if (Game.particles) Game.particles.spawnExplosion(ex, ey, Utils.pick(['#ffaa00','#ff3050','#ffffff']), 10);
        if (Game.audio) Game.audio.play('explode');
      }
      if (this.finalDeathTimer <= 0) {
        this.dead = true;
        if (Game) Game.onBossDefeated(this);
      }
      return;
    }

    // ===== fight 主状态 =====
    // 移动
    this._updateMovement(dt);

    // 黄牛 Boss 战斗台词（定时插入经典台词）
    if (this.config.character === 'cow') {
      this._dialogueTimer -= dt;
      if (this._dialogueTimer <= 0) {
        this._speakCowDialogue();
        this._dialogueTimer = 12 + Math.random() * 6;
      }
    }

    // 阶段判定
    this._updatePhase(dt);

    // 炮塔更新
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.update(dt);
      if (t.dead) this.turrets.splice(i, 1);
    }
    // 全部炮塔被破 -> invulnerable = false
    if (this.invulnerable && this.turrets.length === 0) {
      this.invulnerable = false;
      // 进入下一阶段
      this._nextPhase();
    }

    if (this.invulnerable) return; // 炮塔存活时核心不射击

    // 弹幕图案
    const phase = this.phases[this.phaseIndex];
    const pattern = phase.patterns[this.patternIndex];
    this.patternTimer -= dt;
    this.patternFireTimer -= dt;

    // 召唤
    if (pattern.type === 'summon') {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this._summon(pattern);
        this.summonTimer = pattern.fireRate;
      }
    } else if (this.patternFireTimer <= 0) {
      this._firePattern(pattern);
      this.patternFireTimer = pattern.fireRate;
    }

    if (this.patternTimer <= 0) {
      // 切换到下一个 pattern
      this.patternIndex = (this.patternIndex + 1) % phase.patterns.length;
      const next = phase.patterns[this.patternIndex];
      this.patternTimer = next.duration || 4;
      this.patternFireTimer = 0;
    }
  }

  _updateMovement(dt) {
    if (this.movePattern === 'sweep') {
      this.x += this.moveDir * this.moveSpeed * dt;
      if (this.x > this.moveOriginX + this.moveRange) { this.x = this.moveOriginX + this.moveRange; this.moveDir = -1; }
      if (this.x < this.moveOriginX - this.moveRange) { this.x = this.moveOriginX - this.moveRange; this.moveDir = 1; }
    }
  }

  _updatePhase(dt) {
    const phase = this.phases[this.phaseIndex];
    const nextIndex = this.phaseIndex + 1;
    if (nextIndex < this.phases.length) {
      const next = this.phases[nextIndex];
      if (this.hp <= this.maxHp * next.hpThreshold) {
        this._nextPhase();
      }
    }
  }

  _nextPhase() {
    const nextIndex = this.phaseIndex + 1;
    if (nextIndex >= this.phases.length) {
      // 已是最后阶段，HP 已为 0 -> 死亡
      return;
    }
    this.phaseIndex = nextIndex;
    const phase = this.phases[this.phaseIndex];
    this.patternIndex = 0;
    this.patternTimer = phase.patterns[0].duration || 4;
    this.patternFireTimer = 0;
    this.state = 'transition';
    this.transitionTimer = 1.0;
    this.invincible = 1.0;
    this.coreExposed = !!phase.coreExposed;
    this.coreAlwaysOpen = !!phase.coreAlwaysOpen;
    // 阶段切换效果
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, phase.color, 80);
    if (Game.particles) Game.particles.spawnShockwave(this.x, this.y, phase.color);
    EnemyBulletPool.clearAll();
    Effects.flash();
    // 掉落道具
    this._dropOnTransition();
    if (Game.audio) Game.audio.play('bomb');
    // 更新 BossUI
    if (Game.bossUI) Game.bossUI.onPhaseChange(this);
    // 完美阶段标记重置（用于 Boss 完美通关判定）
    this.perfectStage = !Game.player.tookDamageThisStage;
  }

  _dropOnTransition() {
    const r = Balance.dropRates.bossTransition;
    const drops = [];
    if (Utils.chance(r.P)) drops.push('P');
    if (Utils.chance(r.energy)) drops.push('energy');
    if (Utils.chance(r.bomb)) drops.push('bomb');
    if (Utils.chance(r.shield)) drops.push('shield');
    if (Utils.chance(r.life)) drops.push('life');
    if (Game.pickups) {
      for (let i = 0; i < drops.length; i++) {
        const p = new Pickup(this.x + Utils.rndRange(-40, 40), this.y + 30, drops[i]);
        p.vy = 60 + i * 20;
        Game.pickups.push(p);
      }
    }
  }

  // ============ 弹幕图案分发 ============
  _firePattern(p) {
    switch (p.type) {
      case 'spiral': this._fireSpiral(p); break;
      case 'fan': this._fireFan(p); break;
      case 'cross': this._fireCross(p); break;
      case 'rotating_bars': this._fireRotatingBars(p); break;
      case 'split_homing': this._fireSplitHoming(p); break;
      case 'barrage': this._fireBarrage(p); break;
      case 'boomerang': this._fireBoomerang(p); break;
      case 'random_even': this._fireRandomEven(p); break;
      case 'wave_stream': this._fireWaveStream(p); break;
      case 'ring_pulse': this._fireRingPulse(p); break;
      case 'cross': this._fireCross(p); break;
    }
  }

  // 蛇形波流：朝玩家的数条正弦摆动弹
  _fireWaveStream(p) {
    const count = p.count || 4;
    const speed = p.bulletSpeed || 200;
    const amp = p.waveAmp || 28;
    const freq = p.waveFreq || 1.6;
    const player = Game.player;
    let baseAngle = 90;
    if (player) baseAngle = Utils.angleFromVec(player.x - this.x, player.y - this.y);
    for (let i = 0; i < count; i++) {
      const ang = baseAngle + (i - (count - 1) / 2) * (p.spread || 16);
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
        mode: 'wave', waveAmp: amp, waveFreq: freq,
      });
    }
  }

  // 环形脉冲：全周密集环，偶数圈反向偏移半步
  _fireRingPulse(p) {
    const count = p.count || 18;
    const speed = p.bulletSpeed || 210;
    const pulse = Math.floor(this.age * 2) % 2 === 1;
    const offset = pulse ? 180 / count : 0;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * 360 + offset;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, pulse ? speed * 0.82 : speed, {
        color: this.phases[this.phaseIndex].color, radius: 4,
      });
    }
  }

  // 螺旋
  _fireSpiral(p) {
    const arms = p.arms || 3;
    const speed = p.bulletSpeed || 200;
    const t = this.age * (p.fireRate > 0 ? 1 / p.fireRate : 10);
    for (let a = 0; a < arms; a++) {
      const ang = (t * 50 + a * (360 / arms)) % 360;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
      });
    }
  }

  // 扇形（朝玩家）
  _fireFan(p) {
    const count = p.count || 5;
    const spread = p.spread || 50;
    const speed = p.bulletSpeed || 220;
    const player = Game.player;
    let baseAngle = 90; // 默认朝下
    if (player) {
      baseAngle = Utils.angleFromVec(player.x - this.x, player.y - this.y);
    }
    const half = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const offset = (i - half) * spread / Math.max(1, half);
      EnemyBulletPool.spawnAt(this.x, this.y, baseAngle + offset, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
      });
    }
  }

  // 交叉网（n 组交替方向）
  _fireCross(p) {
    const groups = p.groupCount || 4;
    const speed = p.bulletSpeed || 220;
    const t = Math.floor(this.age * 2);
    for (let i = 0; i < groups; i++) {
      const ang = (i / groups) * 180 + t * 30;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
      });
    }
  }

  // 旋转栅栏：弹幕墙以恒定角速度旋转，玩家找间隙穿
  _fireRotatingBars(p) {
    const bars = p.bars || 2;
    const speed = p.bulletSpeed || 200;
    const rotation = (this.age * 60) % 360;
    for (let b = 0; b < bars; b++) {
      const baseAng = rotation + (b / bars) * 360;
      // 一道弹幕墙：连续发射 5 发
      for (let i = -2; i <= 2; i++) {
        const ang = baseAng + i * (p.barWidth || 30) / 5;
        EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
          color: this.phases[this.phaseIndex].color, radius: 5,
        });
      }
    }
  }

  // 追踪分裂
  _fireSplitHoming(p) {
    const count = p.count || 4;
    const speed = p.bulletSpeed || 200;
    const splitTime = p.splitTime || 1.5;
    const splitCount = p.splitCount || 3;
    const player = Game.player;
    let baseAngle = 90;
    if (player) baseAngle = Utils.angleFromVec(player.x - this.x, player.y - this.y);
    for (let i = 0; i < count; i++) {
      const ang = baseAngle + (i - (count-1)/2) * 20;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 6,
        split: true, splitTime, splitCount, ownerBoss: this,
      });
    }
  }

  // 全方位弹幕（保证有可穿越间隙）
  _fireBarrage(p) {
    const count = p.count || 16;
    const speed = p.bulletSpeed || 240;
    const offset = this.age * 30;
    // 留一个 30° 缺口
    const gapAngle = Utils.rndRange(0, 360);
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * 360 + offset;
      // 跳过缺口
      const diff = Math.abs(Utils.angleDiff(ang, gapAngle));
      if (diff < 15) continue;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
      });
    }
  }

  // 回旋返回
  _fireBoomerang(p) {
    const count = p.count || 4;
    const speed = p.bulletSpeed || 200;
    const player = Game.player;
    let baseAngle = 90;
    if (player) baseAngle = Utils.angleFromVec(player.x - this.x, player.y - this.y);
    for (let i = 0; i < count; i++) {
      const ang = baseAngle + (i - (count-1)/2) * 30;
      const r = Utils.rad(ang);
      EnemyBulletPool.spawn(this.x, this.y, Math.cos(r) * speed, Math.sin(r) * speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
        mode: 'decel', accel: 200, maxLife: 4,
      });
    }
  }

  // 随机均匀（有可穿越间隙）
  _fireRandomEven(p) {
    const count = p.count || 12;
    const speed = p.bulletSpeed || 220;
    // 留 1/4 的角度不发，制造可穿越路径
    const gapStart = Math.random() * 360;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * 360 + Math.random() * 5;
      const diff = Math.abs(Utils.angleDiff(ang, gapStart));
      if (diff < 45) continue;
      EnemyBulletPool.spawnAt(this.x, this.y, ang, speed, {
        color: this.phases[this.phaseIndex].color, radius: 5,
      });
    }
  }

  // 召唤小怪
  _summon(p) {
    const count = p.count || 2;
    const type = p.type_enemy || 'grunt';
    if (!Game.enemies) return;
    for (let i = 0; i < count; i++) {
      const x = this.x + Utils.rndRange(-30, 30);
      const y = this.y + this.radius + 10;
      const e = new Enemy(type, x, y, { pattern: 'line' });
      e.vy = 100;
      Game.enemies.push(e);
    }
    if (Game.audio) Game.audio.play('summon');
  }

  // ============ 受伤判定 ============
  damage(amount, source) {
    if (this.invincible > 0) return false;
    if (this.invulnerable) {
      // 炮塔存活，核心免伤
      return false;
    }
    // 阶段2+核心暴露时伤害×2
    if (this.coreExposed || this.coreAlwaysOpen) {
      amount *= 2;
    }
    this.hp = Math.max(0, this.hp - amount);
    // 受击粒子
    if (Game.particles && Math.random() < 0.5) {
      Game.particles.spawnBurst(this.x + Utils.rndRange(-this.radius/2, this.radius/2), this.y, '#ffffff', 4);
    }
    if (this.hp <= 0) {
      this._die();
    }
    return true;
  }

  _die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.finalDeathTimer = 2.0;
    this.invincible = 999;
    EnemyBulletPool.clearAll();
    if (Game.score) Game.score.addScore(5000);
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, '#ffffff', 80);
    if (Game.audio) Game.audio.play('bomb');
  }

  // 黄牛 Boss 战斗中插入的经典台词（参考《牛来》风格 + 火出圈电影台词）
  _speakCowDialogue() {
    const lines = [
      '牛来！',
      '我命由我不由天！',
      '你已急哭',
      '不知道，我的身材很曼妙',
      '老叟戏顽童',
      '如何呢又能怎',
      '胆子真是肥嘟嘟的',
      '助我破鼎',
    ];
    const line = lines[this._dialogueIndex % lines.length];
    this._dialogueIndex++;
    // 用浏览器语音合成朗读
    if (Game.audio && Game.audio.speak) {
      Game.audio.speak(line, { rate: 0.85, pitch: 0.75 });
    }
    // 同时在 Boss 头顶显示台词气泡
    if (Game.particles) {
      Game.particles.spawnText(this.x, this.y - this.radius - 20, line, '#f0c020');
    }
  }

  _onDraw(ctx) {
    // 入场前不出场（WARNING 时只画警告）
    if (this.state === 'intro' && this.y < -50) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    const phase = this.phases[this.phaseIndex];
    const phaseColor = phase.color;

    ctx.shadowBlur = 20;
    ctx.shadowColor = phaseColor;

    // ===== 按 Boss 形态绘制角色 =====
    const r = this.radius;
    if (this.config.character === 'dog') {
      this._drawDogBoss(ctx, r, phaseColor);
    } else if (this.config.character === 'cow') {
      this._drawCowBoss(ctx, r, phaseColor);
    } else if (this.config.character === 'kangaroo') {
      this._drawKangarooBoss(ctx, r, phaseColor);
    } else if (this.config.turrets) {
      // 深渊母舰：大菱形+4 边角
      ctx.fillStyle = phaseColor;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius * 0.8, 0);
      ctx.lineTo(this.radius * 0.6, this.radius * 0.7);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius * 0.6, this.radius * 0.7);
      ctx.lineTo(-this.radius * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      // 内层
      ctx.fillStyle = Utils.hexToRgba(phaseColor, 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.5);
      ctx.lineTo(this.radius * 0.4, 0);
      ctx.lineTo(0, this.radius * 0.4);
      ctx.lineTo(-this.radius * 0.4, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.title === '裂光') {
      // 棱镜：八角星
      ctx.fillStyle = phaseColor;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Utils.TAU + this.age * 0.3;
        const r = i % 2 === 0 ? this.radius : this.radius * 0.6;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // 巡哨者：圆形带翼
      ctx.fillStyle = phaseColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Utils.TAU);
      ctx.fill();
      // 侧翼
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.8, 0);
      ctx.lineTo(-this.radius * 1.3, this.radius * 0.5);
      ctx.lineTo(-this.radius * 0.6, this.radius * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.radius * 0.8, 0);
      ctx.lineTo(this.radius * 1.3, this.radius * 0.5);
      ctx.lineTo(this.radius * 0.6, this.radius * 0.4);
      ctx.closePath();
      ctx.fill();
    }

    // 核心（阶段2+ 暴露时显示）
    if (this.coreExposed || this.coreAlwaysOpen || this.invulnerable) {
      const corePulse = 0.7 + Math.sin(this.age * 8) * 0.3;
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = `rgba(255,255,255,${corePulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.coreRadius, 0, Utils.TAU);
      ctx.fill();
      // 内核
      ctx.fillStyle = phaseColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.coreRadius * 0.5, 0, Utils.TAU);
      ctx.fill();
    } else {
      // 平时小核心
      ctx.shadowBlur = 8;
      ctx.fillStyle = Utils.hexToRgba('#ffffff', 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();

    // 炮塔
    for (let i = 0; i < this.turrets.length; i++) {
      this.turrets[i].draw(ctx);
    }

    // 受伤红色闪烁
    if (this.invincible > 0 && this.state !== 'dead' && Math.floor(this.age * 30) % 2 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Utils.TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // ===== Boss 1：小狗戴帽（惊讶表情）=====
  _drawDogBoss(ctx, r, phaseColor) {
    // 身体（白色）
    ctx.fillStyle = '#f5f0e8';
    ctx.beginPath();
    ctx.ellipse(0, 10, r * 0.75, r * 0.85, 0, 0, Utils.TAU);
    ctx.fill();
    // 头（更大的白圆）
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.35, r * 0.85, r * 0.8, 0, 0, Utils.TAU);
    ctx.fill();
    // 左耳朵
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.ellipse(-r * 0.7, -r * 0.55, r * 0.22, r * 0.38, -0.3, 0, Utils.TAU);
    ctx.fill();
    // 右耳朵
    ctx.beginPath();
    ctx.ellipse(r * 0.7, -r * 0.55, r * 0.22, r * 0.38, 0.3, 0, Utils.TAU);
    ctx.fill();
    // 蓝色帽子
    ctx.fillStyle = '#2b5a8c';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.85, r * 0.85, r * 0.22, 0, 0, Utils.TAU);
    ctx.fill();
    ctx.fillStyle = '#3a70a8';
    ctx.beginPath();
    ctx.arc(0, -r * 0.95, r * 0.45, Math.PI, Utils.TAU);
    ctx.fill();
    // 大眼白
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, Utils.TAU);
    ctx.arc(r * 0.3, -r * 0.3, r * 0.2, 0, Utils.TAU);
    ctx.fill();
    // 黑眼珠（瞪大）
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.28, r * 0.11, 0, Utils.TAU);
    ctx.arc(r * 0.3, -r * 0.28, r * 0.11, 0, Utils.TAU);
    ctx.fill();
    // 鼻子
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.02, r * 0.13, r * 0.1, 0, 0, Utils.TAU);
    ctx.fill();
    // 张嘴（惊讶 O 型）
    ctx.fillStyle = '#c44a5a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.12, r * 0.16, 0, 0, Utils.TAU);
    ctx.fill();
    // 舌头
    ctx.fillStyle = '#e88a9a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.07, r * 0.06, 0, 0, Utils.TAU);
    ctx.fill();
    // 胡须
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.05); ctx.lineTo(-r * 0.6, r * 0.02);
    ctx.moveTo(-r * 0.25, r * 0.12); ctx.lineTo(-r * 0.55, r * 0.14);
    ctx.moveTo(r * 0.25, r * 0.05); ctx.lineTo(r * 0.6, r * 0.02);
    ctx.moveTo(r * 0.25, r * 0.12); ctx.lineTo(r * 0.55, r * 0.14);
    ctx.stroke();
  }

  // ===== Boss 2：黄牛（牛来）=====
  _drawCowBoss(ctx, r, phaseColor) {
    // 头（黄色）
    ctx.fillStyle = '#f0c020';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r * 0.85, 0, 0, Utils.TAU);
    ctx.fill();
    // 牛角（左）
    ctx.fillStyle = '#c8c0a8';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.7);
    ctx.quadraticCurveTo(-r * 0.9, -r * 1.1, -r * 0.7, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    // 牛角（右）
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.7);
    ctx.quadraticCurveTo(r * 0.9, -r * 1.1, r * 0.7, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    // 耳朵
    ctx.fillStyle = '#d8a818';
    ctx.beginPath();
    ctx.ellipse(-r * 0.85, -r * 0.1, r * 0.2, r * 0.35, -0.4, 0, Utils.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.85, -r * 0.1, r * 0.2, r * 0.35, 0.4, 0, Utils.TAU);
    ctx.fill();
    // 眉毛（不爽）
    ctx.strokeStyle = '#5a4010';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.3); ctx.lineTo(-r * 0.1, -r * 0.22);
    ctx.moveTo(r * 0.45, -r * 0.3); ctx.lineTo(r * 0.1, -r * 0.22);
    ctx.stroke();
    // 眼睛（半眯不爽）
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.08, r * 0.12, r * 0.08, 0, 0, Utils.TAU);
    ctx.ellipse(r * 0.25, -r * 0.08, r * 0.12, r * 0.08, 0, 0, Utils.TAU);
    ctx.fill();
    // 鼻吻部（米色）
    ctx.fillStyle = '#e8d8b0';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.35, r * 0.45, r * 0.35, 0, 0, Utils.TAU);
    ctx.fill();
    // 鼻孔
    ctx.fillStyle = '#8a6a30';
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, r * 0.35, r * 0.06, r * 0.08, 0, 0, Utils.TAU);
    ctx.ellipse(r * 0.12, r * 0.35, r * 0.06, r * 0.08, 0, 0, Utils.TAU);
    ctx.fill();
    // "牛来" 嘴部文字感
    ctx.fillStyle = '#5a4010';
    ctx.font = `bold ${Math.round(r * 0.32)}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('牛来', 0, r * 0.75);
  }

  // ===== Boss 3：黄袋鼠（胆子真是肥嘟嘟的）=====
  _drawKangarooBoss(ctx, r, phaseColor) {
    // 身体（黄色）
    ctx.fillStyle = '#f5c830';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.8, r * 0.85, 0, 0, Utils.TAU);
    ctx.fill();
    // 肚子（浅黄）
    ctx.fillStyle = '#fae890';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.45, r * 0.5, 0, 0, Utils.TAU);
    ctx.fill();
    // 头
    ctx.fillStyle = '#f5c830';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.45, r * 0.42, 0, 0, Utils.TAU);
    ctx.fill();
    // 长耳朵
    ctx.fillStyle = '#f5c830';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.95, r * 0.12, r * 0.35, -0.2, 0, Utils.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.95, r * 0.12, r * 0.35, 0.2, 0, Utils.TAU);
    ctx.fill();
    // 耳朵内粉
    ctx.fillStyle = '#f0a0a0';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.92, r * 0.06, r * 0.22, -0.2, 0, Utils.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.92, r * 0.06, r * 0.22, 0.2, 0, Utils.TAU);
    ctx.fill();
    // 大眼白
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 0.6, r * 0.13, 0, Utils.TAU);
    ctx.arc(r * 0.18, -r * 0.6, r * 0.13, 0, Utils.TAU);
    ctx.fill();
    // 黑眼珠
    ctx.fillStyle = '#3a2010';
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 0.58, r * 0.07, 0, Utils.TAU);
    ctx.arc(r * 0.18, -r * 0.58, r * 0.07, 0, Utils.TAU);
    ctx.fill();
    // 大鼻子
    ctx.fillStyle = '#a05a30';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.35, r * 0.16, r * 0.12, 0, 0, Utils.TAU);
    ctx.fill();
    // 嘴
    ctx.strokeStyle = '#7a4020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.22); ctx.lineTo(0, -r * 0.1);
    ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(-r * 0.1, 0, -r * 0.15, -r * 0.05);
    ctx.moveTo(0, -r * 0.1); ctx.quadraticCurveTo(r * 0.1, 0, r * 0.15, -r * 0.05);
    ctx.stroke();
    // 小手（掐腰）
    ctx.fillStyle = '#f5c830';
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, r * 0.15, r * 0.18, r * 0.25, -0.5, 0, Utils.TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.5, r * 0.15, r * 0.18, r * 0.25, 0.5, 0, Utils.TAU);
    ctx.fill();
    // 尾巴
    ctx.fillStyle = '#f0b820';
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.4);
    ctx.quadraticCurveTo(r * 1.2, r * 0.3, r * 1.0, r * 0.8);
    ctx.quadraticCurveTo(r * 0.8, r * 0.7, r * 0.5, r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

// ===== Boss 炮塔 =====
class BossTurret extends Entity {
  constructor(boss, cfg) {
    super(boss.x + cfg.offsetX, boss.y + cfg.offsetY);
    this.boss = boss;
    this.offsetX = cfg.offsetX;
    this.offsetY = cfg.offsetY;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.color = cfg.color;
    this.pattern = cfg.pattern;
    this.count = cfg.count;
    this.spread = cfg.spread;
    this.arms = cfg.arms;
    this.fireRate = cfg.fireRate;
    this.bulletSpeed = cfg.bulletSpeed;
    this.fireTimer = 0;
    this.radius = 12;
    this.dead = false;
    this.alive = true;
  }
  update(dt) {
    // 跟随 boss
    this.x = this.boss.x + this.offsetX;
    this.y = this.boss.y + this.offsetY;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this._fire();
      this.fireTimer = this.fireRate;
    }
    this.age += dt;
  }
  _fire() {
    const player = Game.player;
    let baseAngle = 90;
    if (player) baseAngle = Utils.angleFromVec(player.x - this.x, player.y - this.y);
    if (this.pattern === 'fan') {
      const count = this.count || 5;
      const spread = this.spread || 60;
      const half = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const offset = (i - half) * spread / Math.max(1, half);
        EnemyBulletPool.spawnAt(this.x, this.y, baseAngle + offset, this.bulletSpeed, {
          color: this.color, radius: 5,
        });
      }
    } else if (this.pattern === 'spiral') {
      const arms = this.arms || 2;
      for (let a = 0; a < arms; a++) {
        const ang = (this.age * 80 + a * (360 / arms)) % 360;
        EnemyBulletPool.spawnAt(this.x, this.y, ang, this.bulletSpeed, {
          color: this.color, radius: 5,
        });
      }
    }
  }
  damage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      this.alive = false;
      if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, this.color, 16);
      if (Game.audio) Game.audio.play('explode');
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Utils.TAU);
    ctx.fill();
    // 炮口
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Utils.TAU);
    ctx.fill();
    // 血条
    if (this.hp < this.maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-12, -18, 24, 2);
      ctx.fillStyle = '#ff3050';
      ctx.fillRect(-12, -18, 24 * (this.hp / this.maxHp), 2);
    }
    ctx.restore();
  }
}
