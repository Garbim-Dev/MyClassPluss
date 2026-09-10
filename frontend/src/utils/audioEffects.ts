// Efeitos sonoros sintetizados 100% offline via Web Audio API
class SoundEffects {
  private ctx: AudioContext | null = null;
  private tensionInterval: any = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Som de tensão contínua (Tic-tac + Batimento crescente)
  startTensionSound(totalSeconds: number) {
    this.stopTensionSound();
    const ctx = this.getContext();

    let remaining = totalSeconds;
    this.tensionInterval = setInterval(() => {
      if (remaining <= 0) {
        this.stopTensionSound();
        return;
      }

      // Pitch aumenta quando faltam menos de 5 segundos
      const isUrgent = remaining <= 5;
      const freq = isUrgent ? 880 : 440;
      const duration = isUrgent ? 0.08 : 0.05;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isUrgent ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      remaining--;
    }, 1000);
  }

  stopTensionSound() {
    if (this.tensionInterval) {
      clearInterval(this.tensionInterval);
      this.tensionInterval = null;
    }
  }

  // Som de Encerramento da Rodada (Gongo/Buzzer)
  playTimeOutSound() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  // Fanfarra Triunfal ao Revelar o Pódio Top 5
  playPodiumFanfare() {
    const ctx = this.getContext();
    const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, High C

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + idx * 0.12;
      const duration = idx === notes.length - 1 ? 0.8 : 0.2;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}

export const soundFx = new SoundEffects();