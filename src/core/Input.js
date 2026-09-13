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

    // ===== 触摸（飞机跟随手指拖动） =====
    const getCanvasPos = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.touchActive = true;
        this.touchPos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.touchPos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        this.touchActive = false;
        this.touchPos = null;
      }
    }, { passive: false });

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
