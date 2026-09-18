// ====== src/core/Input.js ======
// 键盘 + 触摸输入管理
// 按键映射：
//   WASD / 方向键 = 移动
//   Space / KeyJ  = 开火（持续；同时默认自动开火）
//   KeyZ          = 炸弹 BOMB
//   KeyQ          = 一键清屏技能（清除全场敌弹 + AOE）
//   KeyX          = 一键投降技能（自动放弃本局）
//   Shift         = 低速精确模式
//   KeyV          = 僚机编队切换
//   Esc / KeyP    = 暂停

const Input = {
  keys: {},
  // 触摸：玩家手指位置（屏幕坐标）
  touchPos: null,
  touchActive: false,
  // 触发动作（瞬时，每帧消费后清空）
  actions: {
    bomb: false,             // Z 炸弹
    clearScreen: false,      // Q 一键清屏
    surrender: false,        // X 一键投降
    toggleFormation: false,  // V
    pause: false,            // Esc/P
  },
  // 持续状态
  state: {
    slow: false,             // 低速精确模式
    firing: true,            // 默认自动开火
  },
  // 移动方向（-1..1）
  moveX: 0,
  moveY: 0,

  _canvas: null,
  _touchSlow: false,
  _touchFire: false,
  // 相对拖动（虚拟摇杆）状态
  _touchId: null,          // 操控手指的 identifier（支持多点触控）
  _touchAnchor: null,      // 手指落下时的客户端坐标
  _touchPlane0: null,      // 手指落下时飞机的游戏坐标

  init(canvas) {
    this._canvas = canvas;

    // ===== 键盘 =====
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      this._onKeyDown(e.code);
      // 阻止方向键/空格滚动
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // ===== 触摸：全屏相对拖动（虚拟摇杆）=====
    // 设计要点（移动端真机兼容）：
    // 1) 监听挂在 window（捕获阶段），canvas 在竖屏手机上下有黑边，
    //    只绑 canvas 会导致黑边区域触摸全部丢失；
    // 2) 手指落下点为"锚点"，飞机目标点 = 飞机初始位置 + 滑动 delta，
    //    手指永远不会盖住飞机（区别于"绝对跟随手指"）；
    // 3) identifier 锁定第一根有效手指，另一根手指可同时点 BOMB/SLOW；
    // 4) 仅在战斗中(state=play)且触摸点不在菜单/按钮上时接管，不挡 UI 点击。
    const toGameXY = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const isUiTouch = (target) => {
      return !!(target && target.closest &&
        (target.closest('#overlay') || target.closest('#touch-controls')));
    };

    const canControl = () => typeof Game !== 'undefined' && Game && Game.state === 'play';

    const findTouch = (list, id) => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
      return null;
    };

    window.addEventListener('touchstart', (e) => {
      if (this._touchId !== null || !canControl()) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (isUiTouch(t.target)) continue;
        // 锁定该手指为操控指
        this._touchId = t.identifier;
        this._touchAnchor = { x: t.clientX, y: t.clientY };
        this._touchPlane0 = { x: Game.player.x, y: Game.player.y };
        this.touchActive = true;
        this.touchPos = { x: Game.player.x, y: Game.player.y };
        e.preventDefault();
        break;
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this._touchId === null) return;
      // 离开战斗状态（暂停/死亡/结算）立即释放操控锁
      if (!canControl()) { this._releaseControl(); return; }
      const t = findTouch(e.touches, this._touchId);
      if (!t) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const gx = this._touchPlane0.x + (t.clientX - this._touchAnchor.x) * sx;
      const gy = this._touchPlane0.y + (t.clientY - this._touchAnchor.y) * sy;
      this.touchPos = {
        x: Utils.clamp(gx, 0, Balance.width),
        y: Utils.clamp(gy, 0, Balance.height),
      };
    }, { passive: false });

    this._releaseControl = () => {
      this._touchId = null;
      this._touchAnchor = null;
      this._touchPlane0 = null;
      this.touchActive = false;
      this.touchPos = null;
    };
    const releaseTouch = (e) => {
      if (this._touchId === null) return;
      if (!findTouch(e.touches, this._touchId)) this._releaseControl();
    };
    window.addEventListener('touchend', releaseTouch, { passive: false });
    window.addEventListener('touchcancel', releaseTouch, { passive: false });

    // ===== 移动端按钮 =====
    const bombBtn = document.getElementById('bomb-btn');
    const slowBtn = document.getElementById('slow-btn');
    if (bombBtn) {
      bombBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.actions.bomb = true;
      }, { passive: false });
    }
    if (slowBtn) {
      slowBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._touchSlow = true;
      }, { passive: false });
      slowBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this._touchSlow = false;
      }, { passive: false });
    }
  },

  _onKeyDown(code) {
    switch (code) {
      case 'Space':
        // Space = 开火（持续；自动开火默认已开启，此处仅标记，不在 actions 里）
        this.state.firing = true;
        break;
      case 'KeyJ':
        this.state.firing = true;
        break;
      case 'KeyZ':
        this.actions.bomb = true;
        break;
      case 'KeyQ':
        // 一键清屏技能
        this.actions.clearScreen = true;
        break;
      case 'KeyX':
        // 一键投降技能
        this.actions.surrender = true;
        break;
      case 'KeyV':
        this.actions.toggleFormation = true;
        break;
      case 'Escape':
      case 'KeyP':
        this.actions.pause = true;
        break;
    }
  },

  // 每帧调用：从按键状态计算 moveX/moveY 和 slow
  update() {
    // 持续状态：键盘 Shift 或 触屏 slow 按钮
    const kbSlow = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.state.slow = kbSlow || !!this._touchSlow;

    // 开火持续状态：自动开火默认开启；按住 Space/J 也开火
    this.state.firing = true;

    // 键盘移动
    let mx = 0, my = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) mx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) mx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) my -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) my += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      this.moveX = mx / len;
      this.moveY = my / len;
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  },

  // 每帧末清空瞬时动作（消费后）
  clearFrameActions() {
    this.actions.bomb = false;
    this.actions.clearScreen = false;
    this.actions.surrender = false;
    this.actions.toggleFormation = false;
    this.actions.pause = false;
  },
};
