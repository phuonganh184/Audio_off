import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AudioLines,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Gauge,
  Lock,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  ScrollText,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  Waves,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import type { EqGains } from '@/src/lib/audioEqualizer';
import {
  AUDIO_FILTER_PRESETS,
  EQ_BANDS,
  EQ_PRESETS,
  OFFLINE_VOICE_PROFILES,
  type AdvancedAudioFilterState,
  type AmbientMode,
  type AudioFilterPresetId,
  type ChapterContent,
  type EqPresetId,
  type Story,
  type TextChunk,
  type VoiceProfileId,
} from '@/src/types';

interface Props {
  story: Story;
  chapter: ChapterContent;
  chapterIndex: number;
  chunks: TextChunk[];
  chunkIndex: number;
  isPlaying: boolean;
  isNativeAudio: boolean;
  audioCurrentTime: number;
  audioDuration: number;
  voices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  voiceProfileId: VoiceProfileId;
  voiceEnginePreference: 'auto' | 'device';
  aiTtsStatus: 'unknown' | 'available' | 'missing_key';
  isAiAudioActive: boolean;
  aiDownloadState: { active: boolean; done: number; total: number } | null;
  resolvedVoiceInfo?: {
    name: string;
    lang: string;
    localService: boolean;
    genderFallbackNotice?: string;
  } | null;
  eqPreset: EqPresetId;
  eqGains: EqGains;
  advFilter: AdvancedAudioFilterState;
  rate: number;
  sleepMinutes: number;
  ambientMode: AmbientMode;
  ambientVolume: number;
  wakeLockEnabled: boolean;
  autoPlayNext: boolean;
  blueLightFilter: boolean;
  playlistLabel?: string;
  onBack: () => void;
  onTogglePlay: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onSeekChunk: (index: number) => void;
  onSeekAudioTime: (seconds: number) => void;
  onChangeVoice: (name: string) => void;
  onChangeVoiceProfile: (id: VoiceProfileId) => void;
  onChangeVoiceEnginePreference: (pref: 'auto' | 'device') => void;
  onCacheChapterAiVoice: () => void;
  onPreviewVoice: () => void;
  onSelectEqPreset: (presetId: Exclude<EqPresetId, 'custom'>) => void;
  onChangeEqBand: (bandIndex: number, db: number) => void;
  onSelectAudioFilterPreset: (presetId: Exclude<AudioFilterPresetId, 'custom'>) => void;
  onChangeDenoising: (val: number) => void;
  onChangeReverb: (val: number) => void;
  onToggleVoicePriority: () => void;
  onChangeRate: (rate: number) => void;
  onChangeSleep: (minutes: number) => void;
  onChangeAmbient: (mode: AmbientMode) => void;
  onChangeAmbientVolume: (vol: number) => void;
  onToggleWakeLock: () => void;
  onToggleAutoPlayNext: () => void;
  onToggleBlueLightFilter: () => void;
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
const QUICK_SPEED_PILLS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];

function formatRateLabel(r: number): string {
  const rounded = Math.round(r * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
}

function describeRatePace(r: number): string {
  if (r < 0.8) return 'Chậm rãi';
  if (r < 0.95) return 'Hơi chậm';
  if (r <= 1.05) return 'Tự nhiên';
  if (r <= 1.35) return 'Hơi nhanh';
  if (r <= 1.8) return 'Nhanh';
  return 'Rất nhanh';
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ReaderPlayerView: React.FC<Props> = ({
  story,
  chapter,
  chapterIndex,
  chunks,
  chunkIndex,
  isPlaying,
  isNativeAudio,
  audioCurrentTime,
  audioDuration,
  voices,
  selectedVoiceName,
  voiceProfileId,
  voiceEnginePreference,
  aiTtsStatus,
  isAiAudioActive,
  aiDownloadState,
  resolvedVoiceInfo,
  eqPreset,
  eqGains,
  advFilter,
  rate,
  sleepMinutes,
  ambientMode,
  ambientVolume,
  wakeLockEnabled,
  autoPlayNext,
  blueLightFilter,
  playlistLabel,
  onBack,
  onTogglePlay,
  onPrevChapter,
  onNextChapter,
  onSeekChunk,
  onSeekAudioTime,
  onChangeVoice,
  onChangeVoiceProfile,
  onChangeVoiceEnginePreference,
  onCacheChapterAiVoice,
  onPreviewVoice,
  onSelectEqPreset,
  onChangeEqBand,
  onSelectAudioFilterPreset,
  onChangeDenoising,
  onChangeReverb,
  onToggleVoicePriority,
  onChangeRate,
  onChangeSleep,
  onChangeAmbient,
  onChangeAmbientVolume,
  onToggleWakeLock,
  onToggleAutoPlayNext,
  onToggleBlueLightFilter,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [drawerTab, setDrawerTab] = useState<'none' | 'settings' | 'eq' | 'filter'>('none');
  const [handsFreeMode, setHandsFreeMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('truyen_audio_hands_free') === 'true';
    } catch {
      return false;
    }
  });
  const [handsFreeSpeed, setHandsFreeSpeed] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('truyen_audio_hands_free_speed'));
      return [0.5, 1, 1.5, 2].includes(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  const [handsFreePaused, setHandsFreePaused] = useState(false);
  const [scrollProgressPercent, setScrollProgressPercent] = useState(0);

  const activeSpanRef = useRef<HTMLSpanElement | null>(null);
  const proseCardRef = useRef<HTMLDivElement | null>(null);
  const manualScrollPauseUntilRef = useRef<number>(0);

  const toggleHandsFreeMode = () => {
    setHandsFreeMode((prev) => {
      const next = !prev;
      setHandsFreePaused(false);
      try {
        localStorage.setItem('truyen_audio_hands_free', String(next));
      } catch {}
      return next;
    });
  };

  const updateHandsFreeSpeed = (speed: number) => {
    setHandsFreeSpeed(speed);
    setHandsFreePaused(false);
    try {
      localStorage.setItem('truyen_audio_hands_free_speed', String(speed));
    } catch {}
  };

  // Track chapter scroll reading progress (0% - 100%)
  useEffect(() => {
    const updateScrollProgress = () => {
      const el = proseCardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const docTop = window.scrollY + rect.top;
      const proseHeight = el.offsetHeight;
      const bottomBuffer = 220; // account for pinned bottom player dock
      const readableDistance = Math.max(1, proseHeight - (window.innerHeight - bottomBuffer));
      if (proseHeight <= window.innerHeight - bottomBuffer) {
        setScrollProgressPercent(100);
        return;
      }
      const scrolled = Math.max(0, window.scrollY - docTop + 80);
      const pct = Math.min(100, Math.max(0, Math.round((scrolled / readableDistance) * 100)));
      setScrollProgressPercent(pct);
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, [chapter.id, fontSize, chunks.length]);

  // Keep active TTS chunk visible when playing TTS (respecting manual browsing when handsFreeMode is off)
  useEffect(() => {
    if (!isNativeAudio && isPlaying && activeSpanRef.current) {
      activeSpanRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [chunkIndex, chapter.id, isNativeAudio, isPlaying]);

  // Continuous hands-free auto-scroll loop (works alongside native MP3/M4A audio or silent reading)
  useEffect(() => {
    if (!handsFreeMode || handsFreePaused) return;
    // When TTS is actively playing, activeSpanRef scrollIntoView keeps text synced automatically
    if (!isNativeAudio && isPlaying) return;

    const pauseOnUserInput = () => {
      manualScrollPauseUntilRef.current = Date.now() + 2200;
    };
    window.addEventListener('wheel', pauseOnUserInput, { passive: true });
    window.addEventListener('touchstart', pauseOnUserInput, { passive: true });

    let rafId = 0;
    let lastTs = performance.now();
    let carry = 0;

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      if (Date.now() > manualScrollPauseUntilRef.current) {
        const el = proseCardRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const maxScrollY = Math.max(
            0,
            window.scrollY + rect.top + el.offsetHeight - (window.innerHeight - 200)
          );
          if (window.scrollY < maxScrollY) {
            const pxPerSec = 30 * handsFreeSpeed;
            carry += pxPerSec * dt;
            if (carry >= 1) {
              const px = Math.floor(carry);
              carry -= px;
              window.scrollBy(0, px);
            }
          }
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', pauseOnUserInput);
      window.removeEventListener('touchstart', pauseOnUserInput);
    };
  }, [handsFreeMode, handsFreePaused, handsFreeSpeed, isNativeAudio, isPlaying]);

  const paragraphs = useMemo(() => {
    const groups: { pIdx: number; items: { idx: number; text: string }[] }[] = [];
    chunks.forEach((c, idx) => {
      let last = groups[groups.length - 1];
      if (!last || last.pIdx !== c.p) {
        last = { pIdx: c.p, items: [] };
        groups.push(last);
      }
      last.items.push({ idx, text: c.t });
    });
    return groups;
  }, [chunks]);

  const proseSizeClass =
    fontSize === 'sm'
      ? 'text-[16px] leading-[1.85]'
      : fontSize === 'lg'
        ? 'text-[20px] leading-[2]'
        : 'text-[18px] leading-[1.95]';

  const cycleRate = () => {
    const nextAbove = SPEED_PRESETS.find((r) => r > rate + 0.01);
    onChangeRate(nextAbove ?? SPEED_PRESETS[0]);
  };

  const stepRate = (delta: number) => {
    const next = Math.min(2.5, Math.max(0.5, Math.round((rate + delta) * 100) / 100));
    onChangeRate(next);
  };

  return (
    <div className="space-y-4 pb-[calc(11rem+env(safe-area-inset-bottom,0px))] md:pb-44">
      {/* Top Navigation & Quick Font Size */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            onClick={toggleHandsFreeMode}
            aria-pressed={handsFreeMode}
            title="Chế độ đọc rảnh tay (tự động cuộn văn bản khi đọc/nghe song song)"
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
              handsFreeMode
                ? 'bg-blue-600/15 border-blue-500/60 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Đọc rảnh tay</span>
            <span className="sm:hidden">Rảnh tay</span>
          </button>

          <button
            type="button"
            onClick={onToggleBlueLightFilter}
            aria-pressed={blueLightFilter}
            title="Chế độ lọc ánh sáng xanh (phủ hổ phách dịu mắt ban đêm)"
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
              blueLightFilter
                ? 'bg-amber-500/18 border-amber-500/60 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Lọc ánh sáng xanh</span>
            <span className="sm:hidden">Lọc mắt</span>
          </button>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d24] p-0.5 shrink-0">
            {(['sm', 'md', 'lg'] as const).map((sz, i) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`min-h-[34px] px-2 sm:px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  fontSize === sz
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {i === 0 ? 'A-' : i === 1 ? 'A' : 'A+'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Chapter Header Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3.5">
        <StoryCover
          title={story.title}
          cover={story.cover}
          className="w-12 h-16 sm:w-14 sm:h-18 rounded-xl shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
            {playlistLabel ? `Danh sách phát: ${playlistLabel}` : story.title}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
            {chapter.title}
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap tabular-nums">
            <span>
              Chương {chapterIndex + 1}/{story.chapters.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Hỗ trợ khóa màn hình</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Chapter Reading Progress & Hands-Free Controls Bar */}
      <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top,0px))] md:top-3 z-20 rounded-2xl bg-white/95 dark:bg-[#1a1d24]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              Tiến độ đọc chương
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
              {scrollProgressPercent}%
            </span>
          </div>

          {handsFreeMode && (
            <div className="flex items-center gap-1 shrink-0">
              {!isNativeAudio && isPlaying ? (
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg bg-blue-500/10">
                  Cuộn theo giọng đọc
                </span>
              ) : (
                <>
                  {([0.5, 1, 1.5, 2] as const).map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => updateHandsFreeSpeed(sp)}
                      className={`min-h-[26px] px-2 rounded-lg text-[11px] font-semibold tabular-nums cursor-pointer ${
                        handsFreeSpeed === sp
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sp}×
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHandsFreePaused((p) => !p)}
                    aria-label={handsFreePaused ? 'Tiếp tục cuộn' : 'Tạm dừng cuộn'}
                    className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {handsFreePaused ? (
                      <Play className="w-3 h-3" />
                    ) : (
                      <Pause className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div
          role="progressbar"
          aria-valuenow={scrollProgressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Thanh tiến độ đọc của chương"
          className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-150"
            style={{ width: `${scrollProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Synchronized Prose Area */}
      <div
        ref={proseCardRef}
        className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 sm:p-8"
      >
        <div className={`font-serif text-slate-800 dark:text-slate-200 ${proseSizeClass}`}>
          {paragraphs.map((para) => (
            <p key={para.pIdx} className="mb-5 last:mb-0">
              {para.items.map((item) => {
                const active = !isNativeAudio && item.idx === chunkIndex;
                return (
                  <span
                    key={item.idx}
                    ref={active ? activeSpanRef : undefined}
                    onClick={() => {
                      if (!isNativeAudio) onSeekChunk(item.idx);
                    }}
                    className={`rounded px-0.5 transition-colors scroll-mb-52 ${
                      !isNativeAudio ? 'cursor-pointer hover:bg-blue-500/10' : ''
                    } ${
                      active
                        ? 'bg-blue-500/20 dark:bg-blue-500/30 text-slate-950 dark:text-white'
                        : ''
                    }`}
                  >
                    {item.text}{' '}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>

      {/* Fixed Bottom Dock: Progress Bar, Transport Controls & Settings */}
      <div
        role="region"
        aria-label="Thanh điều khiển phát và cài đặt"
        className="fixed bottom-0 left-0 right-0 md:left-64 z-30 pb-safe border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#161920]/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 space-y-2">
          {/* Expandable Bottom Drawer: Settings or Equalizer */}
          {drawerTab === 'eq' && (
            <div className="max-h-[48vh] overflow-y-auto pb-2.5 mb-1 border-b border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AudioLines className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Bộ chỉnh âm (Equalizer)
                  </span>
                  {eqPreset === 'custom' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/12 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                      Tùy chỉnh
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectEqPreset('flat')}
                  className="min-h-[30px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đặt lại
                </button>
              </div>

              {/* EQ Presets */}
              <div className="flex flex-wrap gap-1.5">
                {EQ_PRESETS.map((preset) => {
                  const active = eqPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectEqPreset(preset.id)}
                      className={`min-h-[34px] px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* 5-Band EQ Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {EQ_BANDS.map((band, idx) => {
                  const val = eqGains[idx] ?? 0;
                  return (
                    <div
                      key={band.frequency}
                      className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3 py-2 flex sm:flex-col items-center justify-between gap-2.5"
                    >
                      <div className="w-20 sm:w-full flex sm:flex-col items-center justify-between sm:text-center shrink-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {band.shortLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                          {band.label}
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label={`Dải tần ${band.shortLabel} ${band.label}`}
                        min={-12}
                        max={12}
                        step={1}
                        value={val}
                        onChange={(e) => onChangeEqBand(idx, Number(e.target.value))}
                        className="flex-1 sm:w-full accent-blue-600 cursor-pointer h-1.5"
                      />
                      <span
                        className={`w-12 sm:w-auto text-right sm:text-center font-semibold tabular-nums shrink-0 ${
                          val > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : val < 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {val > 0 ? `+${val} dB` : `${val} dB`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isNativeAudio || isAiAudioActive
                  ? 'Bộ chỉnh âm 5 dải đang lọc trực tiếp âm thanh giọng đọc và nhạc nền.'
                  : voiceEnginePreference === 'auto' && aiTtsStatus !== 'missing_key'
                    ? 'Áp dụng trực tiếp khi phát Giọng AI Tiếng Việt, file âm thanh (.mp3, .wav) và tiếng nền.'
                    : 'Đang phát bằng giọng hệ thống của trình duyệt (trình duyệt không cho phép lọc EQ qua giọng hệ thống). Dùng Giọng AI Tiếng Việt hoặc file âm thanh để chỉnh âm trực tiếp.'}
              </p>
            </div>
          )}

          {drawerTab === 'filter' && (
            <div className="max-h-[48vh] overflow-y-auto pb-2.5 mb-1 border-b border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Bộ lọc âm thanh nâng cao
                  </span>
                  {(advFilter.denoising > 0 || advFilter.reverb > 0) && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/12 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                      {advFilter.preset === 'custom' ? 'Tùy chỉnh' : 'Đang bật'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectAudioFilterPreset('default')}
                  className="min-h-[30px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đặt lại
                </button>
              </div>

              {/* Quick Filter Presets */}
              <div className="flex flex-wrap gap-1.5">
                {AUDIO_FILTER_PRESETS.map((preset) => {
                  const active = advFilter.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectAudioFilterPreset(preset.id)}
                      className={`min-h-[34px] px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                          : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Denoising & Reverb Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Lọc nhiễu &amp; Rõ giọng (Denoising)
                    </span>
                    <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {advFilter.denoising}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Mức độ lọc nhiễu denoising"
                    min={0}
                    max={100}
                    step={5}
                    value={advFilter.denoising}
                    onChange={(e) => onChangeDenoising(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-1.5"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cắt tạp âm ù/rè, nén ổn định âm lượng và tăng độ nổi dải lời nói để nghe rõ chữ hơn.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Độ vang không gian (Reverb)
                    </span>
                    <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {advFilter.reverb}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Độ vang reverb cho giọng đọc"
                    min={0}
                    max={100}
                    step={5}
                    value={advFilter.reverb}
                    onChange={(e) => onChangeReverb(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-1.5"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Thêm chiều sâu phòng đọc ấm áp cho giọng kể chuyện AI mà không làm nhòe câu chữ.
                  </p>
                </div>
              </div>

              {/* Voice Priority Ducking Toggle */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Ưu tiên nổi giọng trên âm thanh nền
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động giảm nhẹ tiếng mưa/ồn nâu khi đang đọc để giọng kể luôn tách bạch
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={advFilter.voicePriority}
                  onClick={onToggleVoicePriority}
                  className={`min-h-[32px] px-3 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
                    advFilter.voicePriority
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {advFilter.voicePriority ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isNativeAudio || isAiAudioActive
                  ? 'Bộ lọc khử nhiễu và độ vang đang xử lý trực tiếp trên luồng giọng đọc.'
                  : voiceEnginePreference === 'auto' && aiTtsStatus !== 'missing_key'
                    ? 'Áp dụng trực tiếp khi phát bằng Giọng AI Tiếng Việt hoặc file âm thanh.'
                    : 'Hãy chọn nguồn Giọng AI Tiếng Việt (hoặc file audio) để áp dụng khử nhiễu và độ vang trực tiếp.'}
              </p>
            </div>
          )}

          {drawerTab === 'settings' && (
            <div className="max-h-[45vh] overflow-y-auto pb-2.5 mb-1 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {!isNativeAudio && (
                <>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Nguồn giọng đọc:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onChangeVoiceEnginePreference('auto')}
                        className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          voiceEnginePreference === 'auto'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Giọng AI Nữ / Nam Việt
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeVoiceEnginePreference('device')}
                        className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                          voiceEnginePreference === 'device'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Giọng thiết bị
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <span>Giọng AI Tiếng Việt (Nữ &amp; Nam)</span>
                      </label>
                      <button
                        type="button"
                        onClick={onPreviewVoice}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/12 text-blue-600 dark:text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Nghe thử</span>
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={voiceProfileId}
                        onChange={(e) => onChangeVoiceProfile(e.target.value as VoiceProfileId)}
                        className="w-full min-h-[40px] pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 appearance-none"
                      >
                        {OFFLINE_VOICE_PROFILES.map((vp) => (
                          <option key={vp.id} value={vp.id}>
                            {vp.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {OFFLINE_VOICE_PROFILES.find((vp) => vp.id === voiceProfileId)?.description}
                    </p>
                    {voiceEnginePreference === 'auto' && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {aiTtsStatus === 'available' ? (
                          <button
                            type="button"
                            disabled={!!aiDownloadState?.active}
                            onClick={onCacheChapterAiVoice}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-500/15 disabled:opacity-60 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {aiDownloadState?.active
                                ? `Đang tải giọng AI (${aiDownloadState.done}/${aiDownloadState.total})…`
                                : 'Tải giọng AI chương này (Nghe offline)'}
                            </span>
                          </button>
                        ) : aiTtsStatus === 'missing_key' ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            Chưa cấu hình GEMINI_API_KEY trên máy chủ để tạo giọng AI mới (các đoạn đã tải vẫn nghe offline được; chưa tải sẽ dùng giọng thiết bị).
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Giọng dự phòng trên thiết bị
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => onChangeVoice(e.target.value)}
                        className="w-full min-h-[40px] pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 appearance-none"
                      >
                        {voices.length === 0 ? (
                          <option value="">Giọng Tiếng Việt mặc định (Offline)</option>
                        ) : (
                          <>
                            <option value="">Tự động theo giọng AI (Tiếng Việt)</option>
                            {voices.map((v) => (
                              <option key={`${v.name}-${v.lang}`} value={v.name}>
                                {v.name} ({v.lang}) · {v.localService ? 'Offline' : 'Cần mạng'}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                      {voiceEnginePreference === 'auto' &&
                      (isAiAudioActive || aiTtsStatus === 'available') ? (
                        <div className="font-medium text-emerald-600 dark:text-emerald-400">
                          Đang dùng Giọng AI{' '}
                          {OFFLINE_VOICE_PROFILES.find((vp) => vp.id === voiceProfileId)
                            ?.aiGenderLabel || 'Tiếng Việt'}{' '}
                          (hỗ trợ EQ &amp; tự lưu offline).
                        </div>
                      ) : resolvedVoiceInfo ? (
                        <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          Đang đọc bằng: {resolvedVoiceInfo.name} (
                          {resolvedVoiceInfo.localService ? 'Offline' : 'Trực tuyến'})
                        </div>
                      ) : null}
                      {voiceEnginePreference === 'device' && resolvedVoiceInfo?.genderFallbackNotice ? (
                        <div className="text-amber-600 dark:text-amber-400">
                          {resolvedVoiceInfo.genderFallbackNotice}
                        </div>
                      ) : (
                        <div>Có {voices.length} giọng Tiếng Việt trên thiết bị.</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="sm:col-span-2 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Gauge className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <label
                      htmlFor="ai-voice-speed-slider"
                      className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                    >
                      Tốc độ giọng AI &amp; phát (0.5× – 2.5×)
                    </label>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {describeRatePace(rate)}
                    </span>
                    <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatRateLabel(rate)}×
                    </span>
                    {Math.abs(rate - 1) > 0.01 && (
                      <button
                        type="button"
                        onClick={() => onChangeRate(1)}
                        className="min-h-[26px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        1.0×
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepRate(-0.05)}
                    disabled={rate <= 0.5}
                    aria-label="Giảm tốc độ đọc 0.05 lần"
                    title="Giảm 0.05×"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      id="ai-voice-speed-slider"
                      type="range"
                      aria-label="Điều chỉnh tốc độ giọng AI từ 0.5x đến 2.5x"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={Math.min(2.5, Math.max(0.5, rate))}
                      onChange={(e) => onChangeRate(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 tabular-nums px-0.5">
                      <span>0.5×</span>
                      <span>1.0×</span>
                      <span>1.5×</span>
                      <span>2.0×</span>
                      <span>2.5×</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => stepRate(0.05)}
                    disabled={rate >= 2.5}
                    aria-label="Tăng tốc độ đọc 0.05 lần"
                    title="Tăng 0.05×"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_SPEED_PILLS.map((preset) => {
                    const active = Math.abs(rate - preset) < 0.01;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onChangeRate(preset)}
                        className={`min-h-[30px] px-2.5 rounded-lg border text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500/50'
                        }`}
                      >
                        {formatRateLabel(preset)}×
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Hẹn giờ tắt</span>
                </label>
                <select
                  value={sleepMinutes}
                  onChange={(e) => onChangeSleep(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={0}>Tắt hẹn giờ</option>
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>60 phút</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Âm thanh giữ phát nền</span>
                  </label>
                  <select
                    value={ambientMode}
                    onChange={(e) => onChangeAmbient(e.target.value as AmbientMode)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="silent">Im lặng (Giữ phiên phát nền)</option>
                    <option value="rain">Tiếng mưa nhẹ thư giãn</option>
                    <option value="brown">Tiếng ồn nâu ấm (Dễ ngủ)</option>
                  </select>
                </div>

                {ambientMode !== 'silent' && (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
                      Âm lượng nền
                    </span>
                    <input
                      type="range"
                      aria-label="Âm lượng âm thanh nền"
                      min={0.03}
                      max={0.45}
                      step={0.01}
                      value={ambientVolume}
                      onChange={(e) => onChangeAmbientVolume(Number(e.target.value))}
                      className="flex-1 accent-blue-600 cursor-pointer h-1.5"
                    />
                    <span className="w-10 text-right font-semibold tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                      {Math.round(ambientVolume * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                  <SkipForward className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      Tự động phát chương tiếp theo
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tự chuyển sang chương kế tiếp khi kết thúc chương hiện tại
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoPlayNext}
                  onClick={onToggleAutoPlayNext}
                  className={`min-h-[32px] px-3 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
                    autoPlayNext
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {autoPlayNext ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                  <ScrollText className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      Chế độ đọc rảnh tay
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tự động cuộn nội dung văn bản song song khi đọc & nghe audio
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={handsFreeMode}
                  onClick={toggleHandsFreeMode}
                  className={`min-h-[32px] px-3 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
                    handsFreeMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {handsFreeMode ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
                  <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      Chế độ lọc ánh sáng xanh
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Phủ lớp màu hổ phách dịu mắt khi nghe vào buổi tối
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={blueLightFilter}
                  onClick={onToggleBlueLightFilter}
                  className={`min-h-[32px] px-3 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
                    blueLightFilter
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {blueLightFilter ? 'Đang bật' : 'Tắt'}
                </button>
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Giữ sáng màn hình khi đang đọc chữ</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wakeLockEnabled}
                  onClick={onToggleWakeLock}
                  className={`min-h-[32px] px-3 rounded-lg font-semibold shrink-0 cursor-pointer ${
                    wakeLockEnabled
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {wakeLockEnabled ? 'Đang bật' : 'Tắt'}
                </button>
              </div>
            </div>
          )}

          {/* Always-visible Progress Bar (Thanh tiến trình) */}
          <div className="space-y-1">
            {isNativeAudio ? (
              <>
                <input
                  type="range"
                  aria-label="Thanh tiến trình âm thanh"
                  min={0}
                  max={Math.max(1, Math.floor(audioDuration || 100))}
                  value={Math.floor(audioCurrentTime)}
                  onChange={(e) => onSeekAudioTime(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{formatTime(audioCurrentTime)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </>
            ) : (
              <>
                <input
                  type="range"
                  aria-label="Thanh tiến trình đọc chương"
                  min={0}
                  max={Math.max(0, chunks.length - 1)}
                  value={Math.min(chunkIndex, Math.max(0, chunks.length - 1))}
                  onChange={(e) => onSeekChunk(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    Đoạn {Math.min(chunkIndex + 1, chunks.length)}/{chunks.length}
                  </span>
                  <span>
                    {chunks.length > 0
                      ? `${Math.round(((chunkIndex + 1) / chunks.length) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Transport Controls + Quick Speed & Settings Toggle */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={cycleRate}
              title="Đổi nhanh tốc độ đọc"
              className="min-h-[38px] min-w-[52px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 tabular-nums whitespace-nowrap shrink-0 cursor-pointer"
            >
              {formatRateLabel(rate)}×
            </button>

            <div className="flex items-center justify-center gap-1 sm:gap-3">
              <button
                onClick={onPrevChapter}
                title="Chương trước"
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() =>
                  isNativeAudio
                    ? onSeekAudioTime(Math.max(0, audioCurrentTime - 15))
                    : onSeekChunk(Math.max(0, chunkIndex - 1))
                }
                title={isNativeAudio ? 'Lùi 15 giây' : 'Câu trước'}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:bg-blue-700 active:scale-95 transition cursor-pointer shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <button
                onClick={() =>
                  isNativeAudio
                    ? onSeekAudioTime(Math.min(audioDuration || 0, audioCurrentTime + 15))
                    : onSeekChunk(Math.min(Math.max(0, chunks.length - 1), chunkIndex + 1))
                }
                title={isNativeAudio ? 'Tiến 15 giây' : 'Câu sau'}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              <button
                onClick={onNextChapter}
                title="Chương sau"
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab((t) => (t === 'filter' ? 'none' : 'filter'))}
                aria-expanded={drawerTab === 'filter'}
                title="Bộ lọc âm thanh nâng cao (Khử nhiễu & Độ vang)"
                className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  drawerTab === 'filter'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : advFilter.denoising > 0 || advFilter.reverb > 0
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Waves className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Lọc âm</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab((t) => (t === 'eq' ? 'none' : 'eq'))}
                aria-expanded={drawerTab === 'eq'}
                title="Bộ chỉnh âm (Equalizer)"
                className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  drawerTab === 'eq'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : eqPreset !== 'flat'
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <AudioLines className="w-4 h-4 shrink-0" />
                <span>EQ</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab((t) => (t === 'settings' ? 'none' : 'settings'))}
                aria-expanded={drawerTab === 'settings'}
                title="Cài đặt phát"
                className={`min-h-[38px] px-2.5 sm:px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                  drawerTab === 'settings'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Cài đặt</span>
                {sleepMinutes > 0 && (
                  <span className="text-[10px] font-bold tabular-nums opacity-90">
                    {sleepMinutes}p
                  </span>
                )}
                {drawerTab === 'settings' ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
