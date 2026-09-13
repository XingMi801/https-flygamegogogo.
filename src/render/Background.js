// ====== src/render/Background.js ======
// 三层视差背景：远星点 + 全息网格 + 流光粒子

const Background = {
  // 远层星点
  farStars: [],
  // 中层网格滚动
  gridScrollY: 0,
  // 近层流光粒子带
  streaks: [],

  init() {
    this.farStars = [];
    for (let i = 0; i < 80; i++) {
      this.farStars.push({
        x: Math.random() * Balance.width,
        y: Math.random() * Balance.height,
        r: Utils.rndRange(0.5, 1.5),
        speed: Utils.rndRange(0.2, 0.6),
        twinkle: Math.random() * Utils.TAU,
      });
    }
    this.streaks = [];
    for (let i = 0; i < 12; i++) {
      this.streaks.push({
        x: Math.random() * Balance.width,
        y: Math.random() * Balance.height,
        len: Utils.rndRange(20, 80),
        speed: Utils.rndRange(1.8, 3.5),
        color: Utils.pick(['#00f0ff','#9b5cff','#ff2e88']),
        alpha: Utils.rndRange(0.3, 0.8),
      });
    }
    this.gridScrollY = 0;
  },

  update(dt) {
    // 远星
    for (let i = 0; i < this.farStars.length; i++) {
      const s = this.farStars[i];
      s.y += s.speed * 60 * dt;
      s.twinkle += dt * 3;
      if (s.y > Balance.height) {
        s.y = -2;
        s.x = Math.random() * Balance.width;
      }
    }
    // 网格滚动
    this.gridScrollY += 1.0 * 60 * dt;
    if (this.gridScrollY > 64) this.gridScrollY -= 64;
    // 流光
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      s.y += s.speed * 60 * dt;
      if (s.y > Balance.height + 80) {
        s.y = -80;
        s.x = Math.random() * Balance.width;
      }
    }
  },

  draw(ctx, time) {
    // 深空底色
    const grad = ctx.createLinearGradient(0, 0, 0, Balance.height);
    grad.addColorStop(0, '#05060f');
    grad.addColorStop(0.5, '#0a0e22');
    grad.addColorStop(1, '#05060f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, Balance.width, Balance.height);

    // 远星
    ctx.save();
    for (let i = 0; i < this.farStars.length; i++) {
      const s = this.farStars[i];
      const a = 0.5 + Math.sin(s.twinkle) * 0.3;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Utils.TAU);
      ctx.fill();
    }
    ctx.restore();

    // 全息网格（远景地平线效果）
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = Balance.color.cyan;
    ctx.lineWidth = 1;
    const gridSize = 64;
    const offsetY = this.gridScrollY;
    for (let y = -gridSize; y < Balance.height + gridSize; y += gridSize) {
      const py = y + offsetY;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(Balance.width, py);
      ctx.stroke();
    }
    for (let x = 0; x < Balance.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, Balance.height);
      ctx.stroke();
    }
    ctx.restore();

    // 近层流光带（水平线）
    ctx.save();
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      ctx.globalAlpha = s.alpha * (0.5 + Math.sin(time * 2 + i) * 0.3);
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.color;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.len);
      ctx.stroke();
    }
    ctx.restore();

    // 顶部底部暗角
    ctx.save();
    const vg = ctx.createLinearGradient(0, 0, 0, 60);
    vg.addColorStop(0, 'rgba(5,6,15,0.7)');
    vg.addColorStop(1, 'rgba(5,6,15,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, Balance.width, 60);
    const vg2 = ctx.createLinearGradient(0, Balance.height - 60, 0, Balance.height);
    vg2.addColorStop(0, 'rgba(5,6,15,0)');
    vg2.addColorStop(1, 'rgba(5,6,15,0.7)');
    ctx.fillStyle = vg2;
    ctx.fillRect(0, Balance.height - 60, Balance.width, 60);
    ctx.restore();
  },
};
