"use client";

class EmergencySiren {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying = false;
  private intervalId: NodeJS.Timeout | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  start() {
    if (this.isPlaying) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = "sine";
      this.osc.frequency.setValueAtTime(750, this.ctx.currentTime);

      this.gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.isPlaying = true;

      // Modulate frequency to create emergency siren pulse (700Hz <-> 950Hz)
      let highTone = false;
      this.intervalId = setInterval(() => {
        if (this.ctx && this.osc && this.isPlaying) {
          const targetFreq = highTone ? 920 : 680;
          this.osc.frequency.setTargetAtTime(
            targetFreq,
            this.ctx.currentTime,
            0.08
          );
          highTone = !highTone;
        }
      }, 350);
    } catch (err) {
      console.warn("[EmergencySiren] Web Audio initialization:", err);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      if (this.gain) {
        this.gain.disconnect();
        this.gain = null;
      }
      this.isPlaying = false;
    } catch {
      this.isPlaying = false;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const emergencySiren = new EmergencySiren();
