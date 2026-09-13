// ====== src/entities/Option.js ======
// 僚机：跟随玩家，协同开火

class Option extends Entity {
  constructor() {
    super();
    this.radius = 8;
    this.formation = 'tight';   // tight / spread
    this.index = 0;              // 第几号僚机（0 或 1）
    this.fireCooldown = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  setup(player, index) {
    this.index = index;
    this.formation = player.formation;
    this.x = player.x;
    this.y = player.y;
    this.fireCooldown = 0;
  }

  _onUpdate(dt) {
    // 跟随目标位置
    this._computeTargetPos();
    // 平滑跟随
    this.x = Utils.lerp(this.x, this.targetX, 0.18);
    this.y = Utils.lerp(this.y, this.targetY, 0.18);

    // 自动开火
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this._fire();
      const cd = Balance.player.fireCooldown[Game.player.weapon.type] || 0.12;
      this.fireCooldown = cd * 1.4; // 僚机射速稍慢
    }
  }

  _computeTargetPos() {
    const player = Game.player;
    if (!player) return;
    this.formation = player.formation;
    const offset = this.index === 0 ? -1 : 1;
    if (this.formation === 'tight') {
      // 紧贴玩家下方两侧
      this.targetX = player.x + offset * 18;
      this.targetY = player.y + 14;
    } else {
      // 展开：远离玩家两侧
      this.targetX = player.x + offset * 50;
      this.targetY = player.y + 8;
    }
  }

  _fire() {
    const player = Game.player;
    if (!player || !player.alive) return;
    const lvl = player.weapon.level;
    const damage = lvl * Balance.player.optionFireMultiplier;
    const w = player.weapon.type;
    const speed = Balance.bullet.playerScatter;

    if (w === 'scatter') {
      // 直射
      PlayerBulletPool.spawn(this.x, this.y - 8, 0, -speed, 'scatter', lvl, damage);
    } else if (w === 'laser') {
      // 短激光
      PlayerBulletPool.spawn(this.x, this.y - 8, 0, -Balance.bullet.playerScatter * 1.5, 'laser', lvl, damage);
    } else if (w === 'homing') {
      PlayerBulletPool.spawn(this.x, this.y - 8, 0, -speed, 'homing', lvl, damage);
    }
    if (Game.audio) Game.audio.play('shoot');
  }

  _onDraw(ctx) {
    const player = Game.player;
    const w = player ? player.weapon.type : 'scatter';
    const color = w === 'laser' ? '#00f0ff' : w === 'homing' ? '#9b5cff' : Balance.color.cyan;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    // 小三角僚机
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 10);
    ctx.lineTo(this.x - 7, this.y + 6);
    ctx.lineTo(this.x + 7, this.y + 6);
    ctx.closePath();
    ctx.fill();
    // 内核
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 3, 0, Utils.TAU);
    ctx.fill();
    ctx.restore();
  }
}
