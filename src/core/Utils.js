// ====== src/core/Utils.js ======
// 数学/随机/颜色等通用工具

const Utils = {
  // 限制范围
  clamp(v, min, max) { return v < min ? min : v > max ? max : v; },

  // 线性插值
  lerp(a, b, t) { return a + (b - a) * t; },

  // 两点距离平方
  dist2(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy;
  },

  // 两点距离
  dist(x1, y1, x2, y2) { return Math.sqrt(Utils.dist2(x1, y1, x2, y2)); },

  // 圆形碰撞检测（半径平方）
  circleHit(x1, y1, r1, x2, y2, r2) {
    const rsum = r1 + r2;
    return Utils.dist2(x1, y1, x2, y2) < rsum * rsum;
  },

  // 角度转弧度
  rad(deg) { return deg * Math.PI / 180; },

  // 弧度转角度
  deg(rad) { return rad * 180 / Math.PI; },

  // 角度差（-180~180）
  angleDiff(a, b) {
    let d = (b - a) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  },

  // 朝目标方向插值旋转
  rotateToward(curAngle, targetAngle, maxStep) {
    const diff = Utils.angleDiff(curAngle, targetAngle);
    if (Math.abs(diff) <= maxStep) return targetAngle;
    return (curAngle + Math.sign(diff) * maxStep + 360) % 360;
  },

  // 单位向量从角度（度）
  vecFromAngle(deg) {
    const r = Utils.rad(deg);
    return { x: Math.cos(r), y: Math.sin(r) };
  },

  // 角度（度）从向量
  angleFromVec(x, y) {
    return (Utils.deg(Math.atan2(y, x)) + 360) % 360;
  },

  // 0-1 之间随机
  rnd() { return Math.random(); },

  // 整数随机 [min, max]
  rndInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },

  // 浮点随机 [min, max)
  rndRange(min, max) { return min + Math.random() * (max - min); },

  // 概率命中
  chance(p) { return Math.random() < p; },

  // 选一个
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  // hex -> rgba
  hexToRgba(hex, alpha = 1) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  // 绘制带辉光的圆
  drawGlowCircle(ctx, x, y, r, color, glow = 8) {
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // 绘制带辉光的线
  drawGlowLine(ctx, x1, y1, x2, y2, color, width = 2, glow = 10) {
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  },

  // 绘制切角矩形（科技风）
  clipCorner(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - r);
    ctx.lineTo(x + w - r, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.closePath();
  },

  // 简单 1D 平滑噪声（用于背景闪烁）
  noise(t) {
    return (Math.sin(t * 12.9898) * 43758.5453) % 1;
  },

  // TAU
  TAU: Math.PI * 2,
};
