import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AudioLines,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Gauge,
  Keyboard,
  LocateFixed,
  Minus,
  Palette,
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
  Trash2,
  Volume2,
  Waves,
  X,
} from 'lucide-react';
import { NightScheduleCard } from '@/src/components/NightScheduleCard';
import type { EqGains } from '@/src/lib/audioEqualizer';
import {
  AUDIO_FILTER_PRESETS,
  EQ_BANDS,
  EQ_PRESETS,
  OFFLINE_VOICE_PROFILES,
  READER_PASTEL_THEMES,
  type AdvancedAudioFilterState,
  type AmbientMode,
  type AudioFilterPresetId,
  type ChapterBookmark,
  type ChapterContent,
  type EqPresetId,
  type NightScheduleConfig,
  type ReaderBgThemeId,
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
  speechChunkProgress?: number;
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
  nightSchedule: NightScheduleConfig;
  nightScheduleActive: boolean;
  playlistLabel?: string;
  backInterceptorRef?: React.MutableRefObject<(() => boolean) | null>;
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
  onChangeNightSchedule: (config: NightScheduleConfig) => void;
  chapterBookmarks: ChapterBookmark[];
  onAddBookmark: (excerpt: string, note?: string) => Promise<void> | void;
  onDeleteBookmark: (bookmarkId: string) => Promise<void> | void;
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
  speechChunkProgress = 0,
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
  nightSchedule,
  nightScheduleActive,
  playlistLabel,
  backInterceptorRef,
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
  onChangeNightSchedule,
  chapterBookmarks,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [drawerTab, setDrawerTab] = useState<'none' | 'settings' | 'eq' | 'filter'>('none');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [readerBgTheme, setReaderBgTheme] = useState<ReaderBgThemeId>(() => {
    try {
      const saved = localStorage.getItem('truyen_audio_reader_bg_v1') as ReaderBgThemeId | null;
      return saved && READER_PASTEL_THEMES.some((t) => t.id === saved) ? saved : 'default';
    } catch {
      return 'default';
    }
  });
  const [autoScrollSync, setAutoScrollSync] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('truyen_audio_auto_scroll_sync');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [userScrolledAway, setUserScrolledAway] = useState(false);

  const activeSpanRef = useRef<HTMLSpanElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const proseCardRef = useRef<HTMLDivElement | null>(null);
  const manualScrollPauseUntilRef = useRef<number>(0);
  const manualSyncPauseUntilRef = useRef<number>(0);
  const scrolledChapterIdRef = useRef<string | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const didSwipeGestureRef = useRef(false);

  useEffect(() => {
    if (!backInterceptorRef) return;
    backInterceptorRef.current = () => {
      if (showBookmarkModal) {
        setShowBookmarkModal(false);
        return true;
      }
      if (drawerTab !== 'none') {
        setDrawerTab('none');
        return true;
      }
      if (showBgPicker) {
        setShowBgPicker(false);
        return true;
      }
      return false;
    };
    return () => {
      backInterceptorRef.current = null;
    };
  }, [backInterceptorRef, drawerTab, showBgPicker, showBookmarkModal]);

  // Hide top & bottom action bars automatically when the user scrolls/swipes the reading canvas
  useEffect(() => {
    const isInsideReaderChrome = (target: EventTarget | null) =>
      target instanceof HTMLElement && !!target.closest('[data-reader-chrome="true"]');

    const hideChromeOnScroll = () => {
      setControlsVisible(false);
      setDrawerTab('none');
      setShowBgPicker(false);
    };

    const onTouchStart = (e: TouchEvent) => {
      didSwipeGestureRef.current = false;
      if (isInsideReaderChrome(e.target)) {
        touchStartYRef.current = null;
        return;
      }
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current === null || isInsideReaderChrome(e.target)) return;
      const curY = e.touches[0]?.clientY ?? touchStartYRef.current;
      if (Math.abs(curY - touchStartYRef.current) > 14) {
        didSwipeGestureRef.current = true;
        hideChromeOnScroll();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isInsideReaderChrome(e.target)) return;
      if (Math.abs(e.deltaY) > 6) {
        hideChromeOnScroll();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleProseAreaTap = () => {
    if (didSwipeGestureRef.current) {
      didSwipeGestureRef.current = false;
      return;
    }
    const sel = window.getSelection?.()?.toString().trim();
    if (sel) return;

    if (showBgPicker || drawerTab !== 'none') {
      setShowBgPicker(false);
      setDrawerTab('none');
      return;
    }
    setControlsVisible((v) => !v);
  };

  const activeTheme = useMemo(
    () => READER_PASTEL_THEMES.find((t) => t.id === readerBgTheme) || READER_PASTEL_THEMES[0],
    [readerBgTheme]
  );

  const selectReaderBgTheme = (id: ReaderBgThemeId) => {
    setReaderBgTheme(id);
    try {
      localStorage.setItem('truyen_audio_reader_bg_v1', id);
    } catch {}
  };

  const toggleAutoScrollSync = () => {
    setAutoScrollSync((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('truyen_audio_auto_scroll_sync', String(next));
      } catch {}
      if (next) {
        manualSyncPauseUntilRef.current = 0;
        setUserScrolledAway(false);
        window.requestAnimationFrame(() => {
          (activeWordRef.current || activeSpanRef.current)?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
        });
      }
      return next;
    });
  };

  const snapBackToActiveSpeech = () => {
    manualSyncPauseUntilRef.current = 0;
    setUserScrolledAway(false);
    if (!autoScrollSync) {
      setAutoScrollSync(true);
      try {
        localStorage.setItem('truyen_audio_auto_scroll_sync', 'true');
      } catch {}
    }
    window.requestAnimationFrame(() => {
      (activeWordRef.current || activeSpanRef.current)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    });
  };

  const currentExcerpt = useMemo(() => {
    if (isNativeAudio || chunks.length === 0) {
      return `Đoạn âm thanh tại ${formatTime(audioCurrentTime)}`;
    }
    const safeIdx = Math.min(Math.max(0, chunkIndex), chunks.length - 1);
    let combined = (chunks[safeIdx]?.t || '').trim();
    if (combined.length < 80 && safeIdx + 1 < chunks.length) {
      combined = `${combined} ${(chunks[safeIdx + 1]?.t || '').trim()}`.trim();
    }
    if (combined.length > 180) {
      return `${combined.slice(0, 177).trim()}…`;
    }
    return combined || chapter.title;
  }, [audioCurrentTime, chapter.title, chunkIndex, chunks, isNativeAudio]);

  const bookmarkedChunkSet = useMemo(
    () => new Set(chapterBookmarks.map((b) => b.chunkIndex)),
    [chapterBookmarks]
  );

  const isCurrentPositionBookmarked = useMemo(() => {
    if (isNativeAudio) {
      return chapterBookmarks.some((b) => Math.abs(b.audioTime - audioCurrentTime) <= 5);
    }
    return bookmarkedChunkSet.has(chunkIndex);
  }, [audioCurrentTime, bookmarkedChunkSet, chapterBookmarks, chunkIndex, isNativeAudio]);

  const handleSaveCurrentBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingBookmark) return;
    setSavingBookmark(true);
    try {
      await onAddBookmark(currentExcerpt, bookmarkNote);
      setBookmarkNote('');
      setShowBookmarkModal(false);
    } finally {
      setSavingBookmark(false);
    }
  };

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

  // Map native audio playback time proportionally across text chunks when both audio & text exist
  const chunkCharRanges = useMemo(() => {
    let acc = 0;
    const ranges = chunks.map((c) => {
      const start = acc;
      const len = Math.max(1, c.t.trim().length);
      acc += len;
      return { start, end: acc };
    });
    return { totalChars: Math.max(1, acc), ranges };
  }, [chunks]);

  const { effectiveChunkIndex, effectiveSubProgress } = useMemo(() => {
    if (!isNativeAudio) {
      if (chunks.length === 0) return { effectiveChunkIndex: -1, effectiveSubProgress: 0 };
      return {
        effectiveChunkIndex: Math.min(Math.max(0, chunkIndex), chunks.length - 1),
        effectiveSubProgress: Math.min(1, Math.max(0, speechChunkProgress)),
      };
    }
    if (chunks.length > 0 && audioDuration > 0) {
      const ratio = Math.min(0.9999, Math.max(0, audioCurrentTime / audioDuration));
      const targetChar = ratio * chunkCharRanges.totalChars;
      const idx = chunkCharRanges.ranges.findIndex((r) => targetChar < r.end);
      const safeIdx = idx >= 0 ? idx : chunks.length - 1;
      const range = chunkCharRanges.ranges[safeIdx];
      const sub = range
        ? Math.min(1, Math.max(0, (targetChar - range.start) / Math.max(1, range.end - range.start)))
        : 0;
      return { effectiveChunkIndex: safeIdx, effectiveSubProgress: sub };
    }
    return { effectiveChunkIndex: -1, effectiveSubProgress: 0 };
  }, [audioCurrentTime, audioDuration, chunkCharRanges, chunkIndex, chunks.length, isNativeAudio, speechChunkProgress]);

  const activeWordBucket = Math.floor(effectiveSubProgress * 24);

  // Detect manual scrolling while speech auto-scroll sync is active so we don't fight the reader
  useEffect(() => {
    if (!isPlaying || !autoScrollSync) {
      setUserScrolledAway(false);
      return;
    }
    const handleUserScrollInput = () => {
      manualSyncPauseUntilRef.current = Date.now() + 3200;
      setUserScrolledAway(true);
    };
    window.addEventListener('wheel', handleUserScrollInput, { passive: true });
    window.addEventListener('touchstart', handleUserScrollInput, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleUserScrollInput);
      window.removeEventListener('touchstart', handleUserScrollInput);
    };
  }, [autoScrollSync, isPlaying]);

  // Keep active spoken word/sentence smoothly centered inside the readable viewport
  useEffect(() => {
    if (effectiveChunkIndex < 0) {
      if (scrolledChapterIdRef.current !== chapter.id) {
        scrolledChapterIdRef.current = chapter.id;
      }
      return;
    }

    if (scrolledChapterIdRef.current !== chapter.id) {
      scrolledChapterIdRef.current = chapter.id;
      if (effectiveChunkIndex > 0 || isPlaying) {
        window.requestAnimationFrame(() => {
          (activeWordRef.current || activeSpanRef.current)?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
        });
      }
      return;
    }

    if (!isPlaying || !autoScrollSync) return;
    if (Date.now() <= manualSyncPauseUntilRef.current) return;

    const targetEl = activeWordRef.current || activeSpanRef.current;
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const topBound = window.innerHeight * 0.22;
    const bottomBound = window.innerHeight * 0.66;
    if (rect.top < topBound || rect.bottom > bottomBound) {
      targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setUserScrolledAway(false);
    }
  }, [activeWordBucket, autoScrollSync, chapter.id, effectiveChunkIndex, isPlaying]);

  // Continuous hands-free auto-scroll loop (silent reading or when autoScrollSync is turned off)
  useEffect(() => {
    if (!handsFreeMode || handsFreePaused) return;
    if (isPlaying && autoScrollSync && effectiveChunkIndex >= 0) return;

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
  }, [autoScrollSync, effectiveChunkIndex, handsFreeMode, handsFreePaused, handsFreeSpeed, isPlaying]);

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

  const [shortcutHud, setShortcutHud] = useState<string | null>(null);
  const shortcutHudTimerRef = useRef<number | null>(null);
  const shortcutActionRef = useRef({
    rate,
    isPlaying,
    onTogglePlay,
    onPrevChapter,
    onNextChapter,
    onChangeRate,
  });
  shortcutActionRef.current = {
    rate,
    isPlaying,
    onTogglePlay,
    onPrevChapter,
    onNextChapter,
    onChangeRate,
  };

  useEffect(() => {
    const triggerHud = (message: string) => {
      setShortcutHud(message);
      if (shortcutHudTimerRef.current) {
        window.clearTimeout(shortcutHudTimerRef.current);
      }
      shortcutHudTimerRef.current = window.setTimeout(() => {
        setShortcutHud(null);
        shortcutHudTimerRef.current = null;
      }, 1400);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        if (e.repeat) return;
        e.preventDefault();
        const nextPlaying = !shortcutActionRef.current.isPlaying;
        shortcutActionRef.current.onTogglePlay();
        triggerHud(nextPlaying ? 'Phát (Space)' : 'Tạm dừng (Space)');
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (e.repeat) return;
        e.preventDefault();
        shortcutActionRef.current.onPrevChapter();
        triggerHud('Chương trước (←)');
        return;
      }

      if (e.key === 'ArrowRight') {
        if (e.repeat) return;
        e.preventDefault();
        shortcutActionRef.current.onNextChapter();
        triggerHud('Chương tiếp theo (→)');
        return;
      }

      if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
        e.preventDefault();
        const next = Math.min(
          2.5,
          Math.max(0.5, Math.round((shortcutActionRef.current.rate + 0.05) * 100) / 100)
        );
        shortcutActionRef.current.onChangeRate(next);
        triggerHud(`Tốc độ ${formatRateLabel(next)}× (+)`);
        return;
      }

      if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        const next = Math.min(
          2.5,
          Math.max(0.5, Math.round((shortcutActionRef.current.rate - 0.05) * 100) / 100)
        );
        shortcutActionRef.current.onChangeRate(next);
        triggerHud(`Tốc độ ${formatRateLabel(next)}× (-)`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (shortcutHudTimerRef.current) {
        window.clearTimeout(shortcutHudTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`min-h-[100dvh] w-full transition-colors duration-200 ${activeTheme.cardBgClass} border-0`}
    >
      {/* Overlay Top Navigation & Quick Appearance Bar (Tap screen to show, Scroll to hide) */}
      <div
        data-reader-chrome="true"
        className={`dark fixed top-0 left-0 right-0 md:left-64 z-30 pt-safe text-slate-100 backdrop-blur-xl backdrop-saturate-150 border-b border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/5 transition-all duration-200 ease-out ${
          showBgPicker ? 'bg-[#0B0E14]/84' : 'bg-[#0B0E14]/72'
        } ${
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Quay lại chi tiết truyện"
              className="min-h-[44px] min-w-[44px] -ml-1.5 inline-flex items-center justify-center rounded-xl text-slate-100 hover:bg-white/12 shrink-0 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                {chapter.title}
              </div>
              <div className="text-[11px] text-slate-300/90 truncate tabular-nums">
                {chapterIndex + 1}/{story.chapters.length} · {scrollProgressPercent}% ·{' '}
                {playlistLabel ? playlistLabel : story.title}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowBookmarkModal(true)}
                aria-pressed={isCurrentPositionBookmarked}
                title="Bookmark đoạn tâm đắc"
                className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isCurrentPositionBookmarked || chapterBookmarks.length > 0
                    ? 'bg-amber-500/22 border-amber-400/35 text-amber-200'
                    : 'bg-white/8 border-white/12 text-slate-100 hover:bg-white/15'
                }`}
              >
                {isCurrentPositionBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 shrink-0" />
                ) : (
                  <Bookmark className="w-4 h-4 shrink-0" />
                )}
                {chapterBookmarks.length > 0 && (
                  <span className="tabular-nums">{chapterBookmarks.length}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowBgPicker((v) => !v)}
                aria-expanded={showBgPicker}
                aria-label="Tùy chỉnh hiển thị & màu nền"
                title="Cỡ chữ, màu nền pastel & tự động cuộn"
                className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  showBgPicker || readerBgTheme !== 'default'
                    ? 'bg-blue-500/25 border-blue-400/40 text-blue-200'
                    : 'bg-white/8 border-white/12 text-slate-100 hover:bg-white/15'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                  style={{ backgroundColor: activeTheme.swatchHex }}
                />
                <Palette className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Expandable Display & Pastel Theme Panel inside Top Overlay */}
          {showBgPicker && controlsVisible && (
            <div className="pb-3.5 pt-2.5 border-t border-white/12 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center rounded-xl border border-white/15 bg-white/8 p-0.5 shrink-0">
                  {(['sm', 'md', 'lg'] as const).map((sz, i) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                        fontSize === sz
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {i === 0 ? 'A-' : i === 1 ? 'A' : 'A+'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {chunks.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAutoScrollSync}
                      aria-pressed={autoScrollSync}
                      className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                        autoScrollSync
                          ? 'bg-blue-600/25 border-blue-500/60 text-blue-200'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                      <span>Cuộn theo giọng</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleHandsFreeMode}
                    aria-pressed={handsFreeMode}
                    className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      handsFreeMode
                        ? 'bg-blue-600/25 border-blue-500/60 text-blue-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <ScrollText className="w-3.5 h-3.5 shrink-0" />
                    <span>Đọc rảnh tay</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleBlueLightFilter}
                    aria-pressed={blueLightFilter}
                    className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      blueLightFilter
                        ? 'bg-amber-500/25 border-amber-500/60 text-amber-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>Lọc mắt</span>
                  </button>
                </div>
              </div>

              {handsFreeMode && !(isPlaying && autoScrollSync && effectiveChunkIndex >= 0) && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <span className="text-[11px] font-medium text-slate-300">Tốc độ cuộn tự động</span>
                  <div className="flex items-center gap-1">
                    {([0.5, 1, 1.5, 2] as const).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => updateHandsFreeSpeed(sp)}
                        className={`min-h-[28px] px-2 rounded-lg text-[11px] font-semibold tabular-nums cursor-pointer ${
                          handsFreeSpeed === sp
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        {sp}×
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setHandsFreePaused((p) => !p)}
                      aria-label={handsFreePaused ? 'Tiếp tục cuộn' : 'Tạm dừng cuộn'}
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-white/20 cursor-pointer"
                    >
                      {handsFreePaused ? (
                        <Play className="w-3 h-3" />
                      ) : (
                        <Pause className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-400">
                  Màu nền trang đọc (Pastel dịu mắt)
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {READER_PASTEL_THEMES.map((theme) => {
                    const selected = readerBgTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => selectReaderBgTheme(theme.id)}
                        aria-pressed={selected}
                        aria-label={`Chọn màu nền ${theme.label}`}
                        className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                          selected
                            ? 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-400/50'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/30 shrink-0"
                          style={{ backgroundColor: theme.swatchHex }}
                        />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Bleed Synchronized Prose Area (Tap to show/hide bars, Double-tap sentence to seek) */}
      <div
        ref={proseCardRef}
        onClick={handleProseAreaTap}
        className="max-w-3xl mx-auto px-5 sm:px-10 pt-[calc(4.75rem+env(safe-area-inset-top,0px))] pb-[calc(11.5rem+env(safe-area-inset-bottom,0px))] cursor-pointer"
      >
        <header className="mb-7 pb-4 border-b border-black/8 dark:border-white/8">
          <h2 className={`text-xl sm:text-2xl font-bold leading-snug ${activeTheme.proseTextClass}`}>
            {chapter.title}
          </h2>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs opacity-65 tabular-nums">
            <span className={activeTheme.proseTextClass}>{story.title}</span>
            <span aria-hidden="true" className={activeTheme.proseTextClass}>·</span>
            <span className={activeTheme.proseTextClass}>
              Chương {chapterIndex + 1}/{story.chapters.length}
            </span>
          </div>
        </header>

        <div className={`font-serif ${activeTheme.proseTextClass} ${proseSizeClass}`}>
          {paragraphs.map((para) => (
            <p key={para.pIdx} className="mb-5 last:mb-0">
              {para.items.map((item) => {
                const active = item.idx === effectiveChunkIndex;
                const isBookmarked = !isNativeAudio && bookmarkedChunkSet.has(item.idx);
                const canSeekChunk = !isNativeAudio;

                let renderedContent: React.ReactNode = item.text;
                if (active && (isPlaying || effectiveSubProgress > 0)) {
                  const tokens = item.text.split(/(\s+)/);
                  let totalNonWsChars = 0;
                  const nonWsTokens: { tokenIdx: number; endChar: number }[] = [];
                  tokens.forEach((tk, idx) => {
                    if (/\S/.test(tk)) {
                      totalNonWsChars += tk.length;
                      nonWsTokens.push({ tokenIdx: idx, endChar: totalNonWsChars });
                    }
                  });
                  let activeWordTokenIdx = -1;
                  if (nonWsTokens.length > 0 && totalNonWsChars > 0) {
                    const targetChar = Math.min(
                      totalNonWsChars - 1,
                      Math.floor(effectiveSubProgress * totalNonWsChars)
                    );
                    const found = nonWsTokens.find((entry) => targetChar < entry.endChar);
                    activeWordTokenIdx = found
                      ? found.tokenIdx
                      : nonWsTokens[nonWsTokens.length - 1].tokenIdx;
                  }

                  renderedContent = tokens.map((tk, tkIdx) => {
                    if (tkIdx === activeWordTokenIdx) {
                      return (
                        <span
                          key={tkIdx}
                          ref={activeWordRef}
                          className={`rounded px-1 py-0.5 font-semibold transition-colors duration-75 ${activeTheme.activeWordClass}`}
                        >
                          {tk}
                        </span>
                      );
                    }
                    return <React.Fragment key={tkIdx}>{tk}</React.Fragment>;
                  });
                }

                return (
                  <span
                    key={item.idx}
                    ref={active ? activeSpanRef : undefined}
                    onDoubleClick={(e) => {
                      if (!canSeekChunk) return;
                      e.stopPropagation();
                      onSeekChunk(item.idx);
                    }}
                    title={
                      isBookmarked
                        ? 'Đoạn đã lưu Bookmark (Nhấn đúp để đọc từ đoạn này)'
                        : canSeekChunk
                          ? 'Nhấn để ẩn/hiện thanh điều khiển · Nhấn đúp để đọc từ câu này'
                          : undefined
                    }
                    className={`rounded px-0.5 transition-colors scroll-mb-52 ${
                      active
                        ? activeTheme.activeSentenceClass
                        : isBookmarked
                          ? 'bg-amber-400/15 dark:bg-amber-500/15 underline decoration-amber-500/70 decoration-2 underline-offset-4'
                          : ''
                    }`}
                  >
                    {renderedContent}{' '}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>

      {/* Subtle Floating Snap-Back Button when user scrolled away while listening */}
      {isPlaying && userScrolledAway && (
        <button
          type="button"
          data-reader-chrome="true"
          onClick={snapBackToActiveSpeech}
          className={`fixed right-4 z-20 min-h-[38px] px-3 rounded-xl bg-blue-600/85 backdrop-blur-xl backdrop-saturate-150 border border-white/20 text-white text-xs font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.4)] inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-blue-600 cursor-pointer transition-all duration-200 ${
            controlsVisible
              ? 'bottom-[calc(9.75rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <LocateFixed className="w-3.5 h-3.5 shrink-0" />
          <span>Về câu đang đọc</span>
        </button>
      )}

      {/* Transient Keyboard Shortcut HUD */}
      {shortcutHud && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] left-1/2 md:left-[calc(50%+8rem)] -translate-x-1/2 z-40 pointer-events-none px-3.5 py-1.5 rounded-xl bg-[#0B0E14]/78 border border-white/15 text-white text-xs font-semibold shadow-xl backdrop-blur-xl backdrop-saturate-150 whitespace-nowrap"
        >
          {shortcutHud}
        </div>
      )}

      {/* Fixed Bottom Dock: Progress Bar, Transport Controls & Settings (Tap screen to show, Scroll to hide) */}
      <div
        role="region"
        data-reader-chrome="true"
        aria-label="Thanh điều khiển phát và cài đặt"
        className={`dark fixed bottom-0 left-0 right-0 md:left-64 z-30 pb-safe border-t border-white/15 text-slate-100 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-10px_36px_rgba(0,0,0,0.34)] ring-1 ring-inset ring-white/5 transition-all duration-200 ease-out ${
          drawerTab !== 'none' ? 'bg-[#0B0E14]/84' : 'bg-[#0B0E14]/72'
        } ${
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 space-y-2">
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

              <div className="sm:col-span-2 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 space-y-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Palette className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Màu nền trang đọc (Pastel dịu mắt)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {READER_PASTEL_THEMES.map((theme) => {
                    const selected = readerBgTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => selectReaderBgTheme(theme.id)}
                        aria-pressed={selected}
                        aria-label={`Chọn màu nền ${theme.label}`}
                        className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                          selected
                            ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/40'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/15 dark:border-white/25 shrink-0"
                          style={{ backgroundColor: theme.swatchHex }}
                        />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
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

              <NightScheduleCard
                schedule={nightSchedule}
                isActiveNow={nightScheduleActive}
                onChange={onChangeNightSchedule}
                variant="drawer"
              />

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

              <div className="sm:col-span-2 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Keyboard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Phím tắt bàn phím</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      Space
                    </kbd>
                    <span>Phát / Tạm dừng</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      ←
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      →
                    </kbd>
                    <span>Chương trước / sau</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      +
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      -
                    </kbd>
                    <span>Tăng / giảm tốc độ</span>
                  </span>
                </div>
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

          {/* Primary Transport Controls Row */}
          <div className="flex items-center justify-around sm:justify-center sm:gap-6">
            <button
              type="button"
              onClick={() =>
                isNativeAudio
                  ? onSeekAudioTime(Math.max(0, audioCurrentTime - 15))
                  : onSeekChunk(Math.max(0, chunkIndex - 1))
              }
              title={isNativeAudio ? 'Lùi 15 giây' : 'Câu trước'}
              aria-label={isNativeAudio ? 'Lùi 15 giây' : 'Câu trước'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/12 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onPrevChapter}
              title="Chương trước (←)"
              aria-label="Chương trước"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/12 cursor-pointer transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              className="w-12 h-12 rounded-full bg-blue-600/95 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.45)] ring-1 ring-white/25 hover:bg-blue-500 active:scale-95 transition cursor-pointer shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextChapter}
              title="Chương sau (→)"
              aria-label="Chương sau"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/12 cursor-pointer transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                isNativeAudio
                  ? onSeekAudioTime(Math.min(audioDuration || 0, audioCurrentTime + 15))
                  : onSeekChunk(Math.min(Math.max(0, chunks.length - 1), chunkIndex + 1))
              }
              title={isNativeAudio ? 'Tiến 15 giây' : 'Câu sau'}
              aria-label={isNativeAudio ? 'Tiến 15 giây' : 'Câu sau'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/12 cursor-pointer transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Utility Controls Row */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/12">
            <button
              type="button"
              onClick={cycleRate}
              title="Đổi nhanh tốc độ đọc"
              className="min-h-[36px] min-w-[50px] px-2.5 rounded-xl border border-white/15 bg-white/8 text-xs font-semibold text-slate-100 hover:bg-white/15 tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              {formatRateLabel(rate)}×
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              {chunks.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAutoScrollSync}
                  aria-pressed={autoScrollSync}
                  title="Tự động cuộn văn bản theo dòng và từ đang đọc"
                  className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    autoScrollSync
                      ? 'border-blue-400/50 bg-blue-500/22 text-blue-200'
                      : 'border-white/15 bg-white/8 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Cuộn</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDrawerTab((t) => (t === 'filter' ? 'none' : 'filter'))}
                aria-expanded={drawerTab === 'filter'}
                title="Bộ lọc âm thanh nâng cao (Khử nhiễu & Độ vang)"
                className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  drawerTab === 'filter'
                    ? 'border-blue-400/60 bg-blue-600/90 text-white'
                    : advFilter.denoising > 0 || advFilter.reverb > 0
                      ? 'border-blue-400/50 bg-blue-500/22 text-blue-200'
                      : 'border-white/15 bg-white/8 text-slate-100 hover:bg-white/15'
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
                className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  drawerTab === 'eq'
                    ? 'border-blue-400/60 bg-blue-600/90 text-white'
                    : eqPreset !== 'flat'
                      ? 'border-blue-400/50 bg-blue-500/22 text-blue-200'
                      : 'border-white/15 bg-white/8 text-slate-100 hover:bg-white/15'
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
                className={`min-h-[36px] px-2.5 sm:px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  drawerTab === 'settings'
                    ? 'border-blue-400/60 bg-blue-600/90 text-white'
                    : 'border-white/15 bg-white/8 text-slate-100 hover:bg-white/15'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>Cài đặt</span>
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

      {/* Chapter Bookmark Modal */}
      {showBookmarkModal && (
        <div
          data-reader-chrome="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowBookmarkModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bookmark className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Bookmark đoạn tâm đắc
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarkModal(false)}
                aria-label="Đóng hộp thoại bookmark"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentBookmark} className="space-y-3">
              <div className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                  {chapter.title} ·{' '}
                  {isNativeAudio
                    ? formatTime(audioCurrentTime)
                    : `Đoạn ${Math.min(chunkIndex + 1, Math.max(1, chunks.length))}/${Math.max(1, chunks.length)}`}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-3">
                  “{currentExcerpt}”
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Ghi chú ngắn (không bắt buộc)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="Ví dụ: Câu thoại ấn tượng, cảnh cao trào…"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <button
                type="submit"
                disabled={savingBookmark}
                className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{savingBookmark ? 'Đang lưu…' : 'Lưu Bookmark vị trí này'}</span>
              </button>
            </form>

            {chapterBookmarks.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex-1 min-h-0 flex flex-col space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  Đã lưu trong chương này ({chapterBookmarks.length})
                </div>
                <ul className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1">
                  {chapterBookmarks.map((bm) => (
                    <li key={bm.id} className="py-2.5 flex items-start justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookmarkModal(false);
                          if (isNativeAudio) {
                            onSeekAudioTime(bm.audioTime);
                          } else {
                            onSeekChunk(bm.chunkIndex);
                            window.requestAnimationFrame(() => {
                              activeSpanRef.current?.scrollIntoView({
                                block: 'center',
                                behavior: 'smooth',
                              });
                            });
                          }
                        }}
                        className="min-w-0 flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      >
                        <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                          {isNativeAudio
                            ? formatTime(bm.audioTime)
                            : `Đoạn ${bm.chunkIndex + 1}`}
                          {bm.note ? ` · ${bm.note}` : ''}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                          “{bm.excerpt}”
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBookmark(bm.id)}
                        aria-label="Xóa bookmark này"
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
