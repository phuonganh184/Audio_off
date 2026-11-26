export interface NativeDeviceVoice {
  name: string;
  lang: string;
  localService: boolean;
}

interface AndroidNativeTtsBridge {
  isAvailable?: () => boolean;
  getVoicesJson?: () => string;
  speak?: (
    utteranceId: string,
    text: string,
    rate: number,
    pitch: number,
    voiceName: string
  ) => boolean;
  stop?: () => void;
}

interface AndroidTtsCallbacks {
  onDone?: () => void;
  onError?: () => void;
  onProgress?: (ratio: number) => void;
}

const DEFAULT_REMOTE_APP_URL =
  import.meta.env.VITE_TTS_API_BASE ||
  'https://ais-pre-mwuzplitcti6duj6rqa3kc-732129190673.asia-northeast1.run.app';

declare global {
  interface Window {
    AndroidNativeTts?: AndroidNativeTtsBridge;
    __onAndroidTtsEvent?: (
      utteranceId: string,
      type: 'done' | 'error' | 'progress',
      progress?: number
    ) => void;
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

const activeCallbacks = new Map<string, AndroidTtsCallbacks>();

function ensureGlobalDispatcher(): void {
  if (typeof window === 'undefined') return;
  if (!window.__onAndroidTtsEvent) {
    window.__onAndroidTtsEvent = (utteranceId, type, progress) => {
      const cb = activeCallbacks.get(utteranceId);
      if (!cb) return;
      if (type === 'progress' && typeof progress === 'number') {
        cb.onProgress?.(Math.max(0, Math.min(1, progress)));
      } else if (type === 'done') {
        activeCallbacks.delete(utteranceId);
        cb.onDone?.();
      } else if (type === 'error') {
        activeCallbacks.delete(utteranceId);
        cb.onError?.();
      }
    };
  }
}

export function isAndroidNativeTtsAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.AndroidNativeTts?.isAvailable?.());
  } catch {
    return false;
  }
}

export function getAndroidNativeVoices(): NativeDeviceVoice[] {
  if (!isAndroidNativeTtsAvailable()) return [];
  try {
    const raw = window.AndroidNativeTts?.getVoicesJson?.() || '[]';
    const parsed = JSON.parse(raw) as NativeDeviceVoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function speakAndroidNativeTts(
  utteranceId: string,
  text: string,
  rate: number,
  pitch: number,
  voiceName: string,
  callbacks: AndroidTtsCallbacks
): boolean {
  if (!isAndroidNativeTtsAvailable()) return false;
  ensureGlobalDispatcher();
  activeCallbacks.clear();
  activeCallbacks.set(utteranceId, callbacks);
  try {
    const ok = window.AndroidNativeTts?.speak?.(
      utteranceId,
      text,
      Math.min(2.5, Math.max(0.5, rate)),
      Math.min(2.0, Math.max(0.5, pitch)),
      voiceName || ''
    );
    if (!ok) {
      activeCallbacks.delete(utteranceId);
      return false;
    }
    return true;
  } catch {
    activeCallbacks.delete(utteranceId);
    return false;
  }
}

export function stopAndroidNativeTts(): void {
  activeCallbacks.clear();
  if (!isAndroidNativeTtsAvailable()) return;
  try {
    window.AndroidNativeTts?.stop?.();
  } catch {
    // Ignore native stop errors
  }
}

export function isRunningInsideCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  const proto = window.location?.protocol || '';
  return proto === 'capacitor:' || proto === 'ionic:' || proto === 'file:';
}

export function getInitialTtsApiBase(): string {
  if (isRunningInsideCapacitor()) {
    return DEFAULT_REMOTE_APP_URL.replace(/\/+$/, '');
  }
  return '';
}

export function getFallbackRemoteTtsBase(): string {
  return DEFAULT_REMOTE_APP_URL.replace(/\/+$/, '');
}
