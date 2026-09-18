// ====== src/entities/Player.js ======
// 玩家飞机

class Player extends Entity {
  constructor(x, y, planeKey) {
    super(x, y);
    const cfg = Planes[planeKey] || Planes.pioneer;
    this.planeKey = cfg.key;
    this.planeConfig = cfg;
    this.color = cfg.color;
    this.accent = cfg.accent;
    this.radius = 12;
    this.hp = cfg.startHp;
    this.maxHp = cfg.maxHp;
    this.speed = cfg.speed;
    this.weapon = { type: cfg.startWeapon, level: cfg.startWeaponLevel };
    this.energy = 0;
    this.bombs = cfg.startBombs;
    this.maxBombs = Balance.player.maxBombs;
    this.graze = 0;
    this.invincible = 0;
    this.hitboxRadius = Balance.player.hitboxRadius;
    this.grazeRadius = Balance.player.grazeRadius;
    this.options = [];           // 僚机数组
    this.formation = 'tight';
    this.slowMode = false;
    this.fireCooldown = 0;
    this.flashTimer = 0;         // 受伤闪烁
    this.shielded = false;        // 护盾
    this.dead = false;
    // 飞机朝向角度（视觉用）
    this.tilt = 0;
    // 死亡后短暂等待重生
    this.respawnTimer = 0;
    this.alive = true;
    // 玩家受击相关：用于"完美 Boss"判定
    this.tookDamageThisStage = false;
    // 商店永久强化
    this.dmgMult = 1;
    this.homingExtra = 0;
    this.homingAgile = false;
    this.laserRapid = false;
    this._applyShopUpgrades(cfg);
    // 同步追踪敏捷标记到弹池（homing 转向用）
    PlayerBulletPool.homingAgile = this.homingAgile;
    // 消耗品：临时护盾（Game 在开局时消费库存并置 pending 标记）
    if (Game._shieldPending) {
      Game._shieldPending = false;
      this.shielded = true;
    }
  }

  // 应用武器商店已购强化（永久生效）
  _applyShopUpgrades(cfg) {
    if (typeof SaveSystem === 'undefined' || !SaveSystem.getOwnedItems) return;
    const owned = SaveSystem.getOwnedItems();
    for (let i = 0; i < owned.length; i++) {
      switch (owned[i]) {
        case 'scatter_plus':
          // 全武器伤害 +25%（散弹为主），散射系开局火力+1
          this.dmgMult *= 1.25;
          if (this.weapon.type === 'scatter') {
            this.weapon.level = Math.min(Balance.player.maxWeaponLevel, this.weapon.level + 1);
          }
          break;
        case 'laser_plus':
          // 激光伤害 +30%
          this.dmgMult *= 1.30;
          this.laserRapid = true;
          break;
        case 'homing_plus':
          this.homingExtra = 2;
          this.homingAgile = true;
          break;
        case 'start_bomb':
          this.maxBombs = Balance.player.maxBombs + 1;
          this.bombs = Math.min(this.maxBombs, this.bombs + 1);
          break;
        case 'start_option':
          if (this.options.length < 2) {
            const opt = new Option();
            opt.setup(this, this.options.length);
            this.options.push(opt);
          }
          break;
        case 'hp_up':
          this.maxHp = cfg.maxHp + 1;
          this.hp = Math.min(this.maxHp, cfg.startHp + 1);
          break;
      }
    }
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = Balance.player.startHp;
    this.maxHp = Balance.player.maxHp;
    this.weapon = { type: 'scatter', level: 1 };
    this.energy = 0;
    this.bombs = Balance.player.startBombs;
    this.graze = 0;
    this.invincible = 1.0;
    this.options = [];
    this.formation = 'tight';
    this.slowMode = false;
    this.fireCooldown = 0;
    this.flashTimer = 0;
    this.shielded = false;
    this.dead = false;
    this.alive = true;
    this.tookDamageThisStage = false;
  }

  // 解锁僚机
  addOption() {
    if (this.options.length >= 2) return;
    const opt = new Option();
    opt.setup(this, this.options.length);
    this.options.push(opt);
    if (Game.particles) Game.particles.spawnBurst(this.x, this.y, '#ffaa00', 16);
    if (Game.audio) Game.audio.play('powerup');
  }

  _onUpdate(dt) {
    if (!this.alive) return;

    // 输入移动
    let speed = this.speed;
    this.slowMode = Input.state.slow;
    if (this.slowMode) speed *= Balance.player.slowMultiplier;

    let mx = Input.moveX, my = Input.moveY;
    // 触摸控制：朝触控目标点平滑移动（Input 采用相对拖动虚拟摇杆，
    // touchPos = 飞机初始位置 + 手指滑动 delta，手指不会遮挡飞机）
    if (Input.touchActive && Input.touchPos) {
      const dx = Input.touchPos.x - this.x;
      const dy = Input.touchPos.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > 2) {
        // 平滑追随
        const factor = Math.min(1, d / 30);
        this.vx = (dx / d) * speed * factor;
        this.vy = (dy / d) * speed * factor;
        mx = this.vx / speed;
        my = this.vy / speed;
      } else {
        this.vx = 0; this.vy = 0; mx = 0; my = 0;
      }
    } else {
      this.vx = mx * speed;
      this.vy = my * speed;
    }

    super._onUpdate(dt);

    // 限制在画布内
    this.x = Utils.clamp(this.x, this.radius, Balance.width - this.radius);
    this.y = Utils.clamp(this.y, this.radius, Balance.height - this.radius);

    // 倾斜视觉
    this.tilt = Utils.lerp(this.tilt, mx * 0.4, 0.2);

    // 无敌计时
    if (this.invincible > 0) this.invincible -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    // 清屏技能冷却
    if (this._clearCd !== undefined && this._clearCd > 0) this._clearCd -= dt;

    // 自动开火（默认开启；按住 Space/J 也开火）
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && Input.state.firing) {
      this._fire();
      let cd = Balance.player.fireCooldown[this.weapon.type] || 0.10;
      // 商店：激光急速
      if (this.laserRapid && this.weapon.type === 'laser') cd *= 0.85;
      this.fireCooldown = cd * (1 - (this.weapon.level - 1) * 0.08);
    }

    // Bomb（Z）
    if (Input.actions.bomb) {
      this._useBomb();
    }
    // 一键清屏技能（Q）：清除全场敌弹 + AOE 伤害
    if (Input.actions.clearScreen) {
      this._useClearScreen();
    }
    // 一键投降技能（X）：主动放弃本局
    if (Input.actions.surrender) {
      this._surrender();
    }
    // 切换编队
    if (Input.actions.toggleFormation) {
      this.formation = this.formation === 'tight' ? 'spread' : 'tight';
      if (Game.audio) Game.audio.play('toggle');
    }

    // 更新僚机
    for (let i = this.options.length - 1; i >= 0; i--) {
      const opt = this.options[i];
      opt.update(dt);
    }
  }

  _fire() {
    const lvl = this.weapon.level;
    const dmg = lvl * 0.9 * (this.dmgMult || 1);
    const w = this.weapon.type;

    if (w === 'scatter') {
      const speed = Balance.bullet.playerScatter;
      // 1 级单发，3 级 3 发扇形，5 级 5 发扇形+2 后侧
      const fanCount = lvl === 1 ? 1 : lvl <= 3 ? 3 : 5;
      const spread = lvl <= 3 ? 18 : 28;
      const half = (fanCount - 1) / 2;
      for (let i = 0; i < fanCount; i++) {
        const offset = (i - half) * (spread / Math.max(1, half));
        const ang = -90 + offset;
        const r = Utils.rad(ang);
        PlayerBulletPool.spawn(this.x, this.y - 8, Math.cos(r) * speed, Math.sin(r) * speed, 'scatter', lvl, dmg);
      }
      if (lvl === 5) {
        // 后侧 2 发
        PlayerBulletPool.spawn(this.x - 10, this.y, -speed * 0.6, 0, 'scatter', lvl, dmg * 0.6);
        PlayerBulletPool.spawn(this.x + 10, this.y, speed * 0.6, 0, 'scatter', lvl, dmg * 0.6);
      }
    } else if (w === 'laser') {
      // 主激光（穿透）
      const speed = Balance.bullet.playerScatter * 1.8;
      PlayerBulletPool.spawn(this.x, this.y - 8, 0, -speed, 'laser', lvl, dmg);
      if (lvl >= 3) {
        PlayerBulletPool.spawn(this.x - 14, this.y - 4, 0, -speed, 'laser', lvl, dmg * 0.7);
        PlayerBulletPool.spawn(this.x + 14, this.y - 4, 0, -speed, 'laser', lvl, dmg * 0.7);
      }
      if (lvl === 5) {
        PlayerBulletPool.spawn(this.x - 24, this.y, -speed * 0.3, -speed * 0.6, 'laser', lvl, dmg * 0.5);
        PlayerBulletPool.spawn(this.x + 24, this.y, speed * 0.3, -speed * 0.6, 'laser', lvl, dmg * 0.5);
      }
    } else if (w === 'homing') {
      const speed = Balance.bullet.playerHoming;
      const count = (lvl === 1 ? 1 : lvl <= 3 ? 3 : 5) + (this.homingExtra || 0);
      for (let i = 0; i < count; i++) {
        const offset = (i - (count-1)/2) * 12;
        PlayerBulletPool.spawn(this.x + offset, this.y - 8, 0, -speed, 'homing', lvl, dmg);
      }
      if (lvl === 5) {
        // 副散射
        PlayerBulletPool.spawn(this.x, this.y, -1, -1, 'scatter', lvl, dmg * 0.5);
        PlayerBulletPool.spawn(this.x, this.y, 1, -1, 'scatter', lvl, dmg * 0.5);
      }
    }

    if (Game.audio) Game.audio.play('shoot');
  }

  _useBomb() {
    if (this.bombs <= 0 && this.energy < Balance.energy.bombCost) return;
    if (this.bombs <= 0) {
      // 用能量
      if (this.energy < Balance.energy.bombCost) return;
      this.energy = 0;
    } else {
      this.bombs--;
    }
    this._doScreenClear(false);
    // 统计
    if (Game.stats) Game.stats.onBomb();
  }

  // 一键清屏技能（Q）：无需消耗炸弹/能量，但只清敌弹 + 轻量 AOE，且有冷却
  _useClearScreen() {
    if (this._clearCd !== undefined && this._clearCd > 0) {
      // 冷却中：提示
      if (Game.particles) Game.particles.spawnText(this.x, this.y - 24, '冷却中', '#ff3050');
      return;
    }
    this._clearCd = 8; // 8 秒冷却
    this._doScreenClear(true);
    // 提示文字
    if (Game.particles) Game.particles.spawnText(this.x, this.y - 24, '清屏！', '#00f0ff');
  }

  // 实际清屏效果
  _doScreenClear(light) {
    const cleared = EnemyBulletPool.clearAll();
    this.invincible = Math.max(this.invincible, light ? 0.8 : Balance.energy.bombInvincibleTime);
    // 全屏敌人 AOE（轻量 20% / 炸弹 30%）
    const pct = light ? 0.20 : Balance.energy.bombAoEDamagePercent;
    Game.enemies.forEach(e => {
      if (e.alive) e.damage(e.maxHp * pct, this);
    });
    if (Game.boss && Game.boss.alive) {
      Game.boss.damage(Game.boss.maxHp * pct, this);
    }
    // 视觉效果
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, '#ffffff', light ? 120 : 200);
    Effects.flash();
    if (Game.audio) Game.audio.play('bomb');
  }

  // 一键投降技能（X）：主动放弃本局，直接判定玩家死亡（不消耗复活币）
  _surrender() {
    if (!this.alive) return;
    // 视觉提示
    if (Game.particles) Game.particles.spawnText(this.x, this.y - 24, '投降！', '#ff3050');
    if (Game.audio) Game.audio.play('hurt');
    // 直接清空生命
    this.hp = 0;
    this._die(true);
  }

  takeDamage() {
    if (this.invincible > 0) return;
    if (this.shielded) {
      this.shielded = false;
      this.invincible = 0.6;
      if (Game.particles) Game.particles.spawnBurst(this.x, this.y, Balance.color.cyan, 20);
      if (Game.audio) Game.audio.play('shield');
      return;
    }
    this.hp--;
    this.tookDamageThisStage = true;
    this.invincible = Balance.player.invincibleTime;
    this.flashTimer = 0.3;
    this.weapon.level = Math.max(1, this.weapon.level - 1);
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, '#00f0ff', 30);
    if (Game.score) Game.score.breakCombo();
    if (Game.audio) Game.audio.play('hurt');
    if (this.hp <= 0) {
      this._die();
    }
  }

  _die(fromSurrender) {
    // 复活币：非投降被击坠时自动复活
    if (!fromSurrender && typeof SaveSystem !== 'undefined'
        && SaveSystem.getConsumableCount && SaveSystem.getConsumableCount('revive_token') > 0) {
      SaveSystem.useConsumable('revive_token');
      this.dead = false;
      this.alive = true;
      this.hp = 1;
      this.invincible = 2.5;
      EnemyBulletPool.clearAll();
      if (Game.particles) Game.particles.spawnBurst(this.x, this.y, '#ff2e88', 40);
      if (Game.particles) Game.particles.spawnText(this.x, this.y - 30, '复活币！', '#ff2e88');
      Effects.flash();
      if (Game.audio) Game.audio.play('powerup');
      return;
    }
    this.dead = true;
    this.alive = false;
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, '#ffaa00', 60);
    if (Game.audio) Game.audio.play('death');
    // 死亡倒计时（由 Game.update 检测并触发 Game Over，避免 setTimeout 跨重启污染）
    this.deathTimer = 0.8;
  }

  addGraze() {
    this.graze++;
    this.energy = Math.min(Balance.energy.max, this.energy + Balance.energy.fromGraze);
    if (Game.score) Game.score.addGraze();
    if (Game.particles) Game.particles.spawnGrazeFx(this.x, this.y);
    if (Game.audio) Game.audio.play('graze');
  }

  addEnergyFromKill() {
    this.energy = Math.min(Balance.energy.max, this.energy + Balance.energy.fromKill);
  }

  // 道具拾取
  pickup(kind) {
    if (kind === 'P') {
      if (this.weapon.level < Balance.player.maxWeaponLevel) {
        this.weapon.level++;
        if (Game.particles) Game.particles.spawnBurst(this.x, this.y, '#ffaa00', 12);
        if (Game.audio) Game.audio.play('powerup');
      } else {
        if (Game.score) Game.score.addScore(500);
      }
    } else if (kind === 'energy') {
      this.energy = Math.min(Balance.energy.max, this.energy + Balance.energy.fromPickup);
      if (Game.particles) Game.particles.spawnBurst(this.x, this.y, Balance.color.purple, 12);
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'bomb') {
      if (this.bombs < this.maxBombs) this.bombs++;
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'shield') {
      this.shielded = true;
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'life') {
      if (this.hp < this.maxHp) this.hp++;
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'option') {
      this.addOption();
    } else if (kind === 'weapon_scatter') {
      this.weapon.type = 'scatter';
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'weapon_laser') {
      this.weapon.type = 'laser';
      if (Game.audio) Game.audio.play('powerup');
    } else if (kind === 'weapon_homing') {
      this.weapon.type = 'homing';
      if (Game.audio) Game.audio.play('powerup');
    }
  }

  _onDraw(ctx) {
    if (!this.alive) return;

    const color = this.color;
    const accent = this.accent;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt * 0.3);

    // 机身辉光
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;

    ctx.globalAlpha = (this.invincible > 0 && Math.floor(this.age * 30) % 2 === 0) ? 0.5 : 1;
    ctx.fillStyle = color;

    // ===== 按战机类型画不同形状 =====
    switch (this.planeKey) {
      case 'interceptor':
        // 截击者：细长箭头型
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(-8, 4);
        ctx.lineTo(-14, 10);
        ctx.lineTo(-4, 10);
        ctx.lineTo(0, 16);
        ctx.lineTo(4, 10);
        ctx.lineTo(14, 10);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();
        break;
      case 'guardian':
        // 守护者：厚重梯形
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(-18, 4);
        ctx.lineTo(-14, 12);
        ctx.lineTo(-6, 10);
        ctx.lineTo(0, 16);
        ctx.lineTo(6, 10);
        ctx.lineTo(14, 12);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();
        // 额外装甲条纹
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(-12, 2); ctx.lineTo(12, 2); ctx.lineTo(8, -2); ctx.lineTo(-8, -2);
        ctx.closePath(); ctx.fill();
        break;
      case 'falcon':
        // 游隼：后掠翼箭型
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-20, 8);
        ctx.lineTo(-8, 8);
        ctx.lineTo(0, 16);
        ctx.lineTo(8, 8);
        ctx.lineTo(20, 8);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fill();
        break;
      default: // pioneer
        // 先锋号：标准三角
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-14, 10);
        ctx.lineTo(-6, 6);
        ctx.lineTo(0, 14);
        ctx.lineTo(6, 6);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
    }

    // 引擎尾焰
    ctx.shadowBlur = 8;
    const flick = 0.7 + Math.random() * 0.3;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(0, 16 + 6 * flick);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(0, 13 + 4 * flick);
    ctx.lineTo(2, 10);
    ctx.closePath();
    ctx.fill();

    // 内核
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Utils.TAU);
    ctx.fill();

    // 护盾环
    if (this.shielded) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = Balance.color.cyan;
      ctx.strokeStyle = Balance.color.cyan;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 + Math.sin(this.age * 6) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Utils.TAU);
      ctx.stroke();
    }

    // 低速精确判定点
    if (this.slowMode) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff2e88';
      ctx.fillStyle = '#ff2e88';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.hitboxRadius, 0, Utils.TAU);
      ctx.fill();
      // 擦弹判定圈
      ctx.strokeStyle = 'rgba(255,46,136,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.grazeRadius, 0, Utils.TAU);
      ctx.stroke();
    }
    ctx.restore();

    // 僚机绘制
    for (let i = 0; i < this.options.length; i++) {
      this.options[i].draw(ctx);
    }
  }
}
