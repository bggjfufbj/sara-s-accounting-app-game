class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicActive = false;
  private stepIndex = 0;
  private lastClickAtMs = 0;
  private globalAttached = false;

  // Calm, soothing Cmaj9 -> Am9 -> Fmaj7 -> G6 ambient study progression
  private readonly chords: number[][] = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 392.0],  // G6
  ];

  // Gentle pentatonic high bell/harp notes that float softly over each chord
  private readonly melodyNotes: (number | null)[] = [
    523.25, null, 659.25, 587.33,
    493.88, null, 523.25, 392.0,
    440.0, null, 523.25, 659.25,
    587.33, null, 493.88, null,
  ];

  constructor() {
    try {
      const saved = window.localStorage.getItem('accounting_arena_muted');
      if (saved === '1') this.muted = true;
    } catch {
      // Ignore storage access errors in sandboxed iframes
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Create warm low-pass filtered bus for calm ambient background music
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(920, this.ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.muted ? 0.0001 : 0.42, this.ctx.currentTime);

      this.musicFilter.connect(this.musicGain);
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended' && !this.muted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    return this.ensureContext();
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlockAndStartMusic(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // iOS Safari requires synchronous resume + silent buffer playback inside a touch/click gesture
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const silentBuf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silentBuf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore on browsers that disallow redundant silent buffers
    }

    this.startAmbientLoop();
  }

  private startAmbientLoop(): void {
    if (this.muted || this.musicActive) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    this.musicActive = true;
    const now = ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(0.42, now, 0.25);

    this.playAmbientStep();
    this.musicTimer = setInterval(() => {
      if (!this.muted && this.musicActive) {
        this.playAmbientStep();
      }
    }, 1050);
  }

  private stopAmbientLoop(): void {
    this.musicActive = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }
  }

  private playAmbientStep(): void {
    const ctx = this.ctx;
    const bus = this.musicFilter;
    if (!ctx || !bus || this.muted || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const step = this.stepIndex % 16;
    const chordIdx = Math.floor(step / 4);
    const chord = this.chords[chordIdx];

    // On beat 0 of every 4-step bar, swell a soft, warm electric-piano chord pad
    if (step % 4 === 0) {
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        const peak = i === 0 ? 0.042 : 0.024;
        gain.gain.setValueAtTime(0.0001, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(peak, now + i * 0.05 + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.15);

        osc.connect(gain);
        gain.connect(bus);
        osc.start(now + i * 0.05);
        osc.stop(now + 4.25);
      });
    }

    // Gentle floating pentatonic note for peaceful movement
    const melody = this.melodyNotes[step];
    if (melody) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

      osc.connect(gain);
      gain.connect(bus);
      osc.start(now);
      osc.stop(now + 1.65);
    }

    this.stepIndex = (this.stepIndex + 1) % 16;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem('accounting_arena_muted', this.muted ? '1' : '0');
    } catch {
      // Ignore
    }

    if (this.muted) {
      this.stopAmbientLoop();
    } else {
      const ctx = this.ensureContext();
      if (ctx) {
        ctx.resume().then(() => {
          this.startAmbientLoop();
          this.click();
        }).catch(() => {});
      }
    }
    return this.muted;
  }

  attachGlobalInteractionAudio(): () => void {
    if (this.globalAttached || typeof document === 'undefined') {
      return () => {};
    }
    this.globalAttached = true;

    const onFirstGesture = () => {
      if (!this.muted) {
        this.unlockAndStartMusic();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (this.musicActive) {
          this.stopAmbientLoop();
        }
      } else if (!this.muted && this.ctx) {
        this.ctx.resume().catch(() => {});
        this.startAmbientLoop();
      }
    };

    const onDocumentClick = (e: MouseEvent) => {
      if (!this.muted) {
        this.unlockAndStartMusic();
      }
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('button');
      if (!btn || btn.disabled) return;
      if (btn.dataset.muteToggle === 'true') return;
      this.click();
    };

    document.addEventListener('touchstart', onFirstGesture, { passive: true });
    document.addEventListener('pointerdown', onFirstGesture, { passive: true });
    document.addEventListener('keydown', onFirstGesture, { passive: true });
    document.addEventListener('click', onDocumentClick, { capture: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      this.globalAttached = false;
      document.removeEventListener('touchstart', onFirstGesture);
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('keydown', onFirstGesture);
      document.removeEventListener('click', onDocumentClick, { capture: true });
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0,
    endFreq?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  click(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastClickAtMs < 45) return;
    this.lastClickAtMs = nowMs;

    const jitter = 0.96 + Math.random() * 0.08;
    // Crisp, pleasant tactile wooden/brass button click
    this.playTone(640 * jitter, 0.048, 'triangle', 0.1, 0, 360 * jitter);
    this.playTone(1180 * jitter, 0.022, 'sine', 0.04, 0, 740 * jitter);
  }

  stamp(): void {
    this.playTone(170, 0.09, 'sine', 0.16, 0, 72);
    this.playTone(420, 0.045, 'triangle', 0.07, 0.01, 210);
  }

  correct(): void {
    this.playTone(523.25, 0.16, 'triangle', 0.13, 0);
    this.playTone(659.25, 0.18, 'triangle', 0.13, 0.08);
    this.playTone(783.99, 0.28, 'sine', 0.14, 0.16);
  }

  partial(): void {
    this.playTone(440, 0.15, 'triangle', 0.11, 0);
    this.playTone(554.37, 0.22, 'triangle', 0.11, 0.09);
  }

  wrong(): void {
    this.playTone(260, 0.16, 'sawtooth', 0.07, 0, 200);
    this.playTone(195, 0.22, 'sawtooth', 0.06, 0.1, 155);
  }

  tickWarning(): void {
    this.playTone(880, 0.05, 'sine', 0.05, 0, 660);
  }

  victory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.34, 'triangle', 0.14, idx * 0.1);
    });
  }
}

export const soundFx = new SoundSynth();
