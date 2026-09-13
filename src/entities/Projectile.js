// ====== src/entities/Projectile.js ======
// 子弹：玩家弹 / 敌弹，使用对象池

// ===== 玩家子弹 =====
class PlayerBullet extends Entity {
  constructor() { super(); this.reset(); }
  reset() {
    this.kind = 'scatter';   // scatter / laser / homing
    this.level = 1;
    this.damage = 1;
    this.pierce = 0;          // 激光穿透剩余次数（-1=无限）
    this.target = null;       // homing 目标
    this.homingTimer = 0;
    this.color = Balance.color.playerBullet;
    this.active = false;
    this.radius = 4;
  }
  spawn(x, y, vx, vy, kind, level, damage = 1) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.kind = kind; this.level = level; this.damage = damage;
    this.color = kind === 'laser' ? '#00f0ff' : kind === 'homing' ? '#9b5cff' : Balance.color.playerBullet;
    this.radius = kind === 'laser' ? 3 : 4;
    this.pierce = kind === 'laser' ? -1 : 0;
    this.homingTimer = 0;
    this.target = null;
    this.active = true;
    this.alive = true; this.dead = false;
    this.age = 0;
  }
  _onUpdate(dt) {
    // homing 每 0.2s 重新指向最近敌人
    if (this.kind === 'homing') {
      this.homingTimer -= dt;
      if (this.homingTimer <= 0 || !this.target || !this.target.alive) {
        this.target = Game.findNearestEnemy(this.x, this.y, 600);
        this.homingTimer = 0.2;
      }
      if (this.target) {
        const desiredVx = this.target.x - this.x;
        const desiredVy = this.target.y - this.y;
        const len = Math.sqrt(desiredVx*desiredVx + desiredVy*desiredVy) || 1;
        const speed = Balance.bullet.playerHoming;
        const tvx = desiredVx/len * speed;
        const tvy = desiredVy/len * speed;
        // 平滑转向（商店制导矩阵可提升灵敏度）
        const steer = PlayerBulletPool.homingAgile ? 0.32 : 0.15;
        this.vx = Utils.lerp(this.vx, tvx, steer);
        this.vy = Utils.lerp(this.vy, tvy, steer);
      }
    }
    // 出界
    if (this.y < -10 || this.y > Balance.height + 10 || this.x < -10 || this.x > Balance.width + 10) {
      this.active = false; this.dead = true;
    }
  }
  _onDraw(ctx) {
    ctx.save();
    if (this.kind === 'laser') {
      // 激光：长条 + 强辉光
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x - 2, this.y - 14, 4, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 1, this.y - 14, 2, 28);
    } else if (this.kind === 'homing') {
      // 追踪弹：圆形 + 拖尾
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Utils.TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.4, 0, Utils.TAU);
      ctx.fill();
    } else {
      // 散射：圆+光
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Utils.TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.4, 0, Utils.TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// 玩家子弹对象池
const PlayerBulletPool = {
  pool: [],
  homingAgile: false,   // 商店"制导矩阵"：追踪转向灵敏度
  init(size = 500) {
    this.pool = [];
    for (let i = 0; i < size; i++) this.pool.push(new PlayerBullet());
  },
  spawn(x, y, vx, vy, kind, level, damage) {
    let b = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) { b = this.pool[i]; break; }
    }
    if (!b) { b = new PlayerBullet(); this.pool.push(b); }
    b.spawn(x, y, vx, vy, kind, level, damage);
    return b;
  },
  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const b = this.pool[i];
      if (!b.active) continue;
      b.update(dt);
      if (b.dead) { b.active = false; }
    }
  },
  draw(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.pool[i].draw(ctx);
    }
  },
  forEachActive(fn) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) fn(this.pool[i]);
    }
  },
  clear() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false;
  },
};

// ===== 敌弹 =====
class EnemyBullet extends Entity {
  constructor() { super(); this.reset(); }
  reset() {
    this.bMode = 'straight'; // straight / accel / decel / curve / spiral / homing
    this.spinAngle = 0;     // 螺旋自旋角度（度/秒）
    this.curveAngle = 0;    // 曲线偏移
    this.curveAmount = 0;   // 度/秒
    this.life = 0;
    this.maxLife = 8;       // 自动消失
    this.color = Balance.color.enemyRed;
    this.radius = 5;
    this.active = false;
    this.bornSpeed = 0;     // 原速度
    this.accel = 0;          // 加速度（accel/decel）
    this.homingStrength = 0;
    this.target = null;
    this.split = false;      // 分裂标记
    this.splitTime = 0;
    this.splitCount = 0;
    this.ownerBoss = null;   // 用于分裂时记录来源
    this.bornAngle = 0;      // 出生角度（wave 模式基准）
    this.waveAmp = 0;        // 蛇形摆幅（度）
    this.waveFreq = 2;       // 蛇形频率（Hz）
  }
  spawn(x, y, vx, vy, opts = {}) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.bMode = opts.mode || 'straight';
    this.color = opts.color || Balance.color.enemyRed;
    this.radius = opts.radius || 5;
    this.spinAngle = opts.spinAngle || 0;
    this.curveAmount = opts.curveAmount || 0;
    this.bornSpeed = Math.sqrt(vx*vx + vy*vy);
    this.accel = opts.accel || 0;
    this.life = 0;
    this.maxLife = opts.maxLife || 8;
    this.homingStrength = opts.homingStrength || 0;
    this.target = null;
    this.split = !!opts.split;
    this.splitTime = opts.splitTime || 0;
    this.splitCount = opts.splitCount || 3;
    this.ownerBoss = opts.ownerBoss || null;
    this.bornAngle = Utils.angleFromVec(vx, vy);
    this.waveAmp = opts.waveAmp || 0;
    this.waveFreq = opts.waveFreq || 2;
    this.active = true; this.alive = true; this.dead = false;
    this.age = 0;
    this.grazed = false;  // 擦弹标记，避免同一颗子弹多次擦弹
    this.rotation = Utils.angleFromVec(vx, vy);
  }
  _onUpdate(dt) {
    this.life += dt;
    if (this.life > this.maxLife) { this.active = false; this.dead = true; return; }

    switch (this.bMode) {
      case 'accel':
        // 在原速度上加速
        if (this.accel) {
          const cur = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
          const newSpeed = Math.min(cur + this.accel * dt, 600);
          const ang = Math.atan2(this.vy, this.vx);
          this.vx = Math.cos(ang) * newSpeed;
          this.vy = Math.sin(ang) * newSpeed;
        }
        break;
      case 'decel':
        if (this.accel) {
          const cur = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
          const newSpeed = Math.max(cur - this.accel * dt, 30);
          const ang = Math.atan2(this.vy, this.vx);
          this.vx = Math.cos(ang) * newSpeed;
          this.vy = Math.sin(ang) * newSpeed;
        }
        break;
      case 'curve':
        // 围绕中心曲线
        if (this.curveAmount) {
          this.rotation += this.curveAmount * dt;
          const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
          const r = Utils.rad(this.rotation);
          this.vx = Math.cos(r) * speed;
          this.vy = Math.sin(r) * speed;
        }
        break;
      case 'spiral':
        // 子弹自身方向旋转（弹幕图案螺旋）
        if (this.spinAngle) {
          this.rotation += this.spinAngle * dt;
          const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
          const r = Utils.rad(this.rotation);
          this.vx = Math.cos(r) * speed;
          this.vy = Math.sin(r) * speed;
        }
        break;
      case 'homing':
        if (this.homingStrength > 0) {
          if (!this.target || !this.target.alive) {
            this.target = Game.player;
          }
          if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const tvx = dx/len * this.bornSpeed;
            const tvy = dy/len * this.bornSpeed;
            this.vx = Utils.lerp(this.vx, tvx, this.homingStrength * dt);
            this.vy = Utils.lerp(this.vy, tvy, this.homingStrength * dt);
          }
        }
        break;
      case 'wave':
        // 蛇形弹：前进方向绕出生角度正弦摆动
        if (this.waveAmp) {
          const wob = Math.sin(this.life * this.waveFreq * 6.283) * this.waveAmp;
          const r = Utils.rad(this.bornAngle + wob);
          this.vx = Math.cos(r) * this.bornSpeed;
          this.vy = Math.sin(r) * this.bornSpeed;
          this.rotation = this.bornAngle + wob;
        }
        break;
      // 'straight' 无变化
    }

    // 分裂检测
    if (this.split && this.life >= this.splitTime) {
      this._doSplit();
      this.active = false; this.dead = true;
      return;
    }

    // 出界（保留一会儿，可能返回）
    if (this.x < -50 || this.x > Balance.width + 50 || this.y < -50 || this.y > Balance.height + 50) {
      this.active = false; this.dead = true;
    }
  }
  _doSplit() {
    if (!this.ownerBoss) return;
    const speed = this.bornSpeed * 0.9;
    for (let i = 0; i < this.splitCount; i++) {
      const a = (i / this.splitCount) * 360 + Math.random() * 30;
      const r = Utils.rad(a);
      EnemyBulletPool.spawn(this.x, this.y, Math.cos(r) * speed, Math.sin(r) * speed, {
        color: this.color, radius: 4, mode: 'straight',
      });
    }
  }
  _onDraw(ctx) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Utils.TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.35, 0, Utils.TAU);
    ctx.fill();
    ctx.restore();
  }
}

// 敌弹对象池
const EnemyBulletPool = {
  pool: [],
  init(size = 800) {
    this.pool = [];
    for (let i = 0; i < size; i++) this.pool.push(new EnemyBullet());
  },
  spawn(x, y, vx, vy, opts) {
    let b = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) { b = this.pool[i]; break; }
    }
    if (!b) { b = new EnemyBullet(); this.pool.push(b); }
    b.spawn(x, y, vx, vy, opts);
    return b;
  },
  // 从角度发射
  spawnAt(x, y, angleDeg, speed, opts = {}) {
    const r = Utils.rad(angleDeg);
    return this.spawn(x, y, Math.cos(r) * speed, Math.sin(r) * speed, opts);
  },
  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const b = this.pool[i];
      if (!b.active) continue;
      b.update(dt);
      if (b.dead) b.active = false;
    }
  },
  draw(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.pool[i].draw(ctx);
    }
  },
  forEachActive(fn) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) fn(this.pool[i]);
    }
  },
  clear() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false;
  },
  // 清屏（Bomb 效果）
  clearAll() {
    let cleared = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) { this.pool[i].active = false; cleared++; }
    }
    return cleared;
  },
};
