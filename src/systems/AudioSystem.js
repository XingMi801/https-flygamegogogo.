// ====== src/systems/AudioSystem.js ======
// Web Audio API 程序化音效

const AudioSystem = {
  ctx: null,
  master: null,
  enabled: true,
  lastShoot: 0,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.enabled = false;
    }
  },

  // 解锁（移动端需要用户手势）
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // 播放一个简短合成音
  _play(opts) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.freq || 440, t);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    }
    gain.gain.setValueAtTime(opts.vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + opts.dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + opts.dur);
  },

  // 噪声爆破
  _playNoise(dur, vol = 0.3, filterFreq = 1000) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    noise.start(t);
    noise.stop(t + dur);
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'shoot':
        // 节流
        const now = performance.now();
        if (now - this.lastShoot < 50) return;
        this.lastShoot = now;
        this._play({ type: 'square', freq: 880, freqEnd: 220, dur: 0.06, vol: 0.06 });
        break;
      case 'enemyShoot':
        this._play({ type: 'sawtooth', freq: 200, freqEnd: 100, dur: 0.08, vol: 0.08 });
        break;
      case 'explode':
        this._playNoise(0.25, 0.25, 800);
        break;
      case 'hurt':
        this._play({ type: 'sawtooth', freq: 120, freqEnd: 40, dur: 0.4, vol: 0.3 });
        this._playNoise(0.3, 0.15, 400);
        break;
      case 'graze':
        this._play({ type: 'sine', freq: 1200, freqEnd: 1800, dur: 0.08, vol: 0.08 });
        break;
      case 'bomb':
        this._play({ type: 'sawtooth', freq: 80, freqEnd: 30, dur: 0.8, vol: 0.4 });
        this._playNoise(0.6, 0.3, 1500);
        break;
      case 'powerup':
        this._play({ type: 'sine', freq: 440, freqEnd: 880, dur: 0.15, vol: 0.2 });
        setTimeout(() => this._play({ type: 'sine', freq: 660, freqEnd: 1320, dur: 0.15, vol: 0.2 }), 60);
        break;
      case 'shield':
        this._play({ type: 'sine', freq: 300, freqEnd: 600, dur: 0.2, vol: 0.25 });
        break;
      case 'death':
        this._play({ type: 'sawtooth', freq: 200, freqEnd: 30, dur: 1.0, vol: 0.4 });
        this._playNoise(0.8, 0.25, 600);
        break;
      case 'toggle':
        this._play({ type: 'square', freq: 660, dur: 0.05, vol: 0.1 });
        break;
      case 'summon':
        this._play({ type: 'square', freq: 110, freqEnd: 220, dur: 0.3, vol: 0.2 });
        break;
      case 'warning':
        this._play({ type: 'square', freq: 440, dur: 0.1, vol: 0.2 });
        setTimeout(() => this._play({ type: 'square', freq: 440, dur: 0.1, vol: 0.2 }), 200);
        break;
      case 'boss_die':
        this._play({ type: 'sawtooth', freq: 200, freqEnd: 30, dur: 1.5, vol: 0.5 });
        this._playNoise(1.2, 0.4, 1500);
        break;
      case 'victory_melody':
        // 通关进入下一关的激昂胜利旋律（原创合成，致敬振奋感）
        this._playVictoryMelody();
        return true;
    }
    return false;
  },

  // ===== Web Speech API 语音合成（用于 Boss 胜利专属台词）=====
  speak(text, opts = {}) {
    if (!('speechSynthesis' in window)) return false;
    try {
      window.speechSynthesis.cancel(); // 停止之前的
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang || 'zh-CN';
      u.rate = opts.rate || 1.1;
      u.pitch = opts.pitch || 1.0;
      u.volume = opts.volume || 0.75;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Boss 胜利专属语音（根据 character 类型）
  bossVictory(boss) {
    if (!boss) return;
    const cfg = boss.config;
    // 先播放合成音效（牛叫声等）
    if (cfg.character === 'cow') {
      // 合成牛叫声：低频锯齿波下滑
      this._playCowMoo();
      // 延迟说话
      setTimeout(() => this.speak(cfg.victorySpeech || '牛来', { rate: 0.9, pitch: 0.8 }), 800);
    } else if (cfg.character === 'dog') {
      // 先播放一个上扬的合成音
      this._play({ type: 'square', freq: 400, freqEnd: 800, dur: 0.15, vol: 0.2 });
      setTimeout(() => this.speak(cfg.victorySpeech || '爷们牛逼', { rate: 1.2, pitch: 1.1 }), 300);
    } else if (cfg.character === 'kangaroo') {
      this._play({ type: 'triangle', freq: 300, freqEnd: 600, dur: 0.2, vol: 0.2 });
      setTimeout(() => this.speak(cfg.victorySpeech || '你胆子真是肥嘟嘟的', { rate: 1.0, pitch: 0.9 }), 400);
    } else {
      this.speak(cfg.victorySpeech || '胜利', {});
    }
  },

  // 合成牛叫声
  _playCowMoo() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 1.2);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 1.2);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 1.3);
  },

  // 通关进入下一关：原创凯旋旋律
  // 多轨合成：主旋律(双osc叠加+低通) + 三度和声 + walking bass + 进行曲鼓点 + 简易reverb
  _playVictoryMelody() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.08;
    // BPM 120，四分音符 = 0.5s
    const beat = 0.5;

    // 频率表（Hz）
    const N = {
      C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
      C6: 1046.50, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.00,
    };

    // 主旋律（C 大调凯旋动机）：琶音前奏 → 回旋 → 上行蓄势 → 高音长音收尾
    const melody = [
      // 前奏琶音（快速上行确立胜利感）
      [N.C5, 0.00, 0.25], [N.E5, 0.25, 0.25], [N.G5, 0.50, 0.25], [N.C6, 0.75, 0.25],
      // A 段：主音回旋
      [N.C6, 1.00, 0.5], [N.G5, 1.50, 0.5], [N.E5, 2.00, 0.5], [N.G5, 2.50, 0.5],
      // B 段：下行回落（引入下属色彩）
      [N.A5, 3.00, 0.5], [N.G5, 3.50, 0.5], [N.E5, 4.00, 0.5], [N.C5, 4.50, 0.5],
      // C 段：上行蓄势
      [N.D5, 5.00, 0.5], [N.E5, 5.50, 0.5], [N.G5, 6.00, 0.5], [N.A5, 6.50, 0.5],
      // 高潮：高音长音收尾
      [N.C6, 7.00, 0.5], [N.E6, 7.50, 0.5], [N.G6, 8.00, 1.5], [N.E6, 9.50, 0.5], [N.C6, 10.00, 0.5], [N.G6, 10.50, 2.0],
    ];

    // 三度和声（每个主旋律音下方三度，增加厚度）
    const harmony = [
      [N.A4, 0.00, 0.25], [N.C5, 0.25, 0.25], [N.E5, 0.50, 0.25], [N.A5, 0.75, 0.25],
      [N.A5, 1.00, 0.5], [N.E5, 1.50, 0.5], [N.C5, 2.00, 0.5], [N.E5, 2.50, 0.5],
      [N.F5, 3.00, 0.5], [N.E5, 3.50, 0.5], [N.C5, 4.00, 0.5], [N.A4, 4.50, 0.5],
      [N.B4, 5.00, 0.5], [N.C5, 5.50, 0.5], [N.E5, 6.00, 0.5], [N.F5, 6.50, 0.5],
      [N.A5, 7.00, 0.5], [N.C6, 7.50, 0.5], [N.E6, 8.00, 1.5], [N.C6, 9.50, 0.5], [N.A5, 10.00, 0.5], [N.E6, 10.50, 2.0],
    ];

    // Walking bass（2 拍换一次根音，制造进行感）
    const bass = [
      [N.C2, 0.00, 2.0],
      [N.G2, 2.00, 2.0],
      [N.F2, 4.00, 2.0],   // 下属色彩
      [N.G2, 6.00, 2.0],   // 属功能回到主
      [N.C2, 8.00, 2.0],
      [N.G2, 10.00, 2.5],
    ];

    // ===== 混音总线 =====
    // 简易 reverb：delay + feedback + 低通，避免高频啸叫
    const reverbDelay = ctx.createDelay(1.0);
    reverbDelay.delayTime.value = 0.09;
    const reverbFB = ctx.createGain();
    reverbFB.gain.value = 0.38;
    const reverbLP = ctx.createBiquadFilter();
    reverbLP.type = 'lowpass';
    reverbLP.frequency.value = 2200;
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.0;          // send 母线，每个音按需提升
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.35;       // 返回总音量
    // 路由：send -> delay -> lp -> fb -> delay (循环) -> return -> master
    reverbSend.connect(reverbDelay);
    reverbDelay.connect(reverbLP);
    reverbLP.connect(reverbFB);
    reverbFB.connect(reverbDelay);
    reverbDelay.connect(reverbReturn);
    reverbReturn.connect(this.master);

    // 主旋律：双 osc 叠加 + detune + 低通，音色厚实温暖
    this._scheduleLead(melody, t0, beat, {
      vol: 0.20, attack: 0.015, release: 0.08, cutoff: 3500, sendReverb: 0.22,
      reverbSend,
    });
    // 和声：triangle，音量小，少量 reverb
    this._scheduleLead(harmony, t0, beat, {
      vol: 0.10, attack: 0.02, release: 0.06, cutoff: 2600, sendReverb: 0.15,
      reverbSend,
      types: ['triangle'],
      detune: 0,
    });
    // bass：square + 强低通，送少量 reverb
    this._scheduleLead(bass, t0, beat, {
      vol: 0.16, attack: 0.008, release: 0.10, cutoff: 450, sendReverb: 0.08,
      reverbSend,
      types: ['square'],
      detune: 0,
    });

    // 进行曲鼓点（总长约 12.5 拍 = 6.25s）
    this._scheduleDrumKit(t0, beat, 12.5);

    // 收尾：1 秒后衰减 reverb 反馈，防止尾音无限
    const stopAt = t0 + 12.5 * beat + 1.5;
    reverbFB.gain.setValueAtTime(0.38, stopAt - 0.3);
    reverbFB.gain.linearRampToValueAtTime(0.0, stopAt);
  },

  // 单音多 osc 叠加 + 低通 + reverb send
  _scheduleLead(notes, t0, beat, opts) {
    const ctx = this.ctx;
    const types = opts.types || ['sawtooth', 'triangle'];
    const detunes = types.length > 1 ? [-7, 7] : [0];
    for (const [freq, startBeat, durBeat] of notes) {
      const start = t0 + startBeat * beat;
      const dur = durBeat * beat;
      const out = ctx.createGain();
      out.gain.value = 0;
      // 低通滤波（音色温暖）
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = opts.cutoff || 3000;
      filter.Q.value = 0.8;
      // ADSR 包络
      const vol = opts.vol || 0.15;
      out.gain.setValueAtTime(0.0001, start);
      out.gain.exponentialRampToValueAtTime(vol, start + opts.attack);
      out.gain.setValueAtTime(vol, start + dur * 0.55);
      out.gain.exponentialRampToValueAtTime(0.0001, start + dur + (opts.release || 0.05));
      // 叠加 osc
      for (let k = 0; k < types.length; k++) {
        const osc = ctx.createOscillator();
        osc.type = types[k];
        osc.frequency.setValueAtTime(freq, start);
        osc.detune.value = detunes[k] || 0;
        osc.connect(filter);
        osc.start(start);
        osc.stop(start + dur + (opts.release || 0.05) + 0.02);
      }
      filter.connect(out);
      out.connect(this.master);
      // reverb send
      if (opts.sendReverb && opts.reverbSend) {
        const sendGain = ctx.createGain();
        sendGain.gain.value = opts.sendReverb;
        out.connect(sendGain);
        sendGain.connect(opts.reverbSend);
      }
    }
  },

  // 进行曲鼓点：底鼓 + 军鼓 + 踩镲
  _scheduleDrumKit(t0, beat, totalBeats) {
    const ctx = this.ctx;
    for (let i = 0; i < totalBeats; i++) {
      const start = t0 + i * beat;
      const half = start + beat * 0.5;

      // 每拍底鼓
      this._kick(start);
      // 拍 2、4（i=1,3,5,7...）加军鼓
      if (i % 2 === 1) this._snare(start);
      // 每拍后半加踩镲（高频噪声短促）
      this._hihat(half, 0.06);
      // 强拍（每 4 拍的第一拍）底鼓更重 + 多加一个踩镲
      if (i % 4 === 0) this._hihat(start, 0.05);
    }
  },

  // 底鼓：低频正弦快速衰减 + 轻微高频点击层
  _kick(start) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + 0.13);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.32, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain); gain.connect(this.master);
    osc.start(start); osc.stop(start + 0.25);
  },

  // 军鼓：噪声 + 高通 + 短衰减
  _snare(start) {
    const ctx = this.ctx;
    const dur = 0.16;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      // 指数衰减包络的噪声
      const env = 1 - j / bufferSize;
      data[j] = (Math.random() * 2 - 1) * env * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    noise.connect(hp); hp.connect(gain); gain.connect(this.master);
    noise.start(start); noise.stop(start + dur + 0.02);
  },

  // 踩镲：高频噪声极短衰减
  _hihat(start, vol = 0.08) {
    const ctx = this.ctx;
    const dur = 0.05;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      const env = 1 - j / bufferSize;
      data[j] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    noise.connect(hp); hp.connect(gain); gain.connect(this.master);
    noise.start(start); noise.stop(start + dur + 0.02);
  },
};
