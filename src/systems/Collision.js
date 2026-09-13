// ====== src/systems/Collision.js ======
// 碰撞检测：网格哈希优化

const Collision = {
  // 简单分组检测（避免实现完整网格哈希的复杂度）
  detect() {
    if (!Game.player) return;
    const player = Game.player;

    // ===== 1. 玩家子弹 vs 敌人/Boss =====
    PlayerBulletPool.forEachActive(b => {
      // vs 敌人
      for (let i = 0; i < Game.enemies.length; i++) {
        const e = Game.enemies[i];
        if (!e.alive) continue;
        if (Utils.circleHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          e.damage(b.damage, player);
          if (b.pierce === 0) { b.active = false; b.dead = true; }
          else if (b.pierce > 0) b.pierce--;
          break;
        }
      }
      // vs Boss
      if (Game.boss && Game.boss.alive && Game.boss.state !== 'intro' && Game.boss.state !== 'dead') {
        const boss = Game.boss;
        // Boss 炮塔
        for (let i = 0; i < boss.turrets.length; i++) {
          const t = boss.turrets[i];
          if (Utils.circleHit(b.x, b.y, b.radius, t.x, t.y, t.radius)) {
            t.damage(b.damage);
            if (b.pierce === 0) { b.active = false; b.dead = true; }
            else if (b.pierce > 0) b.pierce--;
            return;
          }
        }
        // Boss 主体
        if (boss.invulnerable) return; // 炮塔存活时主体免伤
        if (Utils.circleHit(b.x, b.y, b.radius, boss.x, boss.y, boss.radius)) {
          // 核心命中检测：如果子弹在核心范围内（阶段2+），伤害额外×2 已在 Boss.damage 处理
          boss.damage(b.damage, player);
          if (b.pierce === 0) { b.active = false; b.dead = true; }
          else if (b.pierce > 0) b.pierce--;
        }
      }
    });

    // ===== 2. 敌弹 vs 玩家（擦弹 + 命中） =====
    const p = player;
    EnemyBulletPool.forEachActive(b => {
      if (!p.alive) return;
      const d = Utils.dist(b.x, b.y, p.x, p.y);
      // 擦弹判定（在命中点外、擦弹半径内）
      if (d < p.grazeRadius + b.radius && d > p.hitboxRadius + b.radius) {
        // 一次擦弹：避免同一颗子弹多次擦弹，用 bullet.grazed 标记
        if (!b.grazed) {
          b.grazed = true;
          p.addGraze();
        }
      }
      // 命中
      if (d < p.hitboxRadius + b.radius) {
        p.takeDamage();
        b.active = false; b.dead = true;
      }
    });

    // ===== 3. 敌人 vs 玩家（撞击） =====
    for (let i = 0; i < Game.enemies.length; i++) {
      const e = Game.enemies[i];
      if (!e.alive) continue;
      if (Utils.circleHit(e.x, e.y, e.radius, p.x, p.y, p.hitboxRadius)) {
        p.takeDamage();
        e.damage(99, p); // 撞死敌机
      }
    }

    // ===== 4. Boss vs 玩家（撞击） =====
    if (Game.boss && Game.boss.alive && Game.boss.state === 'fight') {
      const boss = Game.boss;
      if (Utils.circleHit(boss.x, boss.y, boss.radius, p.x, p.y, p.hitboxRadius)) {
        p.takeDamage();
      }
    }

    // ===== 5. 道具拾取 =====
    for (let i = Game.pickups.length - 1; i >= 0; i--) {
      const pk = Game.pickups[i];
      if (!pk.alive) continue;
      if (Utils.circleHit(pk.x, pk.y, pk.radius + 8, p.x, p.y, p.radius)) {
        p.pickup(pk.kind);
        pk.dead = true;
      }
    }
  },
};
