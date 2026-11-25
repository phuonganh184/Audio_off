import type { ListeningProgress, Story } from '@/src/types';

const STATS_STORAGE_KEY = 'truyen_audio_listening_stats_v1';
const MAX_STORED_DAYS = 90;
const CHARS_PER_SECOND_ESTIMATE = 13.5;

export interface DailyListeningLogEntry {
  totalSeconds: number;
  hourlySeconds: Record<number, number>;
  storySeconds: Record<string, number>;
}

export interface StoredListeningStats {
  days: Record<string, DailyListeningLogEntry>;
}

export interface HourlyBucket {
  hour: number;
  label: string;
  seconds: number;
}

export interface DailyBucket {
  dateKey: string;
  weekdayShort: string;
  dayNumber: string;
  fullDateLabel: string;
  isToday: boolean;
  seconds: number;
  storyIds: string[];
  hourly: HourlyBucket[];
}

export interface StoryListeningSummary {
  storyId: string;
  title: string;
  cover?: string;
  genre: string;
  seconds: number;
  chapterIndex: number;
  totalChapters: number;
  chapterTitle?: string;
  updatedAt: number;
  progressPercent: number;
}

export interface GenreListeningSummary {
  genre: string;
  seconds: number;
  storyCount: number;
  sharePercent: number;
}

export interface ListeningStatsReport {
  todaySeconds: number;
  todayStoriesCount: number;
  weekSeconds: number;
  prevWeekSeconds: number;
  dailyAverageSeconds: number;
  totalSeconds: number;
  activeDaysCount: number;
  currentStreakDays: number;
  peakPeriodLabel: string;
  peakHourRangeLabel: string;
  weekDays: DailyBucket[];
  prevWeekDays: DailyBucket[];
  topStories: StoryListeningSummary[];
  genres: GenreListeningSummary[];
  totalTrackedStories: number;
}

export function toLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftLocalDateKey(baseDate: Date, deltaDays: number): Date {
  const d = new Date(baseDate);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function getWeekdayShortVi(date: Date): string {
  const day = date.getDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
}

export function loadStoredListeningStats(): StoredListeningStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw) as StoredListeningStats;
    if (!parsed || typeof parsed !== 'object' || !parsed.days || typeof parsed.days !== 'object') {
      return { days: {} };
    }
    return parsed;
  } catch {
    return { days: {} };
  }
}

function saveStoredListeningStats(data: StoredListeningStats): void {
  try {
    const keys = Object.keys(data.days).sort();
    if (keys.length > MAX_STORED_DAYS) {
      const keep = new Set(keys.slice(keys.length - MAX_STORED_DAYS));
      const trimmed: Record<string, DailyListeningLogEntry> = {};
      for (const k of keep) trimmed[k] = data.days[k];
      data.days = trimmed;
    }
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues
  }
}

export function recordListeningSeconds(
  storyId: string,
  seconds: number,
  timestamp = Date.now()
): StoredListeningStats {
  const cleanSeconds = Math.max(0, Math.round(seconds));
  const data = loadStoredListeningStats();
  if (!storyId || cleanSeconds <= 0) return data;

  const dateKey = toLocalDateKey(timestamp);
  const hour = new Date(timestamp).getHours();

  const existing: DailyListeningLogEntry = data.days[dateKey] ?? {
    totalSeconds: 0,
    hourlySeconds: {},
    storySeconds: {},
  };

  existing.totalSeconds = Math.max(0, (existing.totalSeconds || 0) + cleanSeconds);
  existing.hourlySeconds[hour] = (existing.hourlySeconds[hour] || 0) + cleanSeconds;
  existing.storySeconds[storyId] = (existing.storySeconds[storyId] || 0) + cleanSeconds;

  data.days[dateKey] = existing;
  saveStoredListeningStats(data);
  return data;
}

export function clearStoredListeningStats(): StoredListeningStats {
  const empty: StoredListeningStats = { days: {} };
  saveStoredListeningStats(empty);
  return empty;
}

export function estimateProgressSeconds(
  progress: ListeningProgress,
  story?: Story
): number {
  const totalChunks = Math.max(1, progress.totalChunks || 1);
  const chunkRatio = Math.min(1, Math.max(0, progress.chunkIndex / totalChunks));

  if (story && story.chapters.length > 0) {
    let charsListened = 0;
    const clampedChIdx = Math.min(Math.max(0, progress.chapterIndex), story.chapters.length - 1);

    for (let i = 0; i < clampedChIdx; i++) {
      const ch = story.chapters[i];
      charsListened += ch?.charCount && ch.charCount > 0 ? ch.charCount : 3600;
    }

    const currentCh = story.chapters[clampedChIdx];
    const currentChars = currentCh?.charCount && currentCh.charCount > 0 ? currentCh.charCount : 3600;
    const currentChunkSeconds = Math.round((currentChars * chunkRatio) / CHARS_PER_SECOND_ESTIMATE);
    const completedSeconds = Math.round(charsListened / CHARS_PER_SECOND_ESTIMATE);
    const activeChapterSeconds = Math.max(Math.round(progress.audioTime || 0), currentChunkSeconds);

    return Math.max(60, completedSeconds + activeChapterSeconds);
  }

  const fallbackCompleted = Math.max(0, progress.chapterIndex) * 270;
  const fallbackCurrent = Math.max(
    Math.round(progress.audioTime || 0),
    Math.round(progress.chunkIndex * 16)
  );
  return Math.max(60, fallbackCompleted + fallbackCurrent);
}

export function formatDurationShort(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec === 0) return '0 phút';
  if (sec < 60) return '< 1 phút';
  const totalMinutes = Math.round(sec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours}g ${mins}p`;
}

export function formatMinutesAxis(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = (mins / 60).toFixed(mins % 60 === 0 ? 0 : 1);
    return `${h}g`;
  }
  return `${mins}p`;
}

export function buildListeningStats(
  progressMap: Record<string, ListeningProgress>,
  stories: Story[],
  storedStats: StoredListeningStats,
  nowMs = Date.now()
): ListeningStatsReport {
  const storyMap = new Map<string, Story>();
  for (const s of stories) storyMap.set(s.id, s);

  // Clone stored days into mutable working map
  const mergedDays = new Map<
    string,
    {
      totalSeconds: number;
      hourly: number[];
      storySeconds: Map<string, number>;
    }
  >();

  const ensureDay = (dateKey: string) => {
    let day = mergedDays.get(dateKey);
    if (!day) {
      day = {
        totalSeconds: 0,
        hourly: Array.from({ length: 24 }, () => 0),
        storySeconds: new Map<string, number>(),
      };
      mergedDays.set(dateKey, day);
    }
    return day;
  };

  const loggedSecondsByStory = new Map<string, number>();

  for (const [dateKey, entry] of Object.entries(storedStats.days || {})) {
    const day = ensureDay(dateKey);
    day.totalSeconds += Math.max(0, entry.totalSeconds || 0);
    for (let h = 0; h < 24; h++) {
      day.hourly[h] += Math.max(0, entry.hourlySeconds?.[h] || 0);
    }
    for (const [sid, sec] of Object.entries(entry.storySeconds || {})) {
      const clean = Math.max(0, sec || 0);
      if (clean > 0) {
        day.storySeconds.set(sid, (day.storySeconds.get(sid) || 0) + clean);
        loggedSecondsByStory.set(sid, (loggedSecondsByStory.get(sid) || 0) + clean);
      }
    }
  }

  // Merge progressMap entries so existing & cloud-synced listening history is immediately reflected
  const progressEntries = Object.values(progressMap || {});
  const totalStorySecondsMap = new Map<string, number>(loggedSecondsByStory);

  for (const prog of progressEntries) {
    if (!prog || !prog.storyId) continue;
    const story = storyMap.get(prog.storyId);
    const estimatedSec = estimateProgressSeconds(prog, story);
    const alreadyLogged = loggedSecondsByStory.get(prog.storyId) || 0;
    const deltaFromProgress = Math.max(0, estimatedSec - alreadyLogged);

    totalStorySecondsMap.set(
      prog.storyId,
      Math.max(alreadyLogged, estimatedSec)
    );

    if (deltaFromProgress > 0 && prog.updatedAt > 0) {
      const dateKey = toLocalDateKey(prog.updatedAt);
      const hour = new Date(prog.updatedAt).getHours();
      const day = ensureDay(dateKey);
      day.totalSeconds += deltaFromProgress;
      day.hourly[hour] += deltaFromProgress;
      day.storySeconds.set(
        prog.storyId,
        (day.storySeconds.get(prog.storyId) || 0) + deltaFromProgress
      );
    }
  }

  const todayDate = new Date(nowMs);
  const todayKey = toLocalDateKey(nowMs);

  const buildDayBucket = (dateObj: Date): DailyBucket => {
    const dateKey = toLocalDateKey(dateObj.getTime());
    const rec = mergedDays.get(dateKey);
    const hourly: HourlyBucket[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour}h`,
      seconds: rec ? Math.round(rec.hourly[hour] || 0) : 0,
    }));

    return {
      dateKey,
      weekdayShort: getWeekdayShortVi(dateObj),
      dayNumber: String(dateObj.getDate()),
      fullDateLabel: dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      }),
      isToday: dateKey === todayKey,
      seconds: rec ? Math.round(rec.totalSeconds) : 0,
      storyIds: rec ? Array.from(rec.storySeconds.keys()) : [],
      hourly,
    };
  };

  const weekDays: DailyBucket[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    weekDays.push(buildDayBucket(shiftLocalDateKey(todayDate, offset)));
  }

  const prevWeekDays: DailyBucket[] = [];
  for (let offset = -13; offset <= -7; offset++) {
    prevWeekDays.push(buildDayBucket(shiftLocalDateKey(todayDate, offset)));
  }

  const todayBucket = weekDays[weekDays.length - 1];
  const todaySeconds = todayBucket.seconds;
  const todayStoriesCount = todayBucket.storyIds.length;
  const weekSeconds = weekDays.reduce((sum, d) => sum + d.seconds, 0);
  const prevWeekSeconds = prevWeekDays.reduce((sum, d) => sum + d.seconds, 0);
  const dailyAverageSeconds = Math.round(weekSeconds / 7);

  let totalSeconds = 0;
  let activeDaysCount = 0;
  const overallHourly = Array.from({ length: 24 }, () => 0);

  for (const day of mergedDays.values()) {
    if (day.totalSeconds > 0) {
      totalSeconds += Math.round(day.totalSeconds);
      activeDaysCount++;
      for (let h = 0; h < 24; h++) {
        overallHourly[h] += day.hourly[h] || 0;
      }
    }
  }

  // Current streak ending today (or yesterday if not yet listened today)
  let currentStreakDays = 0;
  const startOffset = (mergedDays.get(todayKey)?.totalSeconds || 0) > 0 ? 0 : -1;
  for (let i = startOffset; i >= -90; i--) {
    const dk = toLocalDateKey(shiftLocalDateKey(todayDate, i).getTime());
    if ((mergedDays.get(dk)?.totalSeconds || 0) > 0) {
      currentStreakDays++;
    } else {
      break;
    }
  }

  // Peak listening hour range
  let peakHour = -1;
  let peakHourSec = 0;
  for (let h = 0; h < 24; h++) {
    if (overallHourly[h] > peakHourSec) {
      peakHourSec = overallHourly[h];
      peakHour = h;
    }
  }

  let peakPeriodLabel = 'Chưa có dữ liệu';
  let peakHourRangeLabel = 'Hãy phát một chương để bắt đầu';
  if (peakHour >= 0 && peakHourSec > 0) {
    if (peakHour >= 5 && peakHour < 12) peakPeriodLabel = 'Buổi sáng';
    else if (peakHour >= 12 && peakHour < 18) peakPeriodLabel = 'Buổi chiều';
    else if (peakHour >= 18 && peakHour < 22) peakPeriodLabel = 'Buổi tối';
    else peakPeriodLabel = 'Đêm khuya';
    const nextHour = (peakHour + 1) % 24;
    peakHourRangeLabel = `Nghe nhiều nhất lúc ${String(peakHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00`;
  }

  // Top stories combining progressMap + logged time
  const storyIdSet = new Set<string>([
    ...Object.keys(progressMap || {}),
    ...Array.from(totalStorySecondsMap.keys()),
  ]);

  const topStories: StoryListeningSummary[] = [];
  const genreTotals = new Map<string, { seconds: number; storyIds: Set<string> }>();

  for (const sid of storyIdSet) {
    const st = storyMap.get(sid);
    const prog = progressMap[sid];
    if (!st && !prog) continue;

    const sec = Math.round(totalStorySecondsMap.get(sid) || 0);
    if (sec <= 0 && !prog) continue;

    const totalChapters = st?.chapters.length || 0;
    const chIdx = prog ? prog.chapterIndex : 0;
    const totalChunks = Math.max(1, prog?.totalChunks || 1);
    const chunkProgress = prog ? Math.min(1, Math.max(0, prog.chunkIndex / totalChunks)) : 0;
    const progressPercent =
      totalChapters > 0
        ? Math.min(100, Math.round(((chIdx + chunkProgress) / totalChapters) * 100))
        : Math.round(chunkProgress * 100);

    const genre = st?.genre?.trim() || 'Chưa phân loại';

    topStories.push({
      storyId: sid,
      title: st?.title || prog?.chapterTitle || 'Truyện đã xóa',
      cover: st?.cover,
      genre,
      seconds: sec,
      chapterIndex: chIdx,
      totalChapters,
      chapterTitle: prog?.chapterTitle,
      updatedAt: prog?.updatedAt || 0,
      progressPercent,
    });

    const gEntry = genreTotals.get(genre) || { seconds: 0, storyIds: new Set<string>() };
    gEntry.seconds += sec;
    gEntry.storyIds.add(sid);
    genreTotals.set(genre, gEntry);
  }

  topStories.sort((a, b) => {
    if (b.seconds !== a.seconds) return b.seconds - a.seconds;
    return b.updatedAt - a.updatedAt;
  });

  const genreTotalSeconds = Array.from(genreTotals.values()).reduce((sum, g) => sum + g.seconds, 0);
  const genres: GenreListeningSummary[] = Array.from(genreTotals.entries())
    .map(([genre, info]) => ({
      genre,
      seconds: info.seconds,
      storyCount: info.storyIds.size,
      sharePercent:
        genreTotalSeconds > 0 ? Math.max(1, Math.round((info.seconds / genreTotalSeconds) * 100)) : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    todaySeconds,
    todayStoriesCount,
    weekSeconds,
    prevWeekSeconds,
    dailyAverageSeconds,
    totalSeconds,
    activeDaysCount,
    currentStreakDays,
    peakPeriodLabel,
    peakHourRangeLabel,
    weekDays,
    prevWeekDays,
    topStories,
    genres,
    totalTrackedStories: topStories.length,
  };
}
