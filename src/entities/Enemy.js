// ====== src/entities/Enemy.js ======
// 敌机：6 种类型 + 自爆 / 精英护盾

// 网络热梗嘲讽语（随机分配给小怪）
const TAUNT_PHRASES = [
  '就这？',
  '你不行啊',
  '菜就多练',
  '退退退',
  '你礼貌吗',
  '真的栓Q',
  '我不李姐',
  '如何呢又能怎',
  '老叟戏顽童',
  '不知道，我的身材很曼妙',
  '大可不必',
  '蚌埠住了',
  '夺笋啊',
  '你已急哭',
  '助我破鼎',
  '胆子真是肥嘟嘟的',
];

class Enemy extends Entity {
  constructor(type, x, y, opts = {}) {
    super(x, y);
    const cfg = Balance.enemy[type] || Balance.enemy.grunt;
    this.type = type;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.scoreValue = cfg.score;
    this.radius = cfg.radius;
    this.speed = cfg.speed;
    this.shoot = cfg.shoot || false;
    this.shootInterval = cfg.shootInterval || 1.5;
    this.shootTimer = 0;
    this.hasShield = cfg.hasShield || false;
    this.shieldHp = this.hasShield ? Math.ceil(cfg.hp * 0.5) : 0;
    this.color = type === 'elite' ? '#9b5cff' : type === 'bomber' ? '#ffaa00' : type === 'ram' ? '#ff3050' : '#ff7050';
    this.entryPattern = opts.pattern || 'line';   // line / arc
    this.dropGuaranteed = opts.dropGuaranteed || null;
    // 入场目标位置 / 行为参数
    this.entryTime = 0;
    this.targetY = opts.targetY || 80;
    this.amp = opts.amp || 80;
    this.freq = opts.freq || 1.5;
    this.phase = opts.phase || Math.random() * Math.PI * 2;
    this.startX = x;
    this.arrived = false;
    this.exploded = false;
    this.explodeBullets = cfg.explodeBullets || 0;
    // 嘲讽文字：约 25% 概率随机分配一条热梗
    this.taunt = Math.random() < 0.25 ? Utils.pick(TAUNT_PHRASES) : null;
    this.tauntOffsetY = 0;
  }

  _onUpdate(dt) {
    this.entryTime += dt;
    switch (this.type) {
      case 'grunt':
        this.vy = this.speed;
        this.vx = 0;
        break;
      case 'zigzag':
        this.vy = this.speed;
        this.vx = Math.sin(this.entryTime * this.freq + this.phase) * this.amp;
        break;
      case 'arc':
        // 入场弧线后悬停射击
        if (!this.arrived) {
          this.vy = this.speed * 0.5;
          this.vx = Math.sin(this.entryTime * 1.5 + this.phase) * this.amp * 0.7;
          if (this.y >= this.targetY) { this.arrived = true; this.vy = 0; this.vx *= 0.3; }
        } else {
          this.vy = Math.sin(this.entryTime * 0.5) * 10;
          this.vx = Math.sin(this.entryTime * 0.7 + this.phase) * this.amp * 0.3;
        }
        break;
      case 'ram':
        // 高速冲向玩家
        if (Game.player) {
          const dx = Game.player.x - this.x;
          const dy = Game.player.y - this.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          this.vx = dx/d * this.speed;
          this.vy = dy/d * this.speed;
        } else {
          this.vy = this.speed;
        }
        break;
      case 'bomber':
        // 接近后爆炸散弹
        this.vy = this.speed;
        this.vx = Math.sin(this.entryTime * 0.8 + this.phase) * 30;
        // 离玩家 100px 内或飞到一定位置就自爆
        if (Game.player) {
          const d = Utils.dist(this.x, this.y, Game.player.x, Game.player.y);
          if (d < 120 || this.y > Balance.height - 100) {
            this._explode();
          }
        }
        break;
      case 'elite':
        // 缓慢下降，规律射击
        if (this.y < this.targetY) {
          this.vy = this.speed;
          this.vx = 0;
        } else {
          this.vy = Math.sin(this.entryTime * 0.5) * 20;
          this.vx = Math.sin(this.entryTime * 0.6 + this.phase) * this.amp * 0.5;
        }
        break;
    }

    super._onUpdate(dt);

    // 射击
    if (this.shoot && this.y > 0) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this._shoot();
        this.shootTimer = this.shootInterval;
      }
    }

    // 出界
    if (this.offscreen(50)) {
      this.dead = true;
      // 逃逸（不计入击杀）
      if (Game.score) Game.score.markEscaped(this);
    }
  }

  _shoot() {
    if (!Game.player) return;
    const speed = Balance.bullet.enemyStraight;
    const dx = Game.player.x - this.x;
    const dy = Game.player.y - this.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    EnemyBulletPool.spawn(this.x, this.y + this.radius, dx/d * speed, dy/d * speed, {
      color: this.color, radius: 5,
    });
    if (Game.audio) Game.audio.play('enemyShoot');
  }

  _explode() {
    if (this.exploded) return;
    this.exploded = true;
    // 散弹
    const n = this.explodeBullets || 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360 + Math.random() * 20;
      const r = Utils.rad(a);
      EnemyBulletPool.spawn(this.x, this.y, Math.cos(r) * 200, Math.sin(r) * 200, {
        color: '#ffaa00', radius: 5,
      });
    }
    this.hp = 0;
    this.dead = true;
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, '#ffaa00', 18);
    if (Game.audio) Game.audio.play('explode');
  }

  damage(amount, source) {
    if (this.shieldHp > 0) {
      this.shieldHp--;
      if (this.shieldHp <= 0) {
        this.hasShield = false;
        if (Game.particles) Game.particles.spawnBurst(this.x, this.y, Balance.color.cyan, 12);
      }
      return;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this._die(source);
    }
  }

  _die(source) {
    this.dead = true;
    this.alive = false;
    if (Game.score) Game.score.addKill(this);
    if (Game.particles) Game.particles.spawnExplosion(this.x, this.y, this.color, 14);
    if (Game.audio) Game.audio.play('explode');
    if (Game.player) Game.player.addEnergyFromKill();
    // 掉落
    this._maybeDrop();
  }

  _maybeDrop() {
    let kind = null;
    if (this.dropGuaranteed) {
      kind = this.dropGuaranteed;
    } else {
      const rates = this.type === 'elite' ? Balance.dropRates.elite : Balance.dropRates.normal;
      if (Utils.chance(rates.P)) kind = 'P';
      else if (Utils.chance(rates.energy)) kind = 'energy';
      else if (Utils.chance(rates.bomb)) kind = 'bomb';
      else if (Utils.chance(rates.shield)) kind = 'shield';
      else if (Utils.chance(rates.life)) kind = 'life';
      else if (this.type === 'elite' && Utils.chance(rates.option)) kind = 'option';
    }
    if (kind && Game.pickups) {
      Game.pickups.push(new Pickup(this.x, this.y, kind));
    }
  }

  _onDraw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    switch (this.type) {
      case 'grunt':
        // 倒三角小敌
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(-10, -8);
        ctx.lineTo(10, -8);
        ctx.closePath();
        ctx.fill();
        break;
      case 'zigzag':
        // 菱形
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'arc':
        // 圆形带翼
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Utils.TAU);
        ctx.fill();
        ctx.fillStyle = '#ff7050';
        ctx.fillRect(-16, -3, 8, 6);
        ctx.fillRect(8, -3, 8, 6);
        break;
      case 'ram':
        // 火箭型
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(-8, -10);
        ctx.lineTo(0, -6);
        ctx.lineTo(8, -10);
        ctx.closePath();
        ctx.fill();
        break;
      case 'bomber':
        // 球+红点
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Utils.TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff3050';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Utils.TAU);
        ctx.fill();
        break;
      case 'elite':
        // 大六边形
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Utils.TAU;
          const px = Math.cos(a) * 18;
          const py = Math.sin(a) * 18;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Utils.TAU);
        ctx.fill();
        break;
    }

    // 护盾
    if (this.hasShield) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = Balance.color.cyan;
      ctx.strokeStyle = Balance.color.cyan;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Utils.TAU);
      ctx.stroke();
    }

    // 血条（精英）
    if (this.type === 'elite' && this.hp < this.maxHp) {
      ctx.shadowBlur = 0;
      const w = 30;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-w/2, -this.radius - 8, w, 3);
      ctx.fillStyle = '#ff3050';
      ctx.fillRect(-w/2, -this.radius - 8, w * (this.hp / this.maxHp), 3);
    }

    ctx.restore();

    // 嘲讽文字气泡
    if (this.taunt) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const bob = Math.sin(this.age * 3) * 2;
      const ty = -this.radius - 22 + bob;
      // 气泡背景
      ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(this.taunt);
      const bw = metrics.width + 12;
      const bh = 18;
      ctx.fillStyle = 'rgba(20,28,50,0.92)';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      // 圆角矩形
      const bx = -bw / 2;
      const by = ty - bh / 2;
      ctx.beginPath();
      ctx.moveTo(bx + 4, by);
      ctx.lineTo(bx + bw - 4, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 4);
      ctx.lineTo(bx + bw, by + bh - 4);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 4, by + bh);
      ctx.lineTo(bx + 4, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 4);
      ctx.lineTo(bx, by + 4);
      ctx.quadraticCurveTo(bx, by, bx + 4, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 文字
      ctx.shadowBlur = 4;
      ctx.shadowColor = this.color;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.taunt, 0, ty);
      ctx.restore();
    }
  }
}
