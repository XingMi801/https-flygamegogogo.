// ====== src/data/shop.js ======
// 武器商店：永久强化项（金币购买，localStorage 持久化）
// 效果在 Player 构造时由 _applyShopUpgrades 应用

const ShopData = {
  items: {
    // ---- 武器强化 ----
    scatter_plus: {
      id: 'scatter_plus',
      name: '散射增幅器',
      icon: '🔥',
      color: '#ffaa00',
      price: 300,
      desc: '散射弹幕伤害 +25%，散射系战机开局火力 +1 级',
    },
    laser_plus: {
      id: 'laser_plus',
      name: '激光聚能环',
      icon: '⚡',
      color: '#00f0ff',
      price: 450,
      desc: '激光伤害 +30%，射击间隔 -15%（穿透更凶）',
    },
    homing_plus: {
      id: 'homing_plus',
      name: '制导矩阵',
      icon: '🎯',
      color: '#9b5cff',
      price: 450,
      desc: '追踪弹 +2 发，转向灵敏度大幅提升',
    },
    // ---- 生存强化 ----
    start_bomb: {
      id: 'start_bomb',
      name: '弹舱扩容',
      icon: '💣',
      color: '#ff3050',
      price: 250,
      desc: '开局炸弹 +1，炸弹容量上限 +1',
    },
    start_option: {
      id: 'start_option',
      name: '僚机核心',
      icon: '🛰️',
      color: '#00ffe1',
      price: 600,
      desc: '开局自带 1 台僚机（最多可再拾取 1 台）',
    },
    hp_up: {
      id: 'hp_up',
      name: '纳米装甲',
      icon: '🛡️',
      color: '#ffd43b',
      price: 500,
      desc: '最大生命 +1，开局满血进入战斗',
    },
  },

  allKeys: ['scatter_plus', 'laser_plus', 'homing_plus', 'start_bomb', 'start_option', 'hp_up'],

  // ---- 消耗品（每次购买+1 库存，使用后消耗）----
  consumables: {
    shield_token: {
      id: 'shield_token',
      name: '临时护盾',
      icon: '🔵',
      color: '#00ffe1',
      price: 150,
      desc: '下一局开局自带护盾，抵挡一次伤害',
    },
    revive_token: {
      id: 'revive_token',
      name: '复活币',
      icon: '💗',
      color: '#ff2e88',
      price: 300,
      desc: '被击坠时自动原地复活（保留火力，满无敌）',
    },
  },

  consumableKeys: ['shield_token', 'revive_token'],
};
