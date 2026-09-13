// ====== src/ui/HUD.js ======
// 玩家 HUD：HP/能量/分数/连击/Bomb/武器/火力

const HUD = {
  draw(ctx) {
    const p = Game.player;
    if (!p) return;
    ctx.save();
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.textBaseline = 'top';

    // ===== 左上：HP + 能量 =====
    this._drawHpBar(ctx, 12, 12, p);
    this._drawEnergyBar(ctx, 12, 32, p);

    // ===== 右上：分数 + 连击 =====
    ctx.textAlign = 'right';
    ctx.shadowBlur = 6;
    ctx.shadowColor = Balance.color.cyan;
    ctx.fillStyle = Balance.color.text;
    ctx.font = 'bold 18px "Orbitron", sans-serif';
    ctx.fillText(String(Game.score.score).padStart(8, '0'), Balance.width - 12, 10);

    // 连击倍率
    if (Game.score.comboMultiplier > 1) {
      ctx.font = 'bold 14px "Orbitron", sans-serif';
      ctx.fillStyle = Balance.color.orange;
      ctx.shadowColor = Balance.color.orange;
      const scale = 1 + Math.min(0.5, Game.score.comboMultiplier * 0.05);
      ctx.save();
      ctx.translate(Balance.width - 12, 34);
      ctx.scale(scale, scale);
      ctx.fillText('×' + Game.score.comboMultiplier, 0, 0);
      ctx.restore();
    }

    // 金币（右上，分数下方）
    ctx.font = 'bold 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd43b';
    ctx.shadowColor = '#ffd43b';
    ctx.fillText('◉ ' + (SaveSystem.getCoins()), Balance.width - 12, 52);

    // ===== 底部：Bomb / 武器 / 火力 =====
    ctx.textAlign = 'left';
    this._drawBombs(ctx, 12, Balance.height - 28, p);
    this._drawWeapon(ctx, Balance.width / 2, Balance.height - 28, p);

    ctx.restore();
  },

  _drawHpBar(ctx, x, y, p) {
    // 六边形分段 HP
    const segW = 14, segH = 10, gap = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = Balance.color.cyan;
    for (let i = 0; i < p.maxHp; i++) {
      const sx = x + i * (segW + gap);
      const active = i < p.hp;
      ctx.fillStyle = active ? Balance.color.cyan : 'rgba(232,244,255,0.15)';
      if (active) {
        ctx.beginPath();
        Utils.clipCorner(ctx, sx, y, segW, segH, 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(232,244,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        Utils.clipCorner(ctx, sx, y, segW, segH, 2);
        ctx.stroke();
      }
    }
    // 文字
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(232,244,255,0.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText('HULL', x, y - 12);
  },

  _drawEnergyBar(ctx, x, y, p) {
    const w = 110, h = 6;
    const ratio = p.energy / Balance.energy.max;
    // 底
    ctx.fillStyle = 'rgba(155, 92, 255, 0.15)';
    ctx.fillRect(x, y, w, h);
    // 填充
    ctx.shadowBlur = 8;
    ctx.shadowColor = Balance.color.purple;
    ctx.fillStyle = Balance.color.purple;
    ctx.fillRect(x, y, w * ratio, h);
    // 满 Bomb 可用闪烁
    if (ratio >= 1 || p.bombs > 0) {
      ctx.fillStyle = `rgba(0,240,255,${0.5 + Math.sin(performance.now() / 100) * 0.4})`;
      ctx.fillRect(x, y - 2, w, 1);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(232,244,255,0.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText('ENERGY ' + Math.floor(ratio * 100) + '%', x, y + h + 2);
  },

  _drawBombs(ctx, x, y, p) {
    ctx.fillStyle = 'rgba(232,244,255,0.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText('BOMB', x, y - 12);
    for (let i = 0; i < p.maxBombs; i++) {
      const bx = x + i * 18;
      const active = i < p.bombs;
      ctx.shadowBlur = active ? 10 : 0;
      ctx.shadowColor = Balance.color.cyan;
      ctx.fillStyle = active ? Balance.color.cyan : 'rgba(232,244,255,0.2)';
      ctx.beginPath();
      ctx.arc(bx + 6, y + 6, 5, 0, Utils.TAU);
      ctx.fill();
      if (active) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx + 6, y + 6, 2, 0, Utils.TAU);
        ctx.fill();
      }
    }
  },

  _drawWeapon(ctx, cx, y, p) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,244,255,0.5)';
    ctx.font = '9px "Share Tech Mono", monospace';
    ctx.fillText('WEAPON', cx, y - 12);

    const w = p.weapon.type;
    const color = w === 'laser' ? '#00f0ff' : w === 'homing' ? '#9b5cff' : '#ffaa00';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.font = 'bold 12px "Orbitron", sans-serif';
    const label = w === 'laser' ? 'LASER' : w === 'homing' ? 'HOMING' : 'SCATTER';
    ctx.fillText(label, cx, y);

    // 火力等级 P×N
    ctx.fillStyle = Balance.color.orange;
    ctx.shadowColor = Balance.color.orange;
    ctx.font = 'bold 11px "Orbitron", sans-serif';
    ctx.fillText('P×' + p.weapon.level, cx, y + 14);

    ctx.textAlign = 'left';
  },
};
