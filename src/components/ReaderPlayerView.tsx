import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AudioLines,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Timer,
  Volume2,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import type { EqGains } from '@/src/lib/audioEqualizer';
import {
  EQ_BANDS,
  EQ_PRESETS,
  OFFLINE_VOICE_PROFILES,
  type AmbientMode,
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
  eqPreset: EqPresetId;
  eqGains: EqGains;
  rate: number;
  sleepMinutes: number;
  ambientMode: AmbientMode;
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
  onPreviewVoice: () => void;
  onSelectEqPreset: (presetId: Exclude<EqPresetId, 'custom'>) => void;
  onChangeEqBand: (bandIndex: number, db: number) => void;
  onChangeRate: (rate: number) => void;
  onChangeSleep: (minutes: number) => void;
  onChangeAmbient: (mode: AmbientMode) => void;
  onToggleWakeLock: () => void;
  onToggleAutoPlayNext: () => void;
  onToggleBlueLightFilter: () => void;
}

const SPEED_PRESETS = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2];

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
  eqPreset,
  eqGains,
  rate,
  sleepMinutes,
  ambientMode,
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
  onPreviewVoice,
  onSelectEqPreset,
  onChangeEqBand,
  onChangeRate,
  onChangeSleep,
  onChangeAmbient,
  onToggleWakeLock,
  onToggleAutoPlayNext,
  onToggleBlueLightFilter,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [drawerTab, setDrawerTab] = useState<'none' | 'settings' | 'eq'>('none');
  const activeSpanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (activeSpanRef.current) {
      activeSpanRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [chunkIndex, chapter.id]);

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
    const idx = SPEED_PRESETS.findIndex((r) => Math.abs(r - rate) < 0.01);
    const next = SPEED_PRESETS[(idx + 1) % SPEED_PRESETS.length];
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

        <div className="flex items-center gap-2 shrink-0">
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
            <span className="hidden sm:inline">Chế độ lọc ánh sáng xanh</span>
            <span className="sm:hidden">Lọc mắt</span>
          </button>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d24] p-0.5 shrink-0">
            {(['sm', 'md', 'lg'] as const).map((sz, i) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
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

      {/* Synchronized Prose Area */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 sm:p-8">
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
                {isNativeAudio
                  ? 'Đang áp dụng trực tiếp cho file âm thanh của chương.'
                  : 'Áp dụng cho file âm thanh (.mp3, .m4a, .wav) và âm thanh nền (tiếng mưa / ồn nâu).'}
              </p>
            </div>
          )}

          {drawerTab === 'settings' && (
            <div className="max-h-[45vh] overflow-y-auto pb-2.5 mb-1 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {!isNativeAudio && (
                <>
                  <div>
                    <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span>Giọng đọc AI (Nghe Offline)</span>
                    </label>
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
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Giọng Tiếng Việt thiết bị
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {voices.length <= 1 && (!voices[0] || !voices[0].localService)
                        ? 'Trình duyệt hiện chỉ có 1 giọng Tiếng Việt trực tuyến (giọng này chỉ đổi được tốc độ, chưa hỗ trợ đổi cao độ trầm/bổng). Dùng Edge hoặc bật gói giọng Việt trên Windows/Android để nghe rõ các giọng AI.'
                        : `Có ${voices.length} giọng Tiếng Việt trên thiết bị.`}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tốc độ đọc
                </label>
                <select
                  value={rate}
                  onChange={(e) => onChangeRate(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {SPEED_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}×
                    </option>
                  ))}
                </select>
              </div>

              <div>
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
              className="min-h-[38px] min-w-[48px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 tabular-nums shrink-0 cursor-pointer"
            >
              {rate}×
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
