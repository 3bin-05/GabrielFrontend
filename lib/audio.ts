"use client";

import { IncidentSeverity } from "@/types/incident";

export function getSirenSpeedForSeverity(severity?: string | IncidentSeverity): number {
  if (!severity) return 1.0;
  const upper = severity.toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH" || upper === "SEVERE" || upper === "DANGER") {
    return 2.0; // 2x speed for severe and danger cases
  }
  // Minor / Moderate / Low cases: 1x speed
  return 1.0;
}

class EmergencySiren {
  private audioElement: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying = false;
  private currentSpeed = 1.0;
  private intervalId: NodeJS.Timeout | null = null;
  private isHtmlAudioActive = false;

  private initAudioElement() {
    if (typeof window !== "undefined" && !this.audioElement) {
      try {
        this.audioElement = new Audio("/siren.mp3");
        this.audioElement.loop = true;
        this.audioElement.preload = "auto";
      } catch (err) {
        console.warn("[EmergencySiren] HTML5 Audio init failed:", err);
      }
    }
  }

  private initWebAudioContext() {
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

  start(severity?: string | IncidentSeverity, explicitSpeed?: number) {
    const speed = explicitSpeed ?? getSirenSpeedForSeverity(severity);
    this.currentSpeed = speed;

    if (this.isPlaying) {
      this.setSpeed(speed);
      return;
    }

    this.isPlaying = true;

    // Try HTML5 Audio with /siren.mp3 first
    try {
      this.initAudioElement();
      if (this.audioElement) {
        this.audioElement.playbackRate = speed;
        this.audioElement.currentTime = 0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isHtmlAudioActive = true;
              if (this.audioElement) {
                this.audioElement.playbackRate = this.currentSpeed;
              }
            })
            .catch((err) => {
              console.warn("[EmergencySiren] HTML5 Audio play interrupted or blocked, falling back to WebAudio:", err);
              this.fallbackWebAudio(speed);
            });
          return;
        }
      }
    } catch {
      // Continue to WebAudio fallback
    }

    this.fallbackWebAudio(speed);
  }

  private fallbackWebAudio(speed: number) {
    try {
      this.initWebAudioContext();
      if (!this.ctx) return;

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = "sawtooth";
      this.osc.frequency.setValueAtTime(700, this.ctx.currentTime);
      this.gain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();

      // Frequency modulation period adjusted by speed (350ms at 1x, 175ms at 2x)
      const intervalMs = Math.max(100, Math.floor(350 / speed));
      let highTone = false;

      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      this.intervalId = setInterval(() => {
        if (this.ctx && this.osc && this.isPlaying) {
          const targetFreq = highTone ? (speed > 1.5 ? 980 : 920) : (speed > 1.5 ? 620 : 680);
          this.osc.frequency.setTargetAtTime(
            targetFreq,
            this.ctx.currentTime,
            0.05 / speed
          );
          highTone = !highTone;
        }
      }, intervalMs);
    } catch (err) {
      console.warn("[EmergencySiren] Web Audio initialization fallback failed:", err);
    }
  }

  setSpeed(speed: number) {
    this.currentSpeed = speed;
    if (this.audioElement && this.isHtmlAudioActive) {
      this.audioElement.playbackRate = speed;
    }
    if (this.osc && this.isPlaying) {
      // Restart web audio interval with new speed
      this.fallbackWebAudio(speed);
    }
  }

  stop() {
    this.isPlaying = false;
    this.isHtmlAudioActive = false;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {}
      this.osc = null;
    }

    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {}
      this.gain = null;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getSpeed(): number {
    return this.currentSpeed;
  }
}

export const emergencySiren = new EmergencySiren();

export function playEmergencySiren(severity?: string | IncidentSeverity, speed?: number) {
  emergencySiren.start(severity, speed);
}

export function stopEmergencySiren() {
  emergencySiren.stop();
}
