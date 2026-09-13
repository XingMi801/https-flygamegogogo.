// ====== src/render/Renderer.js ======
// 主绘制器：统一调度渲染顺序

const Renderer = {
  ctx: null,
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // 高 DPI 支持
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Balance.width * dpr;
    canvas.height = Balance.height * dpr;
    canvas.style.width = Balance.width + 'px';
    canvas.style.height = Balance.height + 'px';
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = true;
  },

  getCtx() { return this.ctx; },

  draw(time) {
    const ctx = this.ctx;
    // 清屏
    ctx.clearRect(0, 0, Balance.width, Balance.height);

    // 1. 背景
    Background.draw(ctx, time);

    // 2. 道具
    for (let i = 0; i < Game.pickups.length; i++) {
      if (Game.pickups[i].alive) Game.pickups[i].draw(ctx);
    }

    // 3. 玩家子弹
    PlayerBulletPool.draw(ctx);

    // 4. 敌弹
    EnemyBulletPool.draw(ctx);

    // 5. 敌人
    for (let i = 0; i < Game.enemies.length; i++) {
      if (Game.enemies[i].alive) Game.enemies[i].draw(ctx);
    }

    // 6. Boss
    if (Game.boss && Game.boss.alive) Game.boss.draw(ctx);

    // 7. 玩家
    if (Game.player && Game.player.alive) Game.player.draw(ctx);

    // 8. 粒子（最上层）
    if (Game.particles) Game.particles.draw(ctx);

    // 9. UI
    if (Game.hud) Game.hud.draw(ctx);
    if (Game.bossUI && Game.boss) Game.bossUI.draw(ctx);

    // 10. 全屏特效
    Effects.draw(ctx, time);
  },
};
