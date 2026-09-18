// ====== src/render/Effects.js ======
// 全屏特效：闪光、扫描线、Boss 出场 WARNING、战斗结束 CG 动画

const Effects = {
  flashEl: null,
  scanLineY: 0,
  warningTimer: 0,
  warningActive: false,
  warningText: '',

  // ===== CG 动画状态 =====
  cg: {
    active: false,
    type: '',        // 'victory' | 'defeat'
    timer: 0,
    phase: 0,
    stars: [],
    debris: [],
    voicePlayed: false,
    onComplete: null,
    playerColor: '#00f0ff',
  },

  init() {
    this.flashEl = document.getElementById('flash');
  },

  // 全屏白闪
  flash() {
    if (this.flashEl) {
      this.flashEl.classList.remove('show');
      void this.flashEl.offsetWidth;
      this.flashEl.classList.add('show');
    }
  },

  // Boss 出场 WARNING（duration 秒）
  triggerBossWarning(duration = 1.0) {
    this.warningActive = true;
    this.warningTimer = duration;
    if (Game.audio) Game.audio.play('warning');
  },

  // ===== 启动 CG 动画 =====
  // type: 'victory' | 'defeat'
  playCG(type, opts = {}) {
    const cg = this.cg;
    cg.active = true;
    cg.type = type;
    cg.timer = 0;
    cg.phase = 0;
    cg.voicePlayed = false;
    cg.onComplete = opts.onComplete || null;
    cg.playerColor = opts.playerColor || '#00f0ff';
    cg.title = opts.title || (type === 'victory' ? 'VICTORY' : 'DEFEAT');
    cg.subtitle = opts.subtitle || '';
    cg.stars = [];
    cg.debris = [];
    // 生成星空粒子（用于纵深感）
    for (let i = 0; i < 80; i++) {
      cg.stars.push({
        x: Math.random() * Balance.width,
        y: Math.random() * Balance.height,
        z: Math.random() * 0.8 + 0.2,   // 深度（速度系数）
        size: Math.random() * 2 + 0.5,
      });
    }
    if (type === 'defeat') {
      // 生成残骸碎片
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Utils.TAU;
        const sp = 60 + Math.random() * 180;
        cg.debris.push({
          x: Balance.width / 2,
          y: Balance.height / 2,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          size: 2 + Math.random() * 4,
          color: Math.random() < 0.5 ? '#ffaa00' : '#ff3050',
          life: 0,
          maxLife: 1.5 + Math.random(),
        });
      }
    }
  },

  update(dt) {
    this.scanLineY = (this.scanLineY + dt * 400) % Balance.height;
    if (this.warningActive) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.warningActive = false;
    }

    // CG 更新
    const cg = this.cg;
    if (cg.active) {
      cg.timer += dt;
      // 时长分阶段（整体压缩至 2.8s）
      // victory: 0-1.0s 飞行+星空 / 1.0-2.0s 文字+语音 / 2.0-2.8s 渐隐
      // defeat:  0-1.2s 爆炸+残骸 / 1.2-2.2s 文字+语音 / 2.2-2.8s 渐隐
      const t1 = cg.type === 'victory' ? 1.0 : 1.2;
      const t2 = cg.type === 'victory' ? 2.0 : 2.2;
      const tEnd = 2.8;

      if (cg.timer < t1) cg.phase = 0;
      else if (cg.timer < t2) cg.phase = 1;
      else if (cg.timer < tEnd) cg.phase = 2;
      else {
        // 结束
        cg.active = false;
        if (cg.onComplete) {
          const cb = cg.onComplete;
          cg.onComplete = null;
          cb();
        }
        return;
      }

      // 星空推进
      if (cg.type === 'victory') {
        for (const s of cg.stars) {
          s.y += s.z * 320 * dt;
          if (s.y > Balance.height) { s.y = 0; s.x = Math.random() * Balance.width; }
        }
      }

      // 残骸推进
      if (cg.type === 'defeat') {
        for (const d of cg.debris) {
          d.life += dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.vy += 120 * dt; // 重力
          d.vx *= 0.98;
        }
      }

      // 阶段 1 末尾播放语音
      if (cg.phase >= 1 && !cg.voicePlayed) {
        cg.voicePlayed = true;
        if (Game.audio) {
          if (cg.type === 'victory') {
            Game.audio.speak('胜利！干得漂亮！', { rate: 1.1, pitch: 1.1 });
          } else {
            Game.audio.speak('战机损毁，任务失败', { rate: 0.95, pitch: 0.85 });
          }
        }
      }
    }
  },

  draw(ctx, time) {
    // 扫描线（持续运行的细节）
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#00f0ff';
    for (let y = 0; y < Balance.height; y += 4) {
      ctx.fillRect(0, y, Balance.width, 1);
    }
    ctx.restore();

    // 移动扫描带（更明显的）
    ctx.save();
    const gradS = ctx.createLinearGradient(0, this.scanLineY - 30, 0, this.scanLineY + 30);
    gradS.addColorStop(0, 'rgba(0,240,255,0)');
    gradS.addColorStop(0.5, 'rgba(0,240,255,0.08)');
    gradS.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = gradS;
    ctx.fillRect(0, this.scanLineY - 30, Balance.width, 60);
    ctx.restore();

    // WARNING 大字
    if (this.warningActive) {
      ctx.save();
      const blink = Math.floor(this.warningTimer * 8) % 2 === 0;
      // 全屏红色扫描带
      ctx.fillStyle = `rgba(255, 46, 136, ${0.15 * (blink ? 1 : 0.5)})`;
      ctx.fillRect(0, 0, Balance.width, Balance.height);

      ctx.font = 'bold 48px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = blink ? 1 : 0.3;
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ff2e88';
      ctx.fillStyle = '#ff2e88';
      ctx.fillText('WARNING', Balance.width / 2, Balance.height / 2 - 20);
      ctx.font = '14px Share Tech Mono, monospace';
      ctx.shadowBlur = 8;
      ctx.fillText('— BOSS APPROACHING —', Balance.width / 2, Balance.height / 2 + 20);
      ctx.restore();
    }

    // ===== CG 动画 =====
    const cg = this.cg;
    if (cg.active) {
      this._drawCG(ctx, time);
    }
  },

  _drawCG(ctx, time) {
    const cg = this.cg;
    const W = Balance.width, H = Balance.height;
    const cx = W / 2, cy = H / 2;

    // 背景渐变（胜利：深蓝紫；失败：暗红黑）
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (cg.type === 'victory') {
      grad.addColorStop(0, '#0a0420');
      grad.addColorStop(0.5, '#100828');
      grad.addColorStop(1, '#020208');
    } else {
      grad.addColorStop(0, '#1a0008');
      grad.addColorStop(0.5, '#100004');
      grad.addColorStop(1, '#020000');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 阶段 0：飞行 / 爆炸
    if (cg.phase === 0) {
      if (cg.type === 'victory') {
        // 星空纵深
        ctx.save();
        for (const s of cg.stars) {
          ctx.globalAlpha = s.z;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.restore();
        // 玩家飞机向上飞行 + 引擎尾焰
        ctx.save();
        const flyY = H * 0.7 - cg.timer * 180;
        ctx.translate(cx, flyY);
        ctx.shadowBlur = 20;
        ctx.shadowColor = cg.playerColor;
        ctx.fillStyle = cg.playerColor;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-14, 10);
        ctx.lineTo(-6, 6);
        ctx.lineTo(0, 14);
        ctx.lineTo(6, 6);
        ctx.lineTo(14, 10);
        ctx.closePath();
        ctx.fill();
        // 尾焰
        const flick = 0.7 + Math.random() * 0.3;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(-4, 10);
        ctx.lineTo(0, 18 + 10 * flick);
        ctx.lineTo(4, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // 爆炸闪光 + 残骸
        ctx.save();
        const flashA = Math.max(0, 1 - cg.timer / 2);
        ctx.fillStyle = `rgba(255,170,0,${0.3 * flashA})`;
        ctx.fillRect(0, 0, W, H);
        // 残骸
        for (const d of cg.debris) {
          if (d.life > d.maxLife) continue;
          const a = 1 - d.life / d.maxLife;
          ctx.globalAlpha = a;
          ctx.shadowBlur = 8;
          ctx.shadowColor = d.color;
          ctx.fillStyle = d.color;
          ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
        }
        ctx.restore();
      }
    }

    // 阶段 1 & 2：标题文字
    if (cg.phase >= 1) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 标题（带辉光 + 缩放进入）
      const enterT = cg.type === 'victory' ? 1.0 : 1.2;
      const p = Math.min(1, (cg.timer - enterT) / 0.35);
      const scale = 0.5 + p * 0.5 + Math.sin(time * 3) * 0.02;
      ctx.translate(cx, cy - 30);
      ctx.scale(scale, scale);
      const titleColor = cg.type === 'victory' ? '#00f0ff' : '#ff3050';
      ctx.shadowBlur = 30;
      ctx.shadowColor = titleColor;
      ctx.fillStyle = titleColor;
      ctx.font = 'bold 56px Orbitron, sans-serif';
      ctx.globalAlpha = p;
      ctx.fillText(cg.title, 0, 0);
      ctx.restore();

      // 副标题
      if (cg.subtitle) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Share Tech Mono, monospace';
        ctx.fillStyle = '#e8f4ff';
        ctx.globalAlpha = p * 0.9;
        ctx.fillText(cg.subtitle, cx, cy + 30);
        ctx.restore();
      }

      // 装饰光带
      ctx.save();
      ctx.globalAlpha = p * 0.6;
      const lineGrad = ctx.createLinearGradient(cx - 120, 0, cx + 120, 0);
      lineGrad.addColorStop(0, 'rgba(0,240,255,0)');
      lineGrad.addColorStop(0.5, titleColor);
      lineGrad.addColorStop(1, 'rgba(0,240,255,0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(cx - 120, cy + 2, 240, 2);
      ctx.restore();
    }

    // 阶段 2：渐隐
    if (cg.phase === 2) {
      const t2 = cg.type === 'victory' ? 2.0 : 2.2;
      const fa = Math.min(1, (cg.timer - t2) / 0.6);
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${fa})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
};
