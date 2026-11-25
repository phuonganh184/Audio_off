import React, { useMemo, useState } from 'react';
import { BarChart3, BookOpen, Clock, Flame, Play, RotateCcw } from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import {
  buildListeningStats,
  formatDurationShort,
  formatMinutesAxis,
  type DailyBucket,
  type StoredListeningStats,
} from '@/src/lib/listeningStats';
import type { ListeningProgress, Story } from '@/src/types';

type ChartGranularity = 'week' | 'day';
type WeekRangeMode = 'current' | 'previous';

interface Props {
  stories: Story[];
  progressMap: Record<string, ListeningProgress>;
  storedStats: StoredListeningStats;
  onOpenStory: (storyId: string) => void;
  onResumeStory: (storyId: string) => void;
  onGoToLibrary: () => void;
  onResetLocalStats: () => void;
}

function formatRelativeTimeVi(ts: number): string {
  if (!ts) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export const StatsView: React.FC<Props> = ({
  stories,
  progressMap,
  storedStats,
  onOpenStory,
  onResumeStory,
  onGoToLibrary,
  onResetLocalStats,
}) => {
  const [granularity, setGranularity] = useState<ChartGranularity>('week');
  const [weekRange, setWeekRange] = useState<WeekRangeMode>('current');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [focusedHour, setFocusedHour] = useState<number | null>(null);
  const [focusedDayKey, setFocusedDayKey] = useState<string | null>(null);

  const report = useMemo(
    () => buildListeningStats(progressMap, stories, storedStats),
    [progressMap, stories, storedStats]
  );

  const storyIdSet = useMemo(() => new Set(stories.map((s) => s.id)), [stories]);

  const activeWeekDays: DailyBucket[] =
    weekRange === 'current' ? report.weekDays : report.prevWeekDays;

  const selectedDayBucket: DailyBucket = useMemo(() => {
    const found =
      report.weekDays.find((d) => d.dateKey === selectedDateKey) ||
      report.prevWeekDays.find((d) => d.dateKey === selectedDateKey);
    return found || report.weekDays[report.weekDays.length - 1];
  }, [report.prevWeekDays, report.weekDays, selectedDateKey]);

  const weeklyMaxSeconds = useMemo(() => {
    const peak = Math.max(...activeWeekDays.map((d) => d.seconds), 0);
    return Math.max(600, Math.ceil(peak / 300) * 300);
  }, [activeWeekDays]);

  const hourlyMaxSeconds = useMemo(() => {
    const peak = Math.max(...selectedDayBucket.hourly.map((h) => h.seconds), 0);
    return Math.max(300, Math.ceil(peak / 300) * 300);
  }, [selectedDayBucket]);

  const weekDeltaText = useMemo(() => {
    if (weekRange === 'previous') {
      const prevAvg = Math.round(report.prevWeekSeconds / 7);
      return `Trung bình ${formatDurationShort(prevAvg)}/ngày`;
    }
    if (report.prevWeekSeconds <= 0) {
      return `Trung bình ${formatDurationShort(report.dailyAverageSeconds)}/ngày`;
    }
    const diffPct = Math.round(
      ((report.weekSeconds - report.prevWeekSeconds) / report.prevWeekSeconds) * 100
    );
    if (diffPct > 0) return `+${diffPct}% so với tuần trước`;
    if (diffPct < 0) return `${diffPct}% so với tuần trước`;
    return 'Tương đương tuần trước';
  }, [report.dailyAverageSeconds, report.prevWeekSeconds, report.weekSeconds, weekRange]);

  const focusedDayBucket = useMemo(() => {
    if (!focusedDayKey) return null;
    return activeWeekDays.find((d) => d.dateKey === focusedDayKey) || null;
  }, [activeWeekDays, focusedDayKey]);

  const focusedHourBucket = useMemo(() => {
    if (focusedHour !== null) {
      return selectedDayBucket.hourly[focusedHour] || null;
    }
    const best = selectedDayBucket.hourly.reduce(
      (acc, cur) => (cur.seconds > acc.seconds ? cur : acc),
      selectedDayBucket.hourly[0]
    );
    return best && best.seconds > 0 ? best : null;
  }, [focusedHour, selectedDayBucket]);

  const hasLocalSessionLogs = Object.keys(storedStats.days || {}).length > 0;
  const hasAnyStats = report.totalSeconds > 0 || report.topStories.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Thống kê thói quen nghe
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Theo dõi thời gian nghe truyện trong ngày và tuần từ tiến trình đọc của bạn
          </p>
        </div>

        {hasLocalSessionLogs && (
          <button
            type="button"
            onClick={onResetLocalStats}
            className="min-h-[44px] self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d24] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại nhật ký giờ</span>
          </button>
        )}
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Hôm nay</span>
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatDurationShort(report.todaySeconds)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {report.todayStoriesCount > 0
              ? `${report.todayStoriesCount} truyện đã nghe hôm nay`
              : 'Chưa có phiên nghe hôm nay'}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{weekRange === 'current' ? '7 ngày qua' : 'Tuần trước'}</span>
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatDurationShort(
              weekRange === 'current' ? report.weekSeconds : report.prevWeekSeconds
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {weekDeltaText}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Tổng tích lũy</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {formatDurationShort(report.totalSeconds)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate">
            {report.totalTrackedStories} truyện · {report.activeDaysCount} ngày hoạt động
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Thói quen</span>
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {report.currentStreakDays > 0 ? `${report.currentStreakDays} ngày` : report.peakPeriodLabel}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {report.currentStreakDays > 0
              ? `Chuỗi liên tiếp · ${report.peakPeriodLabel}`
              : report.peakHourRangeLabel}
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <section className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {granularity === 'week' ? 'Thời gian nghe theo tuần' : 'Thời gian nghe theo giờ trong ngày'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {granularity === 'week'
                ? focusedDayBucket
                  ? `${focusedDayBucket.fullDateLabel} · ${formatDurationShort(focusedDayBucket.seconds)} (${focusedDayBucket.storyIds.length} truyện)`
                  : 'Chạm vào cột từng ngày để xem chi tiết thời lượng và số truyện'
                : `${selectedDayBucket.isToday ? 'Hôm nay' : selectedDayBucket.fullDateLabel} · Tổng ${formatDurationShort(selectedDayBucket.seconds)}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {granularity === 'week' && (
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setWeekRange('current');
                    setFocusedDayKey(null);
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    weekRange === 'current'
                      ? 'bg-white dark:bg-[#1a1d24] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  7 ngày qua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWeekRange('previous');
                    setFocusedDayKey(null);
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    weekRange === 'previous'
                      ? 'bg-white dark:bg-[#1a1d24] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Tuần trước
                </button>
              </div>
            )}

            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setGranularity('week')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  granularity === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Theo tuần
              </button>
              <button
                type="button"
                onClick={() => setGranularity('day')}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  granularity === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Theo ngày
              </button>
            </div>
          </div>
        </div>

        {/* Day Selector Carousel when in Day view */}
        {granularity === 'day' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {report.weekDays.map((day) => {
              const active = day.dateKey === selectedDayBucket.dateKey;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(day.dateKey);
                    setFocusedHour(null);
                  }}
                  className={`min-h-[44px] min-w-[60px] px-3 py-1.5 rounded-xl border text-center shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                  }`}
                >
                  <div className="text-[11px] font-medium opacity-85 whitespace-nowrap">
                    {day.isToday ? 'Hôm nay' : day.weekdayShort}
                  </div>
                  <div className="text-xs font-bold tabular-nums mt-0.5">
                    {day.dayNumber}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!hasAnyStats ? (
          <div className="py-10 text-center space-y-3 border-t border-slate-100 dark:border-slate-800">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600" />
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Chưa có dữ liệu lịch sử nghe trong thư viện
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Khi bạn nghe truyện, tiến trình từ bộ nhớ và thời lượng từng ngày sẽ được thống kê
              tự động tại đây.
            </p>
            <button
              type="button"
              onClick={onGoToLibrary}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Mở Thư viện để nghe ngay
            </button>
          </div>
        ) : granularity === 'week' ? (
          /* 7-Day Weekly Bar Chart */
          <div className="space-y-3">
            <div className="relative h-56 flex gap-3 pt-4">
              {/* Y-Axis Labels */}
              <div className="w-9 flex flex-col justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums text-right pb-7 shrink-0 select-none">
                <span>{formatMinutesAxis(weeklyMaxSeconds)}</span>
                <span>{formatMinutesAxis(Math.round(weeklyMaxSeconds / 2))}</span>
                <span>0p</span>
              </div>

              {/* Plot Area */}
              <div className="flex-1 relative flex flex-col">
                {/* Hairline Grid */}
                <div className="flex-1 relative flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
                </div>

                {/* Bars Row */}
                <div className="absolute inset-x-0 top-0 bottom-7 grid grid-cols-7 gap-2 sm:gap-4 items-end px-1 sm:px-3">
                  {activeWeekDays.map((day) => {
                    const heightPct =
                      day.seconds > 0
                        ? Math.max(6, Math.min(100, (day.seconds / weeklyMaxSeconds) * 100))
                        : 0;
                    const isFocused = focusedDayKey === day.dateKey;
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => {
                          setFocusedDayKey((prev) =>
                            prev === day.dateKey ? null : day.dateKey
                          );
                        }}
                        aria-label={`${day.fullDateLabel}: ${formatDurationShort(day.seconds)}`}
                        className="group h-full flex flex-col justify-end items-center focus:outline-none cursor-pointer"
                      >
                        <span
                          className={`mb-1 text-[10px] sm:text-[11px] font-medium tabular-nums transition-opacity ${
                            day.seconds > 0
                              ? isFocused || day.isToday
                                ? 'text-blue-600 dark:text-blue-400 opacity-100'
                                : 'text-slate-500 dark:text-slate-400 opacity-85 sm:group-hover:opacity-100'
                              : 'opacity-0'
                          }`}
                        >
                          {day.seconds > 0 ? formatMinutesAxis(day.seconds) : ''}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[38px] rounded-t-lg transition-all duration-200 ${
                            day.seconds === 0
                              ? 'h-[3px] bg-slate-200 dark:bg-slate-800'
                              : day.isToday
                                ? 'bg-blue-600 dark:bg-blue-500'
                                : isFocused
                                  ? 'bg-blue-700 dark:bg-blue-400'
                                  : 'bg-blue-500/70 dark:bg-blue-400/65 group-hover:bg-blue-600 dark:group-hover:bg-blue-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* X-Axis Day Labels */}
                <div className="h-7 grid grid-cols-7 gap-2 sm:gap-4 items-center px-1 sm:px-3 pt-1.5">
                  {activeWeekDays.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`text-center text-[11px] tabular-nums truncate ${
                        day.isToday
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : 'font-medium text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {day.isToday ? 'Nay' : `${day.weekdayShort} ${day.dayNumber}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {focusedDayBucket && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-700 dark:text-slate-300 tabular-nums">
                  <span className="font-semibold">{focusedDayBucket.fullDateLabel}</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span>{formatDurationShort(focusedDayBucket.seconds)}</span>
                  <span className="mx-1.5 text-slate-400">·</span>
                  <span>{focusedDayBucket.storyIds.length} truyện</span>
                </div>
                {weekRange === 'current' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(focusedDayBucket.dateKey);
                      setFocusedHour(null);
                      setGranularity('day');
                    }}
                    className="min-h-[36px] px-3 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                  >
                    Xem biểu đồ theo giờ
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 24-Hour Daily Bar Chart */
          <div className="space-y-3">
            <div className="relative h-56 flex gap-3 pt-4">
              {/* Y-Axis */}
              <div className="w-9 flex flex-col justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums text-right pb-7 shrink-0 select-none">
                <span>{formatMinutesAxis(hourlyMaxSeconds)}</span>
                <span>{formatMinutesAxis(Math.round(hourlyMaxSeconds / 2))}</span>
                <span>0p</span>
              </div>

              {/* 24-Hour Plot */}
              <div className="flex-1 relative flex flex-col">
                <div className="flex-1 relative flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                  <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                  <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
                </div>

                <div className="absolute inset-x-0 top-0 bottom-7 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 sm:gap-1.5 items-end">
                  {selectedDayBucket.hourly.map((bucket) => {
                    const heightPct =
                      bucket.seconds > 0
                        ? Math.max(7, Math.min(100, (bucket.seconds / hourlyMaxSeconds) * 100))
                        : 0;
                    const isFocused = focusedHour === bucket.hour;
                    return (
                      <button
                        key={bucket.hour}
                        type="button"
                        onClick={() =>
                          setFocusedHour((prev) => (prev === bucket.hour ? null : bucket.hour))
                        }
                        aria-label={`${bucket.hour} giờ: ${formatDurationShort(bucket.seconds)}`}
                        className="group h-full flex flex-col justify-end items-center focus:outline-none cursor-pointer"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-200 ${
                            bucket.seconds === 0
                              ? 'h-[2px] bg-slate-200 dark:bg-slate-800'
                              : isFocused
                                ? 'bg-blue-700 dark:bg-blue-400'
                                : 'bg-blue-600/80 dark:bg-blue-500/80 group-hover:bg-blue-600 dark:group-hover:bg-blue-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="h-7 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums pt-1.5">
                  <span>0h</span>
                  <span>4h</span>
                  <span>8h</span>
                  <span>12h</span>
                  <span>16h</span>
                  <span>20h</span>
                  <span>23h</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
              {focusedHourBucket ? (
                <span>
                  Khung giờ{' '}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {String(focusedHourBucket.hour).padStart(2, '0')}:00 –{' '}
                    {String((focusedHourBucket.hour + 1) % 24).padStart(2, '0')}:00
                  </strong>
                  <span className="mx-1.5 text-slate-400">·</span>
                  {formatDurationShort(focusedHourBucket.seconds)}
                </span>
              ) : (
                <span>Không có phiên nghe nào được ghi nhận trong ngày này</span>
              )}
              <span className="text-slate-500 dark:text-slate-400">
                {selectedDayBucket.storyIds.length} truyện trong ngày
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Bottom 2-Column Breakdown: Genres + Top Stories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Genre Breakdown */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Thể loại hay nghe
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phân bổ thời lượng nghe theo thể loại truyện
            </p>
          </div>

          {report.genres.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-500 dark:text-slate-400">
              Chưa có dữ liệu thể loại từ tiến trình nghe.
            </div>
          ) : (
            <div className="space-y-4">
              {report.genres.slice(0, 6).map((g) => (
                <div key={g.genre} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {g.genre}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      {formatDurationShort(g.seconds)} · {g.sharePercent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-[#111318] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.max(4, g.sharePercent)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {g.storyCount} truyện
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Listened Stories from progressMap */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Truyện đã nghe từ tiến trình
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xếp hạng theo thời lượng ước tính &amp; thời gian nghe thực tế
            </p>
          </div>

          {report.topStories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-500 dark:text-slate-400">
              Chưa có truyện nào trong progressMap.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.topStories.slice(0, 8).map((item) => {
                const existsInLibrary = storyIdSet.has(item.storyId);
                return (
                  <div
                    key={item.storyId}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      disabled={!existsInLibrary}
                      onClick={() => existsInLibrary && onOpenStory(item.storyId)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default"
                    >
                      <StoryCover
                        title={item.title}
                        cover={item.cover}
                        className="w-10 h-14 rounded-lg shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                          {item.genre}
                          {item.totalChapters > 0
                            ? ` · Chương ${Math.min(item.chapterIndex + 1, item.totalChapters)}/${item.totalChapters} (${item.progressPercent}%)`
                            : ''}
                          {item.updatedAt > 0 ? ` · ${formatRelativeTimeVi(item.updatedAt)}` : ''}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        {formatDurationShort(item.seconds)}
                      </span>
                      {existsInLibrary && (
                        <button
                          type="button"
                          onClick={() => onResumeStory(item.storyId)}
                          aria-label={`Nghe tiếp ${item.title}`}
                          className="min-h-[40px] min-w-[40px] px-3 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Nghe</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Thống kê kết hợp tiến trình nghe được lưu và đồng bộ trong progressMap cùng thời gian phát
        trực tiếp trên thiết bị theo múi giờ địa phương.
      </p>
    </div>
  );
};
