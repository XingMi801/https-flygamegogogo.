// ====== src/ui/BossUI.js ======
// Boss 血条 + 名字 + 阶段指示

const BossUI = {
  slideIn: 0,         // 0~1 滑入进度
  targetSlide: 0,
  boss: null,
  phaseFlash: 0,

  setBoss(boss) {
    this.boss = boss;
    this.targetSlide = 1;
    this.slideIn = 0;
  },

  clear() {
    this.targetSlide = 0;
    this.boss = null;
  },

  onPhaseChange(boss) {
    this.phaseFlash = 1.0;
  },

  update(dt) {
    this.slideIn = Utils.lerp(this.slideIn, this.targetSlide, 0.1);
    if (this.phaseFlash > 0) this.phaseFlash -= dt * 2;
  },

  draw(ctx) {
    // Boss 入场前（intro/WARNING）不显示血条
    if (!this.boss || this.boss.state === 'intro' || this.slideIn < 0.05) return;
    const b = this.boss;
    const cx = Balance.width / 2;
    const w = Balance.width - 60;
    const h = 8;
    const y = 56;
    const offsetX = (1 - this.slideIn) * Balance.width * 0.5;

    ctx.save();
    ctx.translate(offsetX, 0);
    ctx.globalAlpha = this.slideIn;

    // 名字
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Orbitron", sans-serif';
    ctx.shadowBlur = 8;
    ctx.shadowColor = b.color;
    ctx.fillStyle = b.color;
    ctx.fillText(b.name + ' / ' + b.title, cx, y - 12);

    // 血条底
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 46, 136, 0.15)';
    ctx.fillRect(30, y, w, h);

    // 阶段分隔标记
    const phaseColor = b.phases[b.phaseIndex].color;
    for (let i = 0; i < b.phases.length; i++) {
      const ph = b.phases[i];
      const ratio = ph.hpThreshold;
      const px = 30 + w * ratio;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, y - 2);
      ctx.lineTo(px, y + h + 2);
      ctx.stroke();
    }

    // 血条填充
    const hpRatio = b.hp / b.maxHp;
    ctx.shadowBlur = 8;
    ctx.shadowColor = phaseColor;
    ctx.fillStyle = phaseColor;
    ctx.fillRect(30, y, w * hpRatio, h);
    // 阶段闪光
    if (this.phaseFlash > 0) {
      ctx.globalAlpha = this.slideIn * this.phaseFlash;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(30, y, w * hpRatio, h);
      ctx.globalAlpha = this.slideIn;
    }

    // 阶段文字
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(232,244,255,0.6)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText(`PHASE ${b.phaseIndex + 1} / ${b.phases.length}`, cx, y + h + 6);

    ctx.restore();
  },
};
