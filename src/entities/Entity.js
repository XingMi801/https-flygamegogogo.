// ====== src/entities/Entity.js ======
// 实体基类：所有游戏对象的基类

class Entity {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 10;       // 碰撞半径（判定用）
    this.alive = true;
    this.dead = false;      // 标记可回收
    this.age = 0;           // 存活时间（秒）
    this.rotation = 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    this._onUpdate(dt);
  }

  // 子类覆盖
  _onUpdate(dt) {}

  draw(ctx) {
    this._onDraw(ctx);
  }
  _onDraw(ctx) {}

  // 出界检测
  offscreen(margin = 0) {
    return (
      this.x < -margin || this.x > Balance.width + margin ||
      this.y < -margin || this.y > Balance.height + margin
    );
  }

  // 距离判定
  distTo(other) {
    return Utils.dist(this.x, this.y, other.x, other.y);
  }

  // 与另一个实体圆碰撞
  hits(other, extra = 0) {
    return Utils.circleHit(this.x, this.y, this.radius + extra, other.x, other.y, other.radius);
  }
}
