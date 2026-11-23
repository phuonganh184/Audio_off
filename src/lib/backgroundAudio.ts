import type { AmbientMode } from '@/src/types';

/**
 * Generates an in-memory PCM WAV Blob URL used to hold an active OS media session
 * so mobile browsers (iOS Safari / Android Chrome) keep audio playback alive when
 * the screen turns off or the user switches apps.
 */
function createWavUrl(mode: AmbientMode): string {
  const sampleRate = 8000;
  const durationSec = mode === 'silent' ? 2 : 6;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let lastOut = 0;
  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    if (mode === 'silent') {
      // Near-silent carrier pulse so OS audio pipelines never optimize away the stream
      sample = i % 800 === 0 ? 1 : 0;
    } else if (mode === 'brown') {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.03 * white) / 1.03;
      sample = Math.round(Math.max(-1, Math.min(1, lastOut * 2.2)) * 1800);
    } else if (mode === 'rain') {
      const white = Math.random() * 2 - 1;
      lastOut = lastOut * 0.72 + white * 0.28;
      const drop = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.45 : 0;
      sample = Math.round(Math.max(-1, Math.min(1, (lastOut * 0.35 + drop))) * 2200);
    }
    view.setInt16(44 + i * 2, sample, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class BackgroundAudioKeepAlive {
  private audioEl: HTMLAudioElement | null = null;
  private currentMode: AmbientMode = 'silent';
  private cachedUrls: Partial<Record<AmbientMode, string>> = {};
  private wakeLock: WakeLockSentinel | null = null;

  private ensureAudioEl(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = document.createElement('audio');
      el.loop = true;
      el.setAttribute('playsinline', '');
      el.preload = 'auto';
      el.volume = 0.02;
      this.audioEl = el;
    }
    return this.audioEl;
  }

  public async start(mode: AmbientMode): Promise<void> {
    if (typeof window === 'undefined') return;
    const el = this.ensureAudioEl();
    if (!this.cachedUrls[mode]) {
      this.cachedUrls[mode] = createWavUrl(mode);
    }
    if (this.currentMode !== mode || !el.src) {
      this.currentMode = mode;
      el.src = this.cachedUrls[mode]!;
    }
    el.volume = mode === 'silent' ? 0.015 : 0.28;
    try {
      await el.play();
    } catch {
      // Browser autoplay restriction before explicit gesture; ignored safely
    }
  }

  public stop(): void {
    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  public async setMode(mode: AmbientMode, isPlaying: boolean): Promise<void> {
    this.currentMode = mode;
    if (isPlaying) {
      await this.start(mode);
    }
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audioEl;
  }

  public async setWakeLock(enabled: boolean): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false;
    if (!enabled) {
      if (this.wakeLock) {
        try {
          await this.wakeLock.release();
        } catch {
          // Ignore
        }
        this.wakeLock = null;
      }
      return false;
    }
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      return true;
    } catch {
      return false;
    }
  }
}

export const keepAliveEngine = new BackgroundAudioKeepAlive();

export interface MediaSessionMeta {
  title: string;
  artist: string;
  album?: string;
  cover?: string;
}

export function updateMediaSession(
  meta: MediaSessionMeta,
  state: 'playing' | 'paused',
  handlers: {
    onPlay: () => void;
    onPause: () => void;
    onPrev: () => void;
    onNext: () => void;
    onSeekBackward?: () => void;
    onSeekForward?: () => void;
  },
  position?: { duration: number; position: number; playbackRate: number }
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album || 'Truyện Audio',
      artwork: [
        {
          src: meta.cover || '/pwa-512x512.png',
          sizes: '512x512',
          type: meta.cover ? 'image/jpeg' : 'image/png',
        },
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    });
    ms.playbackState = state;
    ms.setActionHandler('play', handlers.onPlay);
    ms.setActionHandler('pause', handlers.onPause);
    ms.setActionHandler('previoustrack', handlers.onPrev);
    ms.setActionHandler('nexttrack', handlers.onNext);
    if (handlers.onSeekBackward) {
      ms.setActionHandler('seekbackward', handlers.onSeekBackward);
    }
    if (handlers.onSeekForward) {
      ms.setActionHandler('seekforward', handlers.onSeekForward);
    }
    if (position && position.duration > 0 && 'setPositionState' in ms) {
      ms.setPositionState({
        duration: Math.max(1, position.duration),
        playbackRate: position.playbackRate || 1,
        position: Math.min(position.position, Math.max(1, position.duration)),
      });
    }
  } catch {
    // Ignore unsupported MediaSession edge cases
  }
}

export function clearMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'none';
  } catch {
    // Ignore
  }
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Trình duyệt';
}
