// ====== src/systems/ParticleSystem.js ======
// 粒子系统：爆炸/火花/冲击波/文字飘字

const ParticleSystem = {
  pool: [],
  maxPool: 600,
  // 文字飘字
  texts: [],

  init(size = 600) {
    this.pool = [];
    this.maxPool = size;
    for (let i = 0; i < size; i++) {
      this.pool.push(this._makeParticle());
    }
  },

  _makeParticle() {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 2, color: '#fff',
      gravity: 0, friction: 1,
      type: 'spark',  // spark / debris / shockwave / smoke
      rotation: 0, spin: 0,
      active: false,
    };
  },

  _spawn(opts) {
    let p = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) { p = this.pool[i]; break; }
    }
    if (!p) {
      if (this.pool.length >= this.maxPool) return null;
      p = this._makeParticle();
      this.pool.push(p);
    }
    Object.assign(p, {
      x: opts.x || 0, y: opts.y || 0,
      vx: opts.vx || 0, vy: opts.vy || 0,
      life: opts.maxLife || 1, maxLife: opts.maxLife || 1,
      size: opts.size || 2, color: opts.color || '#fff',
      gravity: opts.gravity || 0, friction: opts.friction || 1,
      type: opts.type || 'spark',
      rotation: opts.rotation || 0, spin: opts.spin || 0,
      active: true,
    });
    return p;
  },

  // 爆炸：碎片 + 火花（缩短寿命，避免特效拖沓）
  spawnExplosion(x, y, color = '#ffaa00', count = 16) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Utils.TAU;
      const speed = 80 + Math.random() * 220;
      this._spawn({
        x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        maxLife: 0.25 + Math.random() * 0.3, size: 2 + Math.random() * 3,
        color, gravity: 200, friction: 0.92, type: i % 2 ? 'debris' : 'spark',
        spin: (Math.random() - 0.5) * 10,
      });
    }
    // 火花
    for (let i = 0; i < count / 2; i++) {
      const ang = Math.random() * Utils.TAU;
      const speed = 200 + Math.random() * 300;
      this._spawn({
        x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        maxLife: 0.12 + Math.random() * 0.12, size: 1,
        color: '#ffffff', friction: 0.85, type: 'spark',
      });
    }
  },

  // 短粒子环
  spawnBurst(x, y, color = '#fff', count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Utils.TAU + Math.random() * 0.3;
      const speed = 100 + Math.random() * 150;
      this._spawn({
        x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        maxLife: 0.25, size: 2, color, friction: 0.9, type: 'spark',
      });
    }
  },

  // 冲击波环
  spawnShockwave(x, y, color = '#fff') {
    this._spawn({
      x, y, vx: 0, vy: 0,
      maxLife: 0.35, size: 10, color, type: 'shockwave',
    });
  },

  // 擦弹闪光
  spawnGrazeFx(x, y) {
    for (let i = 0; i < 4; i++) {
      this._spawn({
        x: x + Utils.rndRange(-4, 4), y: y + Utils.rndRange(-4, 4),
        vx: Utils.rndRange(-50, 50), vy: Utils.rndRange(-50, 50),
        maxLife: 0.25, size: 1.5, color: '#ffffff', friction: 0.9, type: 'spark',
      });
    }
  },

  // 文字飘字
  spawnText(x, y, text, color = '#00f0ff') {
    this.texts.push({
      x, y, text, color, life: 1.0, maxLife: 1.0, vy: -50,
    });
    if (this.texts.length > 30) this.texts.shift();
  },

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    // 文字
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 0.95;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  },

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;
      if (p.type === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (1 - a) * 80, 0, Utils.TAU);
        ctx.stroke();
      } else if (p.type === 'debris') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else {
        // spark
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Utils.TAU);
        ctx.fill();
      }
    }
    // 文字
    ctx.shadowBlur = 6;
    for (let i = 0; i < this.texts.length; i++) {
      const t = this.texts[i];
      ctx.globalAlpha = t.life / t.maxLife;
      ctx.shadowColor = t.color;
      ctx.fillStyle = t.color;
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  },

  clear() {
    for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false;
    this.texts = [];
  },
};
