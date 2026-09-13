// ====== src/data/waves.js ======
// 关卡波次脚本

const WavesData = {
  // ===== 第 1 关 =====
  stage1: {
    stage: 1,
    background: 'nebula_1',
    duration: 90,  // 秒
    boss: 'boss_stage1',
    starGoals: ['no_damage', 'full_clear', 'time_limit', 'perfect_boss'],
    waves: [
      { time: 0.5, type: 'grunt',  count: 5, pattern: 'line',   interval: 0.4, from: 'top' },
      { time: 4.0, type: 'grunt',  count: 6, pattern: 'line',   interval: 0.35, from: 'top' },
      { time: 8.0, type: 'zigzag', count: 4, pattern: 'arc',     interval: 0.6, from: 'top' },
      { time: 13.0, type: 'grunt', count: 8, pattern: 'line',   interval: 0.3, from: 'top' },
      { time: 18.0, type: 'arc',   count: 5, pattern: 'arc',     interval: 0.5, from: 'top' },
      { time: 23.0, type: 'zigzag',count: 6, pattern: 'line',   interval: 0.35, from: 'top' },
      { time: 28.0, type: 'grunt', count: 10,pattern: 'line',  interval: 0.25, from: 'top' },
      { time: 33.0, type: 'arc',   count: 6, pattern: 'arc',    interval: 0.4, from: 'top' },
      // 喘息波：低密度 + 道具
      { time: 38.0, type: 'grunt', count: 3, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 40.0, type: 'grunt', count: 3, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'energy' },
      { time: 43.0, type: 'zigzag',count: 5, pattern: 'arc',    interval: 0.4, from: 'top' },
      { time: 48.0, type: 'arc',   count: 8, pattern: 'line',   interval: 0.3, from: 'top' },
      { time: 53.0, type: 'grunt', count: 12,pattern: 'line',  interval: 0.2, from: 'top' },
      { time: 58.0, type: 'zigzag',count: 8, pattern: 'arc',    interval: 0.3, from: 'top' },
      { time: 63.0, type: 'arc',   count: 6, pattern: 'arc',    interval: 0.35, from: 'top' },
      { time: 68.0, type: 'grunt', count: 10,pattern: 'line',  interval: 0.25, from: 'top' },
      // Boss 前喘息
      { time: 73.0, type: 'grunt', count: 2, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 75.0, type: 'grunt', count: 2, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'energy' },
      // 80s 触发 Boss
      { time: 80.0, boss: 'boss_stage1' },
    ],
  },

  // ===== 第 2 关 =====
  stage2: {
    stage: 2,
    background: 'nebula_2',
    duration: 120,
    boss: 'boss_stage2',
    starGoals: ['no_damage', 'full_clear', 'time_limit', 'perfect_boss'],
    waves: [
      { time: 0.5, type: 'zigzag', count: 5, pattern: 'arc',    interval: 0.4, from: 'top' },
      { time: 4.0, type: 'arc',    count: 6, pattern: 'arc',    interval: 0.4, from: 'top' },
      { time: 8.0, type: 'ram',    count: 4, pattern: 'line',  interval: 0.8, from: 'top' },
      { time: 12.0, type: 'bomber',count: 4, pattern: 'line',  interval: 0.7, from: 'top' },
      { time: 17.0, type: 'zigzag',count: 8, pattern: 'arc',    interval: 0.3, from: 'top' },
      { time: 22.0, type: 'arc',    count: 6, pattern: 'arc',    interval: 0.35, from: 'top' },
      { time: 27.0, type: 'elite',  count: 1, pattern: 'arc',   from: 'top' },
      { time: 32.0, type: 'ram',    count: 6, pattern: 'line',  interval: 0.5, from: 'top' },
      { time: 37.0, type: 'bomber',count: 6, pattern: 'line',  interval: 0.5, from: 'top' },
      // 喘息 + 道具（含武器切换）
      { time: 42.0, type: 'grunt',  count: 2, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'shield' },
      { time: 44.0, type: 'grunt',  count: 2, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'option' },
      { time: 46.0, type: 'grunt',  count: 1, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'weapon_laser' },
      { time: 47.0, type: 'grunt',  count: 1, pattern: 'line',  interval: 1.0, from: 'top', dropGuaranteed: 'weapon_homing' },
      { time: 47.0, type: 'zigzag', count: 10, pattern: 'arc',   interval: 0.25, from: 'top' },
      { time: 53.0, type: 'arc',    count: 8, pattern: 'line',   interval: 0.3, from: 'top' },
      { time: 58.0, type: 'ram',     count: 8, pattern: 'line',  interval: 0.4, from: 'top' },
      { time: 64.0, type: 'bomber', count: 8, pattern: 'line',  interval: 0.4, from: 'top' },
      { time: 70.0, type: 'elite',  count: 2, pattern: 'arc',   interval: 0.8, from: 'top' },
      { time: 76.0, type: 'zigzag', count: 10, pattern: 'arc',  interval: 0.25, from: 'top' },
      { time: 82.0, type: 'arc',    count: 10, pattern: 'line',  interval: 0.25, from: 'top' },
      // 喘息
      { time: 88.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 90.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'bomb' },
      { time: 92.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'energy' },
      // 100s 触发 Boss
      { time: 100.0, boss: 'boss_stage2' },
    ],
  },

  // ===== 第 3 关 =====
  stage3: {
    stage: 3,
    background: 'nebula_3',
    duration: 150,
    boss: 'boss_stage3',
    starGoals: ['no_damage', 'full_clear', 'time_limit', 'perfect_boss'],
    waves: [
      { time: 0.5, type: 'elite',  count: 1, pattern: 'arc',   from: 'top' },
      { time: 4.0, type: 'zigzag',count: 8, pattern: 'arc',   interval: 0.3, from: 'top' },
      { time: 9.0, type: 'ram',    count: 6, pattern: 'line', interval: 0.5, from: 'top' },
      { time: 14.0, type: 'bomber',count: 8, pattern: 'line',interval: 0.4, from: 'top' },
      { time: 20.0, type: 'arc',   count: 10,pattern: 'arc',  interval: 0.25, from: 'top' },
      { time: 26.0, type: 'elite', count: 2, pattern: 'arc',  interval: 0.8, from: 'top' },
      { time: 32.0, type: 'zigzag',count: 12,pattern: 'arc',  interval: 0.25, from: 'top' },
      { time: 38.0, type: 'ram',   count: 10,pattern: 'line', interval: 0.3, from: 'top' },
      { time: 44.0, type: 'bomber',count: 10,pattern: 'line', interval: 0.3, from: 'top' },
      { time: 50.0, type: 'arc',   count: 12,pattern: 'arc',  interval: 0.25, from: 'top' },
      { time: 56.0, type: 'elite', count: 3, pattern: 'arc',  interval: 0.7, from: 'top' },
      // 喘息 + 道具
      { time: 62.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 64.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'shield' },
      { time: 66.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'bomb' },
      { time: 68.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'option' },
      { time: 70.0, type: 'zigzag',count: 14,pattern: 'arc',  interval: 0.2, from: 'top' },
      { time: 76.0, type: 'ram',   count: 12,pattern: 'line', interval: 0.25, from: 'top' },
      { time: 82.0, type: 'bomber',count: 12,pattern: 'line', interval: 0.25, from: 'top' },
      { time: 88.0, type: 'arc',   count: 14,pattern: 'arc',  interval: 0.2, from: 'top' },
      { time: 94.0, type: 'elite', count: 4, pattern: 'arc',  interval: 0.6, from: 'top' },
      { time: 100.0, type: 'zigzag',count: 16,pattern: 'arc', interval: 0.18, from: 'top' },
      { time: 106.0, type: 'bomber',count: 14,pattern: 'line',interval: 0.2, from: 'top' },
      // Boss 前最后喘息
      { time: 112.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 114.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'energy' },
      { time: 116.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'shield' },
      // 120s 触发 Boss
      { time: 120.0, boss: 'boss_stage3' },
    ],
  },

  // ===== 第 4 关：深渊核心（高难）=====
  stage4: {
    stage: 4,
    background: 'nebula_4',
    duration: 180,
    boss: 'boss_stage4',
    starGoals: ['no_damage', 'full_clear', 'time_limit', 'perfect_boss'],
    waves: [
      { time: 0.5,  type: 'elite',  count: 2, pattern: 'arc',  interval: 0.6, from: 'top' },
      { time: 4.0,  type: 'zigzag', count: 10, pattern: 'arc', interval: 0.25, from: 'top' },
      { time: 9.0,  type: 'ram',    count: 8,  pattern: 'line', interval: 0.35, from: 'left' },
      { time: 13.0, type: 'ram',    count: 8,  pattern: 'line', interval: 0.35, from: 'right' },
      { time: 18.0, type: 'bomber', count: 10, pattern: 'line', interval: 0.3, from: 'top' },
      { time: 24.0, type: 'arc',    count: 12, pattern: 'arc',  interval: 0.22, from: 'top' },
      { time: 30.0, type: 'elite',  count: 3,  pattern: 'arc',  interval: 0.6, from: 'top' },
      { time: 36.0, type: 'zigzag', count: 14, pattern: 'arc',  interval: 0.2, from: 'top' },
      { time: 42.0, type: 'ram',    count: 12, pattern: 'line', interval: 0.25, from: 'left' },
      { time: 48.0, type: 'bomber', count: 12, pattern: 'line', interval: 0.25, from: 'right' },
      { time: 54.0, type: 'arc',    count: 14, pattern: 'arc',  interval: 0.2, from: 'top' },
      { time: 60.0, type: 'elite',  count: 4,  pattern: 'arc',  interval: 0.5, from: 'top' },
      // 喘息 + 道具
      { time: 66.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 68.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'shield' },
      { time: 70.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'bomb' },
      { time: 72.0, type: 'grunt',  count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'option' },
      { time: 74.0, type: 'zigzag', count: 18, pattern: 'arc', interval: 0.16, from: 'top' },
      { time: 80.0, type: 'ram',    count: 14, pattern: 'line', interval: 0.2, from: 'left' },
      { time: 86.0, type: 'bomber', count: 14, pattern: 'line', interval: 0.2, from: 'right' },
      { time: 92.0, type: 'arc',    count: 16, pattern: 'arc',  interval: 0.16, from: 'top' },
      { time: 98.0, type: 'elite',  count: 5,  pattern: 'arc',  interval: 0.45, from: 'top' },
      { time: 104.0, type: 'zigzag',count: 20, pattern: 'arc',  interval: 0.14, from: 'top' },
      { time: 110.0, type: 'ram',   count: 10, pattern: 'line', interval: 0.25, from: 'left' },
      { time: 114.0, type: 'bomber',count: 16, pattern: 'line', interval: 0.18, from: 'top' },
      // Boss 前最后喘息
      { time: 120.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'P' },
      { time: 122.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'energy' },
      { time: 124.0, type: 'grunt', count: 2, pattern: 'line', interval: 1.0, from: 'top', dropGuaranteed: 'shield' },
      // 132s 触发 Boss
      { time: 132.0, boss: 'boss_stage4' },
    ],
  },

  // 关卡顺序
  stages: ['stage1', 'stage2', 'stage3', 'stage4'],
};
