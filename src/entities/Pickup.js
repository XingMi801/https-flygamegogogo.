// ====== src/entities/Pickup.js ======
// 道具：P/能量/Bomb/护盾/生命/僚机/武器切换

class Pickup extends Entity {
  constructor(x, y, kind) {
    super(x, y);
    this.kind = kind;  // P / energy / bomb / shield / life / option / weapon_scatter / weapon_laser / weapon_homing
    this.radius = 10;
    this.vx = (Math.random() - 0.5) * 60;
    this.vy = -50;
    this.life = 12;     // 自动消失
    this.gravity = 0;
    // 后期重力让它稳定下落
    this.maxVy = 100;
  }
  _onUpdate(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // 缓慢下落，玩家可以吸过来（近距离自动吸）
    if (Game.player) {
      const d = Utils.dist(this.x, this.y, Game.player.x, Game.player.y);
      if (d < 80) {
        // 吸引
        const dx = Game.player.x - this.x;
        const dy = Game.player.y - this.y;
        const len = d || 1;
        this.vx = Utils.lerp(this.vx, dx/len * 300, 0.15);
        this.vy = Utils.lerp(this.vy, dy/len * 300, 0.15);
      } else {
        this.vy = Utils.lerp(this.vy, this.maxVy, 0.05);
        this.vx = Utils.lerp(this.vx, 0, 0.05);
      }
    }
    super._onUpdate(dt);
    // 边界
    if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > Balance.width - this.radius) { this.x = Balance.width - this.radius; this.vx = -Math.abs(this.vx) * 0.5; }
    if (this.y > Balance.height + 20) this.dead = true;
  }
  _onDraw(ctx) {
    const colors = {
      P: '#ffaa00', energy: '#9b5cff', bomb: '#00f0ff', shield: '#00f0ff',
      life: '#00ff80', option: '#ffe000', weapon_scatter: '#ffaa00',
      weapon_laser: '#00f0ff', weapon_homing: '#9b5cff',
    };
    const color = colors[this.kind] || '#ffffff';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.age * 1.5);
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // 六边形外框
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Utils.TAU;
      const px = Math.cos(a) * 10;
      const py = Math.sin(a) * 10;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = Utils.hexToRgba(color, 0.2);
    ctx.fill();
    // 内部图标（不旋转）
    ctx.rotate(-this.age * 1.5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = this._label();
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  _label() {
    const map = {
      P: 'P', energy: 'E', bomb: 'B', shield: 'S', life: '1',
      option: 'O', weapon_scatter: 'SC', weapon_laser: 'LA', weapon_homing: 'HO',
    };
    return map[this.kind] || '?';
  }
}
