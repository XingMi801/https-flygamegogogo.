// ====== src/data/planes.js ======
// 战机配置：属性差异 + 解锁条件 + 外观参数

const Planes = {
  // 默认先锋号（始终可用）
  pioneer: {
    key: 'pioneer',
    name: '先锋号',
    subtitle: 'PIONEER',
    color: '#00f0ff',          // 主色（发光/填充）
    accent: '#0090b0',         // 副色（阴影描边）
    // 属性（相对 Balance.player 基础值）
    speed: Balance.player.speed,
    maxHp: Balance.player.maxHp,
    startHp: Balance.player.startHp,
    startWeapon: 'scatter',
    startWeaponLevel: 1,
    startBombs: Balance.player.startBombs,
    desc: '平衡型战机，散射炮为初始武器',
    unlock: { type: 'default' }, // 始终解锁
  },

  // 截击者：高速低血，激光起步
  interceptor: {
    key: 'interceptor',
    name: '截击者',
    subtitle: 'INTERCEPTOR',
    color: '#ff2e88',
    accent: '#b01a5e',
    speed: Balance.player.speed * 1.25,
    maxHp: 4,
    startHp: 2,
    startWeapon: 'laser',
    startWeaponLevel: 1,
    startBombs: Balance.player.startBombs,
    desc: '高速截击，激光起步，生命值较低',
    unlock: { type: 'stage', stage: 1 }, // 通关第 1 关解锁
  },

  // 守护者：低速高血，散射起步，炸弹多
  guardian: {
    key: 'guardian',
    name: '守护者',
    subtitle: 'GUARDIAN',
    color: '#ffaa00',
    accent: '#b07a00',
    speed: Balance.player.speed * 0.85,
    maxHp: 7,
    startHp: 4,
    startWeapon: 'scatter',
    startWeaponLevel: 1,
    startBombs: 3,
    desc: '厚重防御，高生命多炸弹，移动较慢',
    unlock: { type: 'stage', stage: 2 }, // 通关第 2 关解锁
  },

  // 游隼：高速低血，追踪起步
  falcon: {
    key: 'falcon',
    name: '游隼',
    subtitle: 'FALCON',
    color: '#f0d020',
    accent: '#b09000',
    speed: Balance.player.speed * 1.15,
    maxHp: 3,
    startHp: 2,
    startWeapon: 'homing',
    startWeaponLevel: 1,
    startBombs: 2,
    desc: '顶级战机，追踪起步，需通关全部关卡',
    unlock: { type: 'all_stage' }, // 通关全部 3 关解锁
  },

  // 幻影：能量特化，追踪起步，极速
  phantom: {
    key: 'phantom',
    name: '幻影',
    subtitle: 'PHANTOM',
    color: '#9b5cff',
    accent: '#5e2fb0',
    speed: Balance.player.speed * 1.2,
    maxHp: 3,
    startHp: 2,
    startWeapon: 'homing',
    startWeaponLevel: 2,
    startBombs: 1,
    desc: '能量特化型，追踪二级起步，极速机动',
    unlock: { type: 'endless_wave', wave: 5 }, // 无尽到达第 5 波解锁
  },

  // 泰坦：重装轰炸，散射二级，炸弹巨多
  titan: {
    key: 'titan',
    name: '泰坦',
    subtitle: 'TITAN',
    color: '#ff5030',
    accent: '#b03018',
    speed: Balance.player.speed * 0.78,
    maxHp: 8,
    startHp: 5,
    startWeapon: 'scatter',
    startWeaponLevel: 2,
    startBombs: 4,
    desc: '重装轰炸机，散射二级起步，4 枚炸弹',
    unlock: { type: 'coins_earned', amount: 2000 }, // 累计获得 2000 金币解锁
  },

  allKeys: ['pioneer', 'interceptor', 'guardian', 'falcon', 'phantom', 'titan'],

  // 判断是否解锁
  isUnlocked(key) {
    const cfg = this[key];
    if (!cfg) return false;
    const u = cfg.unlock;
    if (u.type === 'default') return true;
    const save = SaveSystem.getAll();
    if (u.type === 'stage') {
      // 该 stage 已通关（stars 至少一个 true）
      const stageKey = WavesData.stages[u.stage - 1];
      const stars = save.stage.stars[stageKey];
      return stars && stars.some(x => x);
    }
    if (u.type === 'all_stage') {
      return !!save.stage.clearedAll;
    }
    if (u.type === 'endless_wave') {
      return ((save.endless && save.endless.bestWave) || 0) >= u.wave;
    }
    if (u.type === 'coins_earned') {
      return (save.coinsEarnedTotal || 0) >= u.amount;
    }
    return false;
  },

  // 解锁条件文字
  unlockHint(key) {
    const cfg = this[key];
    if (!cfg) return '';
    const u = cfg.unlock;
    if (u.type === 'default') return '默认战机';
    if (u.type === 'stage') return `通关第 ${u.stage} 关解锁`;
    if (u.type === 'all_stage') return '通关全部关卡解锁';
    if (u.type === 'endless_wave') return `无尽模式到达第 ${u.wave} 波解锁`;
    if (u.type === 'coins_earned') return `累计获得 ${u.amount} 金币解锁`;
    return '';
  },
};
