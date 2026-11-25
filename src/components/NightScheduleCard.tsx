import React from 'react';
import { Clock, Eye, Moon } from 'lucide-react';
import { NIGHT_SCHEDULE_PRESETS, normalizeTimeString } from '@/src/lib/nightSchedule';
import type { NightScheduleConfig } from '@/src/types';

interface Props {
  schedule: NightScheduleConfig;
  isActiveNow: boolean;
  onChange: (next: NightScheduleConfig) => void;
  variant?: 'drawer' | 'inline';
}

export const NightScheduleCard: React.FC<Props> = ({
  schedule,
  isActiveNow,
  onChange,
  variant = 'drawer',
}) => {
  const wrapperClass =
    variant === 'drawer'
      ? 'sm:col-span-2 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 space-y-2.5'
      : 'pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-3';

  const statusText = !schedule.enabled
    ? 'Tự bật Chế độ tối & Lọc ánh sáng xanh theo giờ địa phương'
    : !schedule.enableDarkMode && !schedule.enableBlueLightFilter
      ? 'Hãy chọn ít nhất 1 chế độ bên dưới để tự động kích hoạt'
      : isActiveNow
        ? `Đang trong khung giờ ban đêm (${schedule.startTime} – ${schedule.endTime})`
        : `Đang chờ khung giờ ${schedule.startTime} – ${schedule.endTime} (giờ địa phương)`;

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
          <Clock className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
              Lịch tự động ban đêm
            </div>
            <div
              className={`text-[11px] tabular-nums ${
                isActiveNow && schedule.enabled
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {statusText}
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={schedule.enabled}
          aria-label="Bật hoặc tắt lịch tự động ban đêm"
          onClick={() => onChange({ ...schedule, enabled: !schedule.enabled })}
          className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors ${
            schedule.enabled
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {schedule.enabled ? 'Đang bật' : 'Tắt'}
        </button>
      </div>

      {schedule.enabled && (
        <div className="space-y-2.5 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Bắt đầu lúc
              </label>
              <input
                type="time"
                aria-label="Giờ bắt đầu chế độ ban đêm"
                value={schedule.startTime}
                onChange={(e) =>
                  onChange({
                    ...schedule,
                    startTime: normalizeTimeString(e.target.value, schedule.startTime),
                  })
                }
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-700 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Kết thúc lúc
              </label>
              <input
                type="time"
                aria-label="Giờ kết thúc chế độ ban đêm"
                value={schedule.endTime}
                onChange={(e) =>
                  onChange({
                    ...schedule,
                    endTime: normalizeTimeString(e.target.value, schedule.endTime),
                  })
                }
                className="w-full min-h-[40px] px-2.5 rounded-xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-700 text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 pr-0.5">
              Khung giờ gợi ý:
            </span>
            {NIGHT_SCHEDULE_PRESETS.map((preset) => {
              const active =
                schedule.startTime === preset.startTime && schedule.endTime === preset.endTime;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...schedule,
                      startTime: preset.startTime,
                      endTime: preset.endTime,
                    })
                  }
                  className={`min-h-[30px] px-2.5 rounded-lg border text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500/50'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={schedule.enableDarkMode}
              onClick={() =>
                onChange({ ...schedule, enableDarkMode: !schedule.enableDarkMode })
              }
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                schedule.enableDarkMode
                  ? 'bg-blue-600/10 border-blue-500/50 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Moon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Chủ đề tối (Dark mode)</span>
              </span>
              <span className="text-[11px] font-semibold shrink-0">
                {schedule.enableDarkMode ? 'Bật' : 'Tắt'}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={schedule.enableBlueLightFilter}
              onClick={() =>
                onChange({
                  ...schedule,
                  enableBlueLightFilter: !schedule.enableBlueLightFilter,
                })
              }
              className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                schedule.enableBlueLightFilter
                  ? 'bg-amber-500/12 border-amber-500/50 text-amber-800 dark:text-amber-300'
                  : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Lọc ánh sáng xanh</span>
              </span>
              <span className="text-[11px] font-semibold shrink-0">
                {schedule.enableBlueLightFilter ? 'Bật' : 'Tắt'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
