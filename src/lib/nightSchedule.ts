import {
  DEFAULT_NIGHT_SCHEDULE,
  type NightScheduleConfig,
  type ThemeMode,
} from '@/src/types';

const NIGHT_SCHEDULE_KEY = 'truyen_audio_night_schedule_v1';
const NIGHT_SNAPSHOT_KEY = 'truyen_audio_night_snapshot_v1';

export interface NightSessionSnapshot {
  appliedDark: boolean;
  appliedBlueLight: boolean;
  previousTheme?: ThemeMode;
  previousBlueLight?: boolean;
}

export const NIGHT_SCHEDULE_PRESETS: { label: string; startTime: string; endTime: string }[] = [
  { label: '21:00 – 06:00', startTime: '21:00', endTime: '06:00' },
  { label: '22:00 – 06:00', startTime: '22:00', endTime: '06:00' },
  { label: '23:00 – 07:00', startTime: '23:00', endTime: '07:00' },
];

export function normalizeTimeString(value: string, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallback;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

export function isWithinNightSchedule(
  config: NightScheduleConfig,
  now: Date = new Date()
): boolean {
  if (!config.enabled) return false;
  if (!config.enableDarkMode && !config.enableBlueLightFilter) return false;
  const startMin = parseTimeToMinutes(config.startTime);
  const endMin = parseTimeToMinutes(config.endTime);
  if (startMin === null || endMin === null || startMin === endMin) return false;

  const currentMin = now.getHours() * 60 + now.getMinutes();
  if (startMin > endMin) {
    // Overnight window (e.g. 22:00 -> 06:00)
    return currentMin >= startMin || currentMin < endMin;
  }
  // Same-day window (e.g. 13:00 -> 15:00)
  return currentMin >= startMin && currentMin < endMin;
}

export function loadNightSchedule(): NightScheduleConfig {
  try {
    const raw = localStorage.getItem(NIGHT_SCHEDULE_KEY);
    if (!raw) return DEFAULT_NIGHT_SCHEDULE;
    const parsed = JSON.parse(raw) as Partial<NightScheduleConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      startTime: normalizeTimeString(parsed.startTime || '', DEFAULT_NIGHT_SCHEDULE.startTime),
      endTime: normalizeTimeString(parsed.endTime || '', DEFAULT_NIGHT_SCHEDULE.endTime),
      enableDarkMode:
        typeof parsed.enableDarkMode === 'boolean'
          ? parsed.enableDarkMode
          : DEFAULT_NIGHT_SCHEDULE.enableDarkMode,
      enableBlueLightFilter:
        typeof parsed.enableBlueLightFilter === 'boolean'
          ? parsed.enableBlueLightFilter
          : DEFAULT_NIGHT_SCHEDULE.enableBlueLightFilter,
    };
  } catch {
    return DEFAULT_NIGHT_SCHEDULE;
  }
}

export function saveNightSchedule(config: NightScheduleConfig): void {
  try {
    localStorage.setItem(NIGHT_SCHEDULE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function loadNightSessionSnapshot(): NightSessionSnapshot {
  try {
    const raw = localStorage.getItem(NIGHT_SNAPSHOT_KEY);
    if (!raw) return { appliedDark: false, appliedBlueLight: false };
    const parsed = JSON.parse(raw) as Partial<NightSessionSnapshot>;
    return {
      appliedDark: Boolean(parsed.appliedDark),
      appliedBlueLight: Boolean(parsed.appliedBlueLight),
      previousTheme:
        parsed.previousTheme === 'light' ||
        parsed.previousTheme === 'dark' ||
        parsed.previousTheme === 'auto'
          ? parsed.previousTheme
          : undefined,
      previousBlueLight:
        typeof parsed.previousBlueLight === 'boolean' ? parsed.previousBlueLight : undefined,
    };
  } catch {
    return { appliedDark: false, appliedBlueLight: false };
  }
}

export function saveNightSessionSnapshot(snapshot: NightSessionSnapshot): void {
  try {
    localStorage.setItem(NIGHT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage errors
  }
}
