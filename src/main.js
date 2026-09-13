// ====== src/main.js ======
// 入口：初始化 + 主循环（固定逻辑步长 + 插值渲染）

(function() {
  const canvas = document.getElementById('game');
  Game.init(canvas);

  // 主循环
  let lastTime = performance.now();
  let accumulator = 0;
  const STEP = Balance.dt;       // 1/60
  const MAX_FRAME = 0.25;        // 最大单帧时间，防止暂停后跳变

  function frame(now) {
    try {
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      if (dt > MAX_FRAME) dt = MAX_FRAME;

      // 固定步长更新
      accumulator += dt;
      while (accumulator >= STEP) {
        Game.update(STEP);
        accumulator -= STEP;
      }

      // 渲染
      const time = now / 1000;
      Game.draw(time);
    } catch (e) {
      // 捕获 rAF 回调里的异常并暴露，便于诊断
      window.__gameError = (window.__gameError || '') + '\n[' + new Date().toISOString() + '] ' + (e && e.stack ? e.stack : String(e));
      console.error('[Game loop]', e);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // 调试入口：暴露 Game
  if (Balance.debug) window.__game = Game;
})();
