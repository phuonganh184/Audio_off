import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { registerSW } from 'virtual:pwa-register';
import {
  BookOpen,
  Cloud,
  HardDrive,
  ListMusic,
  Moon,
  Sun,
} from 'lucide-react';
import { AddToPlaylistModal } from '@/src/components/AddToPlaylistModal';
import { LibraryView } from '@/src/components/LibraryView';
import { MiniPlayer } from '@/src/components/MiniPlayer';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { OfflineManagerView } from '@/src/components/OfflineManagerView';
import { PlaylistsView } from '@/src/components/PlaylistsView';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import { ReaderPlayerView } from '@/src/components/ReaderPlayerView';
import { StoryDetailView } from '@/src/components/StoryDetailView';
import { SyncSettingsView } from '@/src/components/SyncSettingsView';
import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';
import { useTheme } from '@/src/hooks/useTheme';
import {
  loadSavedEqState,
  resumeAndSyncEqualizer,
  saveEqState,
  updateEqualizerGainsOnAudio,
  type EqGains,
  type EqState,
} from '@/src/lib/audioEqualizer';
import {
  clearMediaSession,
  getDeviceLabel,
  keepAliveEngine,
  updateMediaSession,
} from '@/src/lib/backgroundAudio';
import {
  deletePlaylistFromCloud,
  deleteStoryFromCloud,
  downloadChapterFromCloud,
  ensureUserProfile,
  pushPlaylistToCloud,
  pushProgressToCloud,
  pushStoryAndChapters,
  syncAllWithCloud,
} from '@/src/lib/cloudSync';
import { auth, googleProvider, testConnection } from '@/src/lib/firebase';
import {
  clearAllOfflineChapters,
  deleteChapterContent,
  deletePlaylistLocal,
  deleteStoryLocal,
  enqueueSync,
  exportBackupData,
  getAllPlaylists,
  getAllProgress,
  getAllStories,
  getChapterContent,
  getStorageStats,
  getSyncQueue,
  importBackupData,
  putChapterContent,
  putPlaylist,
  putProgress,
  putStory,
} from '@/src/lib/localDb';
import {
  chunkChapterText,
  nfc,
  parseChapterFile,
  processCoverImage,
  sanitizeId,
} from '@/src/lib/parsers';
import {
  EQ_PRESETS,
  OFFLINE_VOICE_PROFILES,
  PLAYLIST_WHOLE_STORY_MARKER,
  isWholeStoryPlaylistItem,
  type AmbientMode,
  type ChapterContent,
  type ChapterSummary,
  type EqPresetId,
  type ListeningProgress,
  type NavTab,
  type PlaybackContext,
  type Playlist,
  type PlaylistItem,
  type Story,
  type TextChunk,
  type VoiceProfileId,
} from '@/src/types';

export default function App() {
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();

  const [tab, setTab] = useState<NavTab>('library');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ListeningProgress>>({});
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [storageStats, setStorageStats] = useState({
    usedBytes: 0,
    quotaBytes: 0,
    offlineChaptersBytes: 0,
    offlineChapterCount: 0,
  });

  // Auth & Cloud Sync state
  const [user, setUser] = useState<User | null>(null);
  const [, setAuthTick] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string>(() => {
    try {
      return localStorage.getItem('truyen_audio_device') || getDeviceLabel();
    } catch {
      return getDeviceLabel();
    }
  });

  // Downloads & Modals
  const [downloadingStoryId, setDownloadingStoryId] = useState<string | null>(null);
  const [downloadProgressText, setDownloadProgressText] = useState('');
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState<string | null>(null);
  const [playlistModalTarget, setPlaylistModalTarget] = useState<Story | null>(null);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Audio Playback State
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [activeChapterContent, setActiveChapterContent] = useState<ChapterContent | null>(null);
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [chunkIndex, setChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext>({ mode: 'story' });
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem('truyen_audio_voice') || '';
    } catch {
      return '';
    }
  });
  const [voiceProfileId, setVoiceProfileId] = useState<VoiceProfileId>(() => {
    try {
      const saved = localStorage.getItem('truyen_audio_voice_profile') as VoiceProfileId | null;
      return OFFLINE_VOICE_PROFILES.some((p) => p.id === saved) ? saved! : 'natural';
    } catch {
      return 'natural';
    }
  });
  const [rate, setRate] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('truyen_audio_rate')) || 1;
    } catch {
      return 1;
    }
  });
  const [sleepMinutes, setSleepMinutes] = useState<number>(0);
  const [ambientMode, setAmbientMode] = useState<AmbientMode>(() => {
    try {
      const m = localStorage.getItem('truyen_audio_ambient');
      return m === 'rain' || m === 'brown' ? m : 'silent';
    } catch {
      return 'silent';
    }
  });
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('truyen_audio_autoplay_next');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [blueLightFilter, setBlueLightFilter] = useState<boolean>(() => {
    try {
      return localStorage.getItem('truyen_audio_blue_light') === 'true';
    } catch {
      return false;
    }
  });
  const [eqState, setEqState] = useState<EqState>(() => loadSavedEqState());

  // Native <audio> element state for imported mp3/wav/m4a chapters
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioUrlRef = useRef<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Mutable refs for stale-closure-free SpeechSynthesis & MediaSession callbacks
  const speechTokenRef = useRef(0);
  const watchdogRef = useRef<number | null>(null);
  const speakDelayRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const playingRef = useRef(isPlaying);
  const chunkIndexRef = useRef(chunkIndex);
  const chunksRef = useRef(chunks);
  const activeStoryIdRef = useRef(activeStoryId);
  const activeChapterIdxRef = useRef(activeChapterIndex);
  const rateRef = useRef(rate);
  const voicesRef = useRef(voices);
  const selectedVoiceRef = useRef(selectedVoiceName);
  const voiceProfileRef = useRef(voiceProfileId);
  const ambientModeRef = useRef(ambientMode);
  const autoPlayNextRef = useRef(autoPlayNext);
  const eqGainsRef = useRef<EqGains>(eqState.gains);
  const playbackContextRef = useRef(playbackContext);
  const userRef = useRef(user);
  const isOnlineRef = useRef(isOnline);
  const deviceNameRef = useRef(deviceName);
  const storiesRef = useRef(stories);
  const playlistsRef = useRef(playlists);

  playingRef.current = isPlaying;
  chunkIndexRef.current = chunkIndex;
  chunksRef.current = chunks;
  activeStoryIdRef.current = activeStoryId;
  activeChapterIdxRef.current = activeChapterIndex;
  rateRef.current = rate;
  voicesRef.current = voices;
  selectedVoiceRef.current = selectedVoiceName;
  voiceProfileRef.current = voiceProfileId;
  ambientModeRef.current = ambientMode;
  autoPlayNextRef.current = autoPlayNext;
  eqGainsRef.current = eqState.gains;
  playbackContextRef.current = playbackContext;
  userRef.current = user;
  isOnlineRef.current = isOnline;
  deviceNameRef.current = deviceName;
  storiesRef.current = stories;
  playlistsRef.current = playlists;

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 3600);
  }, []);

  const refreshLocalData = useCallback(async () => {
    const [st, pl, pr, sq, stats] = await Promise.all([
      getAllStories(),
      getAllPlaylists(),
      getAllProgress(),
      getSyncQueue(),
      getStorageStats(),
    ]);
    setStories(st);
    setPlaylists(pl);
    setProgressMap(pr);
    setPendingSyncCount(sq.length);
    setStorageStats(stats);
  }, []);

  // Register PWA Service Worker & initial local load
  useEffect(() => {
    registerSW({
      immediate: true,
      onOfflineReady() {
        toast('Ứng dụng đã sẵn sàng hoạt động ngoại tuyến');
      },
    });
    testConnection();
    refreshLocalData();
  }, [refreshLocalData, toast]);

  // Load Vietnamese device TTS voices (offline voices prioritized)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (!list.length) return;
      const viVoices = list.filter((v) => /^vi/i.test(v.lang) || /viet/i.test(v.name));
      const sorted = [
        ...viVoices.filter((v) => v.localService),
        ...viVoices.filter((v) => !v.localService),
      ];
      setVoices(sorted);
      setSelectedVoiceName((prev) => {
        if (!prev) return '';
        return sorted.some((v) => v.name === prev) ? prev : '';
      });
    };
    loadVoices();
    const retryT1 = window.setTimeout(loadVoices, 350);
    const retryT2 = window.setTimeout(loadVoices, 1200);
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.clearTimeout(retryT1);
      window.clearTimeout(retryT2);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Progress persistence (IndexedDB + Cloud Sync)
  const saveProgress = useCallback(
    async (
      storyId: string,
      chIdx: number,
      ckIdx: number,
      audioSec: number,
      totalCk: number,
      chapterTitle?: string,
      syncImmediately = false
    ) => {
      const entry: ListeningProgress = {
        storyId,
        chapterIndex: chIdx,
        chunkIndex: ckIdx,
        audioTime: audioSec,
        totalChunks: totalCk,
        chapterTitle,
        deviceName: deviceNameRef.current,
        updatedAt: Date.now(),
      };
      await putProgress(entry);
      setProgressMap((prev) => ({ ...prev, [storyId]: entry }));

      if (syncImmediately && userRef.current?.emailVerified) {
        if (isOnlineRef.current) {
          try {
            await ensureUserProfile(userRef.current, {
              theme,
              speechRate: rateRef.current,
              preferredVoice: selectedVoiceRef.current,
            });
            await pushProgressToCloud(userRef.current.uid, entry);
          } catch {
            await enqueueSync({
              id: `prog_${storyId}`,
              kind: 'progress',
              targetId: storyId,
              createdAt: Date.now(),
            });
            setPendingSyncCount((c) => c + 1);
          }
        } else {
          await enqueueSync({
            id: `prog_${storyId}`,
            kind: 'progress',
            targetId: storyId,
            createdAt: Date.now(),
          });
          const sq = await getSyncQueue();
          setPendingSyncCount(sq.length);
        }
      }
    },
    [theme]
  );

  // Stop Speech & Native Audio helpers
  const clearWatchdog = () => {
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const pausePlayback = useCallback(
    (syncCloud = true) => {
      speechTokenRef.current++;
      clearWatchdog();
      if (speakDelayRef.current) {
        window.clearTimeout(speakDelayRef.current);
        speakDelayRef.current = null;
      }
      activeUtteranceRef.current = null;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
      keepAliveEngine.stop();
      setIsPlaying(false);

      const sid = activeStoryIdRef.current;
      if (sid && activeChapterContent) {
        saveProgress(
          sid,
          activeChapterIdxRef.current,
          chunkIndexRef.current,
          nativeAudioRef.current?.currentTime || 0,
          chunksRef.current.length,
          activeChapterContent.title,
          syncCloud
        );
      }

      if (activeStoryIdRef.current && activeChapterContent) {
        const st = storiesRef.current.find((s) => s.id === activeStoryIdRef.current);
        if (st) {
          updateMediaSession(
            {
              title: activeChapterContent.title,
              artist: st.title,
              cover: st.cover,
            },
            'paused',
            mediaHandlersRef.current
          );
        }
      }
    },
    [activeChapterContent, saveProgress]
  );

  const pausePlaybackRef = useRef(pausePlayback);
  pausePlaybackRef.current = pausePlayback;

  // Forward ref for chapter open & advance so MediaSession and onend callbacks never go stale
  const openChapterRef = useRef<
    (
      storyId: string,
      chapterIdx: number,
      autoPlay: boolean,
      ctx?: PlaybackContext
    ) => Promise<void>
  >(async () => {});

  const handleAdvanceChapter = useCallback(
    async (direction: 1 | -1) => {
      const ctx = playbackContextRef.current;
      if (ctx.mode === 'playlist' && ctx.playlistId) {
        const pl = playlistsRef.current.find((p) => p.id === ctx.playlistId);
        if (pl && pl.items.length > 0) {
          const curIdx = Math.min(Math.max(0, ctx.playlistIndex ?? 0), pl.items.length - 1);
          const currentItem = pl.items[curIdx];
          if (currentItem && isWholeStoryPlaylistItem(currentItem)) {
            const curStory = storiesRef.current.find((s) => s.id === currentItem.storyId);
            if (curStory && curStory.chapters.length > 0) {
              const sameStoryNextCh = activeChapterIdxRef.current + direction;
              if (sameStoryNextCh >= 0 && sameStoryNextCh < curStory.chapters.length) {
                await openChapterRef.current(curStory.id, sameStoryNextCh, true, {
                  mode: 'playlist',
                  playlistId: pl.id,
                  playlistIndex: curIdx,
                });
                return;
              }
            }
          }

          let nextIdx = curIdx + direction;
          if (direction === 1 && shuffleEnabled && pl.items.length > 1) {
            nextIdx = Math.floor(Math.random() * pl.items.length);
          } else if (nextIdx >= pl.items.length) {
            if (repeatEnabled) nextIdx = 0;
            else {
              pausePlayback(true);
              return;
            }
          } else if (nextIdx < 0) {
            nextIdx = repeatEnabled ? pl.items.length - 1 : 0;
          }
          const item = pl.items[nextIdx];
          const targetStory = storiesRef.current.find((s) => s.id === item.storyId);
          const targetChapterIdx =
            isWholeStoryPlaylistItem(item)
              ? direction === -1 && targetStory && targetStory.chapters.length > 0
                ? targetStory.chapters.length - 1
                : 0
              : item.chapterIndex;
          await openChapterRef.current(item.storyId, targetChapterIdx, true, {
            mode: 'playlist',
            playlistId: pl.id,
            playlistIndex: nextIdx,
          });
          return;
        }
      }

      const sid = activeStoryIdRef.current;
      const st = storiesRef.current.find((s) => s.id === sid);
      if (!st) return;
      const nextCh = activeChapterIdxRef.current + direction;
      if (nextCh >= 0 && nextCh < st.chapters.length) {
        await openChapterRef.current(st.id, nextCh, true, { mode: 'story' });
      } else {
        pausePlayback(true);
      }
    },
    [pausePlayback, repeatEnabled, shuffleEnabled]
  );

  const resolveVietnameseUtteranceSettings = useCallback(() => {
    const profile =
      OFFLINE_VOICE_PROFILES.find((p) => p.id === voiceProfileRef.current) ||
      OFFLINE_VOICE_PROFILES[0];

    const liveList =
      'speechSynthesis' in window
        ? window.speechSynthesis
            .getVoices()
            .filter((v) => /^vi/i.test(v.lang) || /viet/i.test(v.name))
        : [];
    const available = voicesRef.current.length > 0 ? voicesRef.current : liveList;
    const offlinePool = available.filter((v) => v.localService);
    const pool = !isOnlineRef.current && offlinePool.length > 0 ? offlinePool : available;

    let chosen = selectedVoiceRef.current
      ? available.find((v) => v.name === selectedVoiceRef.current)
      : undefined;

    if (chosen && !isOnlineRef.current && !chosen.localService && offlinePool.length > 0) {
      chosen = undefined;
    }

    if (!chosen && pool.length > 0) {
      if (profile.preferredGender === 'female') {
        chosen = pool.find((v) =>
          /hoaimy|hoài my|linh|chi|my\b|nu\b|nữ|female|woman|mai\b|lan\b|huong|ngoc|trang|thao/i.test(
            v.name
          )
        );
      } else if (profile.preferredGender === 'male') {
        chosen = pool.find((v) =>
          /namminh|nam minh|nam\b|minh\b|male|man\b|hung|hùng|tuan|tuấn|duy\b|hoang|phong/i.test(
            v.name
          )
        );
      }
      if (!chosen) chosen = pool[0];
    }

    const effectiveRate = Math.min(
      2.5,
      Math.max(0.5, Number((rateRef.current * profile.rateScale).toFixed(2)))
    );

    return { profile, chosen, effectiveRate };
  }, []);

  const speakCurrentChunk = useCallback(
    (startIndex: number) => {
      if (!('speechSynthesis' in window)) {
        toast('Trình duyệt này chưa hỗ trợ đọc giọng nói.');
        return;
      }
      const list = chunksRef.current;
      if (startIndex >= list.length) {
        if (autoPlayNextRef.current) {
          handleAdvanceChapter(1);
        } else {
          pausePlaybackRef.current(true);
          toast('Đã phát hết chương hiện tại');
        }
        return;
      }

      const token = ++speechTokenRef.current;
      clearWatchdog();
      if (speakDelayRef.current) {
        window.clearTimeout(speakDelayRef.current);
        speakDelayRef.current = null;
      }
      window.speechSynthesis.cancel();

      setChunkIndex(startIndex);
      chunkIndexRef.current = startIndex;

      const chunkText = list[startIndex].t;
      const utterance = new SpeechSynthesisUtterance(chunkText);
      activeUtteranceRef.current = utterance;

      const { profile, chosen, effectiveRate } = resolveVietnameseUtteranceSettings();

      if (chosen) {
        utterance.voice = chosen;
        utterance.lang = chosen.lang;
      } else {
        utterance.lang = 'vi-VN';
      }

      utterance.pitch = profile.pitch;
      utterance.rate = effectiveRate;

      const sid = activeStoryIdRef.current;
      const st = storiesRef.current.find((s) => s.id === sid);
      const chTitle = st?.chapters[activeChapterIdxRef.current]?.title || '';

      utterance.onend = () => {
        clearWatchdog();
        if (token !== speechTokenRef.current || !playingRef.current) return;
        const nextIdx = startIndex + 1;
        if (sid && nextIdx % 4 === 0) {
          saveProgress(sid, activeChapterIdxRef.current, nextIdx, 0, list.length, chTitle, false);
        }
        speakCurrentChunk(nextIdx);
      };

      utterance.onerror = (ev) => {
        clearWatchdog();
        if (
          token !== speechTokenRef.current ||
          ev.error === 'canceled' ||
          ev.error === 'interrupted'
        ) {
          return;
        }
        if (playingRef.current) {
          speakCurrentChunk(startIndex + 1);
        }
      };

      // Mobile TTS stall watchdog
      const approxMs = Math.max(
        12000,
        Math.round((chunkText.length / (10 * effectiveRate)) * 1000) + 9000
      );
      watchdogRef.current = window.setTimeout(() => {
        if (token === speechTokenRef.current && playingRef.current) {
          window.speechSynthesis.cancel();
          speakCurrentChunk(startIndex + 1);
        }
      }, approxMs);

      speakDelayRef.current = window.setTimeout(() => {
        speakDelayRef.current = null;
        if (token === speechTokenRef.current && playingRef.current) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        }
      }, 90);
    },
    [handleAdvanceChapter, resolveVietnameseUtteranceSettings, saveProgress, toast]
  );

  const previewCurrentVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      toast('Trình duyệt này chưa hỗ trợ đọc giọng nói.');
      return;
    }
    if (playingRef.current) {
      speakCurrentChunk(chunkIndexRef.current);
      return;
    }
    const token = ++speechTokenRef.current;
    clearWatchdog();
    if (speakDelayRef.current) {
      window.clearTimeout(speakDelayRef.current);
      speakDelayRef.current = null;
    }
    window.speechSynthesis.cancel();

    const { profile, chosen, effectiveRate } = resolveVietnameseUtteranceSettings();
    const sample = new SpeechSynthesisUtterance(
      `Xin chào, đây là giọng ${profile.label.replace(/\s*\(.*?\)\s*/g, '')}.`
    );
    activeUtteranceRef.current = sample;
    if (chosen) {
      sample.voice = chosen;
      sample.lang = chosen.lang;
    } else {
      sample.lang = 'vi-VN';
    }
    sample.pitch = profile.pitch;
    sample.rate = effectiveRate;

    speakDelayRef.current = window.setTimeout(() => {
      speakDelayRef.current = null;
      if (token === speechTokenRef.current && !playingRef.current) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(sample);
      }
    }, 90);
  }, [resolveVietnameseUtteranceSettings, speakCurrentChunk, toast]);

  const startPlayback = useCallback(async () => {
    if (!activeChapterContent) return;
    setIsPlaying(true);
    playingRef.current = true;

    const sid = activeStoryIdRef.current;
    if (sid) {
      saveProgress(
        sid,
        activeChapterIdxRef.current,
        chunkIndexRef.current,
        nativeAudioRef.current?.currentTime || 0,
        chunksRef.current.length,
        activeChapterContent.title,
        false
      );
    }

    const st = storiesRef.current.find((s) => s.id === activeStoryIdRef.current);
    if (st) {
      updateMediaSession(
        {
          title: activeChapterContent.title,
          artist: st.title,
          cover: st.cover,
        },
        'playing',
        mediaHandlersRef.current
      );
    }

    if (activeChapterContent.audioBlob && nativeAudioRef.current) {
      nativeAudioRef.current.playbackRate = rateRef.current;
      try {
        await resumeAndSyncEqualizer(nativeAudioRef.current, eqGainsRef.current);
        await nativeAudioRef.current.play();
      } catch {
        toast('Nhấn lại nút Phát để trình duyệt kích hoạt âm thanh.');
        setIsPlaying(false);
      }
      return;
    }

    await keepAliveEngine.start(ambientModeRef.current);
    if (ambientModeRef.current !== 'silent') {
      await resumeAndSyncEqualizer(keepAliveEngine.getAudioElement(), eqGainsRef.current);
    }
    speakCurrentChunk(chunkIndexRef.current);
  }, [activeChapterContent, saveProgress, speakCurrentChunk, toast]);

  const mediaHandlersRef = useRef({
    onPlay: () => startPlayback(),
    onPause: () => pausePlayback(true),
    onPrev: () => handleAdvanceChapter(-1),
    onNext: () => handleAdvanceChapter(1),
    onSeekBackward: () => {
      if (nativeAudioRef.current && activeChapterContent?.audioBlob) {
        nativeAudioRef.current.currentTime = Math.max(0, nativeAudioRef.current.currentTime - 15);
      } else {
        const prev = Math.max(0, chunkIndexRef.current - 1);
        setChunkIndex(prev);
        if (playingRef.current) speakCurrentChunk(prev);
      }
    },
    onSeekForward: () => {
      if (nativeAudioRef.current && activeChapterContent?.audioBlob) {
        nativeAudioRef.current.currentTime = Math.min(
          nativeAudioRef.current.duration || 0,
          nativeAudioRef.current.currentTime + 15
        );
      } else {
        const next = Math.min(Math.max(0, chunksRef.current.length - 1), chunkIndexRef.current + 1);
        setChunkIndex(next);
        if (playingRef.current) speakCurrentChunk(next);
      }
    },
  });

  mediaHandlersRef.current = {
    onPlay: () => startPlayback(),
    onPause: () => pausePlayback(true),
    onPrev: () => handleAdvanceChapter(-1),
    onNext: () => handleAdvanceChapter(1),
    onSeekBackward: () => {
      if (nativeAudioRef.current && activeChapterContent?.audioBlob) {
        nativeAudioRef.current.currentTime = Math.max(0, nativeAudioRef.current.currentTime - 15);
      } else {
        const prev = Math.max(0, chunkIndexRef.current - 1);
        setChunkIndex(prev);
        if (playingRef.current) speakCurrentChunk(prev);
      }
    },
    onSeekForward: () => {
      if (nativeAudioRef.current && activeChapterContent?.audioBlob) {
        nativeAudioRef.current.currentTime = Math.min(
          nativeAudioRef.current.duration || 0,
          nativeAudioRef.current.currentTime + 15
        );
      } else {
        const next = Math.min(Math.max(0, chunksRef.current.length - 1), chunkIndexRef.current + 1);
        setChunkIndex(next);
        if (playingRef.current) speakCurrentChunk(next);
      }
    },
  };

  // Open a chapter (loads from IndexedDB or fetches on-demand from Cloud)
  const openChapter = useCallback(
    async (
      storyId: string,
      chapterIdx: number,
      autoPlay: boolean,
      ctx: PlaybackContext = { mode: 'story' }
    ) => {
      const targetStory = storiesRef.current.find((s) => s.id === storyId);
      if (!targetStory) return;
      const summary = targetStory.chapters[chapterIdx];
      if (!summary) return;

      speechTokenRef.current++;
      clearWatchdog();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
      if (nativeAudioUrlRef.current) {
        URL.revokeObjectURL(nativeAudioUrlRef.current);
        nativeAudioUrlRef.current = null;
      }

      let content = await getChapterContent(summary.id);
      if (!content || !content.downloadedOffline) {
        if (!isOnlineRef.current) {
          toast('Chương này chưa được tải ngoại tuyến. Hãy kết nối mạng để tải về máy.');
          return;
        }
        if (!userRef.current || !userRef.current.emailVerified) {
          toast('Không tìm thấy dữ liệu chương trên máy.');
          return;
        }
        toast(`Đang tải “${summary.title}” để phát ngoại tuyến…`);
        const downloaded = await downloadChapterFromCloud(
          userRef.current.uid,
          targetStory.id,
          summary.id
        );
        if (!downloaded) {
          toast('Không tải được nội dung chương từ đám mây.');
          return;
        }
        content = downloaded;
        const updatedStory: Story = {
          ...targetStory,
          cloudOnly: false,
          chapters: targetStory.chapters.map((c, idx) =>
            idx === chapterIdx
              ? { ...c, downloadedOffline: true, sizeBytes: downloaded.sizeBytes }
              : c
          ),
        };
        await putStory(updatedStory);
        await refreshLocalData();
      }

      const parsedChunks = chunkChapterText(content.text);
      const savedProg = progressMap[storyId];
      const initialChunk =
        savedProg && savedProg.chapterIndex === chapterIdx && savedProg.chunkIndex < parsedChunks.length
          ? savedProg.chunkIndex
          : 0;
      const initialAudioTime =
        savedProg && savedProg.chapterIndex === chapterIdx ? savedProg.audioTime || 0 : 0;

      setActiveStoryId(storyId);
      setActiveChapterIndex(chapterIdx);
      setActiveChapterContent(content);
      setChunks(parsedChunks);
      setChunkIndex(initialChunk);
      setPlaybackContext(ctx);
      setSelectedStoryId(storyId);
      setIsReaderOpen(true);

      activeStoryIdRef.current = storyId;
      activeChapterIdxRef.current = chapterIdx;
      chunksRef.current = parsedChunks;
      chunkIndexRef.current = initialChunk;
      playbackContextRef.current = ctx;

      if (content.audioBlob) {
        const url = URL.createObjectURL(content.audioBlob);
        nativeAudioUrlRef.current = url;
        if (!nativeAudioRef.current) {
          nativeAudioRef.current = new Audio();
        }
        const audio = nativeAudioRef.current;
        audio.src = url;
        audio.playbackRate = rateRef.current;
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration || 0);
          if (initialAudioTime > 0 && initialAudioTime < (audio.duration || 0) - 2) {
            audio.currentTime = initialAudioTime;
          }
        };
        audio.ontimeupdate = () => {
          setAudioCurrentTime(audio.currentTime || 0);
        };
        audio.onended = () => {
          if (autoPlayNextRef.current) {
            handleAdvanceChapter(1);
          } else {
            pausePlaybackRef.current(true);
            toast('Đã phát hết chương hiện tại');
          }
        };
        if (autoPlay) {
          setIsPlaying(true);
          playingRef.current = true;
          keepAliveEngine.stop();
          try {
            await resumeAndSyncEqualizer(audio, eqGainsRef.current);
            await audio.play();
          } catch {
            setIsPlaying(false);
          }
        }
      } else if (autoPlay) {
        setIsPlaying(true);
        playingRef.current = true;
        await keepAliveEngine.start(ambientModeRef.current);
        if (ambientModeRef.current !== 'silent') {
          await resumeAndSyncEqualizer(keepAliveEngine.getAudioElement(), eqGainsRef.current);
        }
        // Slight delay so state refs settle cleanly before uttering
        window.setTimeout(() => {
          if (playingRef.current) {
            speakCurrentChunk(initialChunk);
          }
        }, 50);
      } else {
        setIsPlaying(false);
      }

      if (autoPlay) {
        saveProgress(
          storyId,
          chapterIdx,
          initialChunk,
          initialAudioTime,
          parsedChunks.length,
          content.title,
          false
        );
      }

      updateMediaSession(
        {
          title: content.title,
          artist: targetStory.title,
          cover: targetStory.cover,
        },
        autoPlay ? 'playing' : 'paused',
        mediaHandlersRef.current
      );
    },
    [handleAdvanceChapter, progressMap, refreshLocalData, saveProgress, speakCurrentChunk, toast]
  );

  openChapterRef.current = openChapter;

  // Cloud Sync Handler
  const handleSyncNow = useCallback(
    async (targetUser?: User) => {
      const u = targetUser || userRef.current;
      if (!u || !u.emailVerified || !isOnlineRef.current || isSyncing) return;
      setIsSyncing(true);
      try {
        const res = await syncAllWithCloud(
          u.uid,
          u,
          {
            theme,
            speechRate: rateRef.current,
            preferredVoice: selectedVoiceRef.current,
          },
          (msg) => setSyncStatusText(msg)
        );
        setLastSyncedAt(Date.now());
        setSyncStatusText(
          `Đã đồng bộ ${res.storiesCount} truyện · ${res.playlistsCount} danh sách phát`
        );
        await refreshLocalData();
        if (res.progressUpdated > 0) {
          toast(`Đã cập nhật tiến trình nghe mới nhất từ thiết bị khác`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lỗi đồng bộ';
        setSyncStatusText('Không đồng bộ được. Vui lòng thử lại.');
        toast(`Lỗi đồng bộ: ${message.slice(0, 90)}`);
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, refreshLocalData, theme, toast]
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u && u.emailVerified && isOnlineRef.current) {
        handleSyncNow(u);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-flush offline queue when network returns
  useEffect(() => {
    if (isOnline && user && user.emailVerified && pendingSyncCount > 0 && !isSyncing) {
      handleSyncNow(user);
    }
  }, [isOnline, user, pendingSyncCount, isSyncing, handleSyncNow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearWatchdog();
      if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      keepAliveEngine.stop();
      clearMediaSession();
    };
  }, []);

  // Natural chapter title sorting helper (e.g., Chương 1 -> Chương 2 -> Chương 3 -> Chương 10)
  const extractChapterOrderKey = (title: string): { hasNumber: boolean; num: number; subNum: number } => {
    const normalized = title.trim();
    const chapterMatch = normalized.match(
      /(?:chương|chuong|chapter|chap|ch\.?)\s*[:#-]?\s*(\d+)(?:\s*[.\-:]\s*(\d+))?/i
    );
    if (chapterMatch) {
      return {
        hasNumber: true,
        num: Number(chapterMatch[1]),
        subNum: chapterMatch[2] ? Number(chapterMatch[2]) : 0,
      };
    }
    const sectionMatch = normalized.match(
      /(?:hồi|hoi|tập|tap|quyển|quyen|phần|phan)\s*[:#-]?\s*(\d+)(?:\s*[.\-:]\s*(\d+))?/i
    );
    if (sectionMatch) {
      return {
        hasNumber: true,
        num: Number(sectionMatch[1]),
        subNum: sectionMatch[2] ? Number(sectionMatch[2]) : 0,
      };
    }
    const leadingMatch = normalized.match(/^(\d+)(?:\s*[.\-:]\s*(\d+))?(?:\b|\s|$)/);
    if (leadingMatch) {
      return {
        hasNumber: true,
        num: Number(leadingMatch[1]),
        subNum: leadingMatch[2] ? Number(leadingMatch[2]) : 0,
      };
    }
    const anyMatch = normalized.match(/(\d+)/);
    if (anyMatch) {
      return {
        hasNumber: true,
        num: Number(anyMatch[1]),
        subNum: 0,
      };
    }
    return { hasNumber: false, num: Number.MAX_SAFE_INTEGER, subNum: 0 };
  };

  const compareChapterSummaries = (a: ChapterSummary, b: ChapterSummary): number => {
    const ka = extractChapterOrderKey(a.title);
    const kb = extractChapterOrderKey(b.title);
    if (ka.hasNumber !== kb.hasNumber) return ka.hasNumber ? -1 : 1;
    if (ka.num !== kb.num) return ka.num - kb.num;
    if (ka.subNum !== kb.subNum) return ka.subNum - kb.subNum;
    return a.title.localeCompare(b.title, 'vi', { numeric: true, sensitivity: 'base' });
  };

  const syncStoryOrEnqueue = async (updated: Story) => {
    if (user && user.emailVerified && isOnline) {
      try {
        await ensureUserProfile(user, { theme, speechRate: rate, preferredVoice: selectedVoiceName });
        await pushStoryAndChapters(user.uid, updated);
        await putStory({ ...updated, syncedAt: Date.now() });
      } catch {
        await enqueueSync({
          id: `st_${updated.id}`,
          kind: 'story',
          targetId: updated.id,
          createdAt: Date.now(),
        });
      }
    } else if (user && user.emailVerified) {
      await enqueueSync({
        id: `st_${updated.id}`,
        kind: 'story',
        targetId: updated.id,
        createdAt: Date.now(),
      });
    }
  };

  // Story CRUD & Offline Download handlers
  const handleCreateStory = async (
    title: string,
    author: string,
    genre: string,
    coverFile?: File
  ) => {
    const now = Date.now();
    let cover: string | undefined;
    if (coverFile) {
      try {
        cover = await processCoverImage(coverFile);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Không xử lý được ảnh bìa');
      }
    }
    const cleanGenre = genre.trim() ? nfc(genre.trim()).slice(0, 55) : '';
    const newStory: Story = {
      id: sanitizeId('story'),
      title: nfc(title).slice(0, 195),
      ...(author ? { author: nfc(author).slice(0, 115) } : {}),
      ...(cleanGenre ? { genre: cleanGenre } : {}),
      ...(cover ? { cover } : {}),
      chapters: [],
      createdAt: now,
      updatedAt: now,
    };
    await putStory(newStory);
    await syncStoryOrEnqueue(newStory);
    await refreshLocalData();
    setSelectedStoryId(newStory.id);
    toast('Đã tạo truyện mới');
  };

  const handleAddChapters = async (storyId: string, files: FileList) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const sorted = Array.from(files).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true })
    );
    const addedSummaries: ChapterSummary[] = [];
    const failed: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      try {
        const parsed = await parseChapterFile(f);
        const chIndex = st.chapters.length + addedSummaries.length;
        const chId = sanitizeId(`ch_${chIndex}`);
        const content: ChapterContent = {
          id: chId,
          storyId: st.id,
          index: chIndex,
          title: parsed.title,
          text: parsed.text,
          charCount: parsed.text.length,
          audioBlob: parsed.audioBlob,
          audioMime: parsed.audioMime,
          downloadedOffline: true,
          sizeBytes: parsed.sizeBytes,
          updatedAt: Date.now(),
        };
        await putChapterContent(content);
        addedSummaries.push({
          id: chId,
          index: chIndex,
          title: parsed.title,
          charCount: parsed.text.length,
          hasAudioBlob: !!parsed.audioBlob,
          downloadedOffline: true,
          sizeBytes: parsed.sizeBytes,
          updatedAt: content.updatedAt,
        });
      } catch {
        failed.push(f.name);
      }
    }

    if (addedSummaries.length > 0) {
      const updated: Story = {
        ...st,
        cloudOnly: false,
        chapters: [...st.chapters, ...addedSummaries],
        updatedAt: Date.now(),
      };
      await putStory(updated);
      if (user && user.emailVerified && isOnline) {
        try {
          await ensureUserProfile(user, { theme, speechRate: rate, preferredVoice: selectedVoiceName });
          await pushStoryAndChapters(user.uid, updated);
          await putStory({ ...updated, syncedAt: Date.now() });
        } catch {
          await enqueueSync({
            id: `st_${updated.id}`,
            kind: 'story',
            targetId: updated.id,
            createdAt: Date.now(),
          });
        }
      } else if (user && user.emailVerified) {
        await enqueueSync({
          id: `st_${updated.id}`,
          kind: 'story',
          targetId: updated.id,
          createdAt: Date.now(),
        });
      }
      await refreshLocalData();
    }

    toast(
      failed.length
        ? `Đã thêm ${addedSummaries.length} chương. Lỗi: ${failed.join(', ')}`
        : `Đã lưu ${addedSummaries.length} chương vào bộ nhớ ngoại tuyến`
    );
  };

  const handleUpdateCover = async (storyId: string, file: File) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    try {
      const cover = await processCoverImage(file);
      const updated: Story = { ...st, cover, updatedAt: Date.now() };
      await putStory(updated);
      await syncStoryOrEnqueue(updated);
      await refreshLocalData();
      toast('Đã cập nhật ảnh bìa');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Không cập nhật được ảnh bìa');
    }
  };

  const handleUpdateGenre = async (storyId: string, genre: string) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const cleanGenre = genre.trim() ? nfc(genre.trim()).slice(0, 55) : undefined;
    const updated: Story = {
      ...st,
      updatedAt: Date.now(),
    };
    if (cleanGenre) {
      updated.genre = cleanGenre;
    } else {
      delete updated.genre;
    }
    await putStory(updated);
    await syncStoryOrEnqueue(updated);
    await refreshLocalData();
    toast(cleanGenre ? `Đã đổi thể loại thành “${cleanGenre}”` : 'Đã bỏ phân loại thể loại');
  };

  const handleRenameChapter = async (storyId: string, chapterIndex: number, newTitle: string) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const target = st.chapters[chapterIndex];
    if (!target) return;
    const cleanTitle = nfc(newTitle.trim()).slice(0, 195);
    if (!cleanTitle) return;

    const now = Date.now();
    const nextChapters = st.chapters.map((c, idx) =>
      idx === chapterIndex ? { ...c, title: cleanTitle, updatedAt: now } : c
    );
    const localCh = await getChapterContent(target.id);
    if (localCh) {
      await putChapterContent({ ...localCh, title: cleanTitle, updatedAt: now });
    }
    const updated: Story = { ...st, chapters: nextChapters, updatedAt: now };
    await putStory(updated);

    if (activeStoryId === storyId && activeChapterIndex === chapterIndex) {
      setActiveChapterContent((prev) =>
        prev && prev.id === target.id ? { ...prev, title: cleanTitle, updatedAt: now } : prev
      );
    }

    const existingProg = progressMap[storyId];
    if (existingProg && existingProg.chapterIndex === chapterIndex) {
      const updatedProg: ListeningProgress = {
        ...existingProg,
        chapterTitle: cleanTitle,
        updatedAt: now,
      };
      await putProgress(updatedProg);
      if (user && user.emailVerified && isOnline) {
        pushProgressToCloud(user.uid, updatedProg).catch(() => {});
      }
    }

    await syncStoryOrEnqueue(updated);
    await refreshLocalData();
    toast('Đã đổi tên chương');
  };

  const persistReorderedChapters = async (story: Story, reordered: ChapterSummary[]) => {
    const now = Date.now();
    const prevActiveId =
      activeStoryId === story.id && activeChapterIndex !== null
        ? story.chapters[activeChapterIndex]?.id
        : undefined;
    const prevProg = progressMap[story.id];
    const prevProgChapterId = prevProg ? story.chapters[prevProg.chapterIndex]?.id : undefined;

    const indexedChapters: ChapterSummary[] = reordered.map((c, idx) => ({
      ...c,
      index: idx,
      updatedAt: c.index !== idx ? now : c.updatedAt,
    }));

    for (const ch of indexedChapters) {
      const localCh = await getChapterContent(ch.id);
      if (localCh && localCh.index !== ch.index) {
        await putChapterContent({ ...localCh, index: ch.index, updatedAt: now });
      }
    }

    const updatedStory: Story = { ...story, chapters: indexedChapters, updatedAt: now };
    await putStory(updatedStory);

    if (prevActiveId) {
      const newActiveIdx = indexedChapters.findIndex((c) => c.id === prevActiveId);
      if (newActiveIdx >= 0) {
        setActiveChapterIndex(newActiveIdx);
        setActiveChapterContent((prev) =>
          prev && prev.id === prevActiveId ? { ...prev, index: newActiveIdx } : prev
        );
      }
    }

    if (prevProg && prevProgChapterId) {
      const newProgIdx = indexedChapters.findIndex((c) => c.id === prevProgChapterId);
      if (newProgIdx >= 0 && newProgIdx !== prevProg.chapterIndex) {
        const updatedProg: ListeningProgress = {
          ...prevProg,
          chapterIndex: newProgIdx,
          chapterTitle: indexedChapters[newProgIdx].title,
          updatedAt: now,
        };
        await putProgress(updatedProg);
        if (user && user.emailVerified && isOnline) {
          pushProgressToCloud(user.uid, updatedProg).catch(() => {});
        } else if (user && user.emailVerified) {
          await enqueueSync({
            id: `prog_${story.id}`,
            kind: 'progress',
            targetId: story.id,
            createdAt: now,
          });
        }
      }
    }

    await syncStoryOrEnqueue(updatedStory);
    await refreshLocalData();
  };

  const handleMoveChapter = async (
    storyId: string,
    chapterIndex: number,
    direction: -1 | 1
  ) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const targetIdx = chapterIndex + direction;
    if (targetIdx < 0 || targetIdx >= st.chapters.length) return;
    const next = [...st.chapters];
    const [moved] = next.splice(chapterIndex, 1);
    next.splice(targetIdx, 0, moved);
    await persistReorderedChapters(st, next);
  };

  const handleAutoSortChapters = async (storyId: string) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st || st.chapters.length < 2) return;
    const sorted = [...st.chapters].sort(compareChapterSummaries);
    const unchanged = sorted.every((c, idx) => c.id === st.chapters[idx]?.id);
    if (unchanged) {
      toast('Danh sách chương đã đúng thứ tự 1 → 2 → 3');
      return;
    }
    await persistReorderedChapters(st, sorted);
    toast('Đã sắp xếp lại theo thứ tự chương');
  };

  const handleDeleteStory = (storyId: string) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    setConfirmState({
      message: `Xóa truyện “${st.title}” và toàn bộ dữ liệu ngoại tuyến trên máy này?`,
      confirmLabel: 'Xóa truyện',
      onConfirm: async () => {
        if (activeStoryId === storyId) {
          pausePlayback(false);
          setActiveStoryId(null);
          setActiveChapterContent(null);
          setIsReaderOpen(false);
        }
        await deleteStoryLocal(storyId);
        if (selectedStoryId === storyId) setSelectedStoryId(null);
        if (user && user.emailVerified && isOnline) {
          try {
            await deleteStoryFromCloud(user.uid, storyId);
          } catch {
            await enqueueSync({
              id: `del_st_${storyId}`,
              kind: 'delete_story',
              targetId: storyId,
              createdAt: Date.now(),
            });
          }
        } else if (user && user.emailVerified) {
          await enqueueSync({
            id: `del_st_${storyId}`,
            kind: 'delete_story',
            targetId: storyId,
            createdAt: Date.now(),
          });
        }
        await refreshLocalData();
        toast('Đã xóa truyện');
      },
    });
  };

  const handleDeleteChapter = (storyId: string, chapterIndex: number) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const ch = st.chapters[chapterIndex];
    if (!ch) return;
    setConfirmState({
      message: `Xóa “${ch.title}” khỏi truyện?`,
      confirmLabel: 'Xóa chương',
      onConfirm: async () => {
        if (activeStoryId === storyId && activeChapterIndex === chapterIndex) {
          pausePlayback(false);
          setActiveChapterContent(null);
          setIsReaderOpen(false);
        }
        await deleteChapterContent(ch.id);
        const remaining = st.chapters
          .filter((_, idx) => idx !== chapterIndex)
          .map((c, idx) => ({ ...c, index: idx }));
        const updated: Story = { ...st, chapters: remaining, updatedAt: Date.now() };
        await putStory(updated);
        if (user && user.emailVerified && isOnline) {
          await pushStoryAndChapters(user.uid, updated);
        }
        await refreshLocalData();
        toast('Đã xóa chương');
      },
    });
  };

  const handleDownloadStoryOffline = async (storyId: string) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st || !user || !user.emailVerified || !isOnline) {
      if (!isOnline) toast('Cần kết nối mạng để tải truyện về máy.');
      return;
    }
    setDownloadingStoryId(storyId);
    let downloaded = 0;
    const updatedChapters = [...st.chapters];
    try {
      for (let i = 0; i < updatedChapters.length; i++) {
        if (updatedChapters[i].downloadedOffline) continue;
        setDownloadProgressText(`Đang tải ${i + 1}/${updatedChapters.length}…`);
        const ch = await downloadChapterFromCloud(user.uid, st.id, updatedChapters[i].id);
        if (ch) {
          updatedChapters[i] = {
            ...updatedChapters[i],
            downloadedOffline: true,
            sizeBytes: ch.sizeBytes,
          };
          downloaded++;
        }
      }
      await putStory({ ...st, cloudOnly: false, chapters: updatedChapters });
      await refreshLocalData();
      toast(`Đã tải ${downloaded} chương nghe ngoại tuyến`);
    } catch {
      toast('Tải xuống bị gián đoạn, vui lòng thử lại.');
    } finally {
      setDownloadingStoryId(null);
      setDownloadProgressText('');
    }
  };

  const handleDownloadSingleChapter = async (storyId: string, chapterIdx: number) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st || !user || !user.emailVerified || !isOnline) return;
    const target = st.chapters[chapterIdx];
    if (!target) return;
    const ch = await downloadChapterFromCloud(user.uid, st.id, target.id);
    if (ch) {
      const updated: Story = {
        ...st,
        cloudOnly: false,
        chapters: st.chapters.map((c, idx) =>
          idx === chapterIdx ? { ...c, downloadedOffline: true, sizeBytes: ch.sizeBytes } : c
        ),
      };
      await putStory(updated);
      await refreshLocalData();
      toast(`Đã tải “${target.title}” để nghe ngoại tuyến`);
    }
  };

  const handleRemoveChapterOffline = async (storyId: string, chapterIdx: number) => {
    const st = stories.find((s) => s.id === storyId);
    if (!st) return;
    const target = st.chapters[chapterIdx];
    if (!target) return;
    await deleteChapterContent(target.id);
    const updated: Story = {
      ...st,
      chapters: st.chapters.map((c, idx) =>
        idx === chapterIdx ? { ...c, downloadedOffline: false } : c
      ),
    };
    await putStory(updated);
    await refreshLocalData();
    toast('Đã gỡ bản lưu cục bộ của chương');
  };

  // Playlist handlers
  const handleCreatePlaylist = async (name: string, description: string, initialItems: PlaylistItem[] = []) => {
    const now = Date.now();
    const pl: Playlist = {
      id: sanitizeId('pl'),
      name: nfc(name).slice(0, 115),
      ...(description ? { description: nfc(description).slice(0, 290) } : {}),
      items: initialItems,
      createdAt: now,
      updatedAt: now,
    };
    await putPlaylist(pl);
    if (user && user.emailVerified && isOnline) {
      try {
        await ensureUserProfile(user, { theme, speechRate: rate, preferredVoice: selectedVoiceName });
        await pushPlaylistToCloud(user.uid, pl);
      } catch {
        await enqueueSync({
          id: `pl_${pl.id}`,
          kind: 'playlist',
          targetId: pl.id,
          createdAt: Date.now(),
        });
      }
    } else if (user && user.emailVerified) {
      await enqueueSync({
        id: `pl_${pl.id}`,
        kind: 'playlist',
        targetId: pl.id,
        createdAt: Date.now(),
      });
    }
    await refreshLocalData();
    toast(`Đã tạo danh sách “${pl.name}”`);
  };

  const handleUpdatePlaylist = async (pl: Playlist) => {
    await putPlaylist(pl);
    if (user && user.emailVerified && isOnline) {
      try {
        await pushPlaylistToCloud(user.uid, pl);
      } catch {
        await enqueueSync({
          id: `pl_${pl.id}`,
          kind: 'playlist',
          targetId: pl.id,
          createdAt: Date.now(),
        });
      }
    } else if (user && user.emailVerified) {
      await enqueueSync({
        id: `pl_${pl.id}`,
        kind: 'playlist',
        targetId: pl.id,
        createdAt: Date.now(),
      });
    }
    await refreshLocalData();
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylistLocal(playlistId);
    if (user && user.emailVerified && isOnline) {
      try {
        await deletePlaylistFromCloud(user.uid, playlistId);
      } catch {
        await enqueueSync({
          id: `del_pl_${playlistId}`,
          kind: 'delete_playlist',
          targetId: playlistId,
          createdAt: Date.now(),
        });
      }
    } else if (user && user.emailVerified) {
      await enqueueSync({
        id: `del_pl_${playlistId}`,
        kind: 'delete_playlist',
        targetId: playlistId,
        createdAt: Date.now(),
      });
    }
    await refreshLocalData();
    toast('Đã xóa danh sách phát');
  };

  const handleDownloadPlaylistOffline = async (playlistId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl || !user || !user.emailVerified || !isOnline) return;
    setDownloadingPlaylistId(playlistId);
    let count = 0;
    try {
      for (const item of pl.items) {
        const st = storiesRef.current.find((s) => s.id === item.storyId);
        if (!st) continue;
        if (isWholeStoryPlaylistItem(item)) {
          const updatedChapters = [...st.chapters];
          let changed = false;
          for (let i = 0; i < updatedChapters.length; i++) {
            if (!updatedChapters[i].downloadedOffline) {
              const ch = await downloadChapterFromCloud(user.uid, st.id, updatedChapters[i].id);
              if (ch) {
                updatedChapters[i] = {
                  ...updatedChapters[i],
                  downloadedOffline: true,
                  sizeBytes: ch.sizeBytes,
                };
                changed = true;
                count++;
              }
            }
          }
          if (changed) {
            await putStory({ ...st, cloudOnly: false, chapters: updatedChapters });
          }
        } else {
          const chSum = st.chapters[item.chapterIndex];
          if (chSum && !chSum.downloadedOffline) {
            const ch = await downloadChapterFromCloud(user.uid, st.id, chSum.id);
            if (ch) {
              const updated: Story = {
                ...st,
                cloudOnly: false,
                chapters: st.chapters.map((c, idx) =>
                  idx === item.chapterIndex
                    ? { ...c, downloadedOffline: true, sizeBytes: ch.sizeBytes }
                    : c
                ),
              };
              await putStory(updated);
              count++;
            }
          }
        }
      }
      await refreshLocalData();
      toast(`Đã tải ${count} chương trong danh sách phát để nghe ngoại tuyến`);
    } finally {
      setDownloadingPlaylistId(null);
    }
  };

  // Current active story & progress percent for MiniPlayer
  const activeStory = useMemo(
    () => stories.find((s) => s.id === activeStoryId) || null,
    [stories, activeStoryId]
  );
  const selectedStory = useMemo(
    () => stories.find((s) => s.id === selectedStoryId) || null,
    [stories, selectedStoryId]
  );

  const miniProgressPercent = useMemo(() => {
    if (!activeChapterContent) return 0;
    if (activeChapterContent.audioBlob) {
      return audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0;
    }
    return chunks.length > 0 ? ((chunkIndex + 1) / chunks.length) * 100 : 0;
  }, [activeChapterContent, audioCurrentTime, audioDuration, chunkIndex, chunks.length]);

  const activePlaylistLabel = useMemo(() => {
    if (playbackContext.mode !== 'playlist' || !playbackContext.playlistId) return undefined;
    return playlists.find((p) => p.id === playbackContext.playlistId)?.name;
  }, [playbackContext, playlists]);

  const navItems: { id: NavTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'library', label: 'Thư viện', Icon: BookOpen },
    { id: 'playlists', label: 'Danh sách phát', Icon: ListMusic },
    { id: 'offline', label: 'Ngoại tuyến', Icon: HardDrive },
    { id: 'sync', label: 'Đồng bộ', Icon: Cloud },
  ];

  const quickToggleDark = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col md:flex-row bg-[#f6f5f1] dark:bg-[#111318] text-slate-900 dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161920] px-4 py-6 justify-between z-30">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <img src="/icon.svg" alt="Truyện Audio" className="w-9 h-9 rounded-xl shrink-0" />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Truyện Audio
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map(({ id, label, Icon }) => {
              const active = tab === id && !isReaderOpen;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setIsReaderOpen(false);
                    if (id !== 'library') setSelectedStoryId(null);
                  }}
                  className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={quickToggleDark}
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
          >
            <span>{theme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <div className="flex justify-center">
            <PWAInstallButton />
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar */}
      <header className="md:hidden sticky top-0 z-30 pt-safe border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#161920]/95 backdrop-blur-md">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div
            onClick={() => {
              setTab('library');
              setSelectedStoryId(null);
              setIsReaderOpen(false);
            }}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <img src="/icon.svg" alt="Truyện Audio" className="w-7 h-7 rounded-lg shrink-0" />
            <span className="text-base font-bold tracking-tight truncate">Truyện Audio</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <button
              onClick={quickToggleDark}
              aria-label="Đổi chế độ sáng tối"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`flex-1 md:pl-64 min-w-0 ${
          isReaderOpen && activeStory && activeChapterContent
            ? 'pb-6'
            : activeStory && activeChapterContent && !isReaderOpen
              ? 'pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))] md:pb-24'
              : 'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-12'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <OfflineBanner
            pendingSyncCount={pendingSyncCount}
            isSyncing={isSyncing}
            onSyncNow={() => handleSyncNow()}
          />

          {isReaderOpen && activeStory && activeChapterContent ? (
            <ReaderPlayerView
              story={activeStory}
              chapter={activeChapterContent}
              chapterIndex={activeChapterIndex}
              chunks={chunks}
              chunkIndex={chunkIndex}
              isPlaying={isPlaying}
              isNativeAudio={!!activeChapterContent.audioBlob}
              audioCurrentTime={audioCurrentTime}
              audioDuration={audioDuration}
              voices={voices}
              selectedVoiceName={selectedVoiceName}
              voiceProfileId={voiceProfileId}
              eqPreset={eqState.preset}
              eqGains={eqState.gains}
              rate={rate}
              sleepMinutes={sleepMinutes}
              ambientMode={ambientMode}
              wakeLockEnabled={wakeLockEnabled}
              autoPlayNext={autoPlayNext}
              blueLightFilter={blueLightFilter}
              playlistLabel={activePlaylistLabel}
              onBack={() => setIsReaderOpen(false)}
              onTogglePlay={() => (isPlaying ? pausePlayback(true) : startPlayback())}
              onPrevChapter={() => handleAdvanceChapter(-1)}
              onNextChapter={() => handleAdvanceChapter(1)}
              onSeekChunk={(idx) => {
                setChunkIndex(idx);
                chunkIndexRef.current = idx;
                if (isPlaying) speakCurrentChunk(idx);
                else {
                  saveProgress(
                    activeStory.id,
                    activeChapterIndex,
                    idx,
                    0,
                    chunks.length,
                    activeChapterContent.title,
                    false
                  );
                }
              }}
              onSeekAudioTime={(sec) => {
                if (nativeAudioRef.current) {
                  nativeAudioRef.current.currentTime = sec;
                  setAudioCurrentTime(sec);
                }
              }}
              onChangeVoice={(name) => {
                setSelectedVoiceName(name);
                selectedVoiceRef.current = name;
                try {
                  localStorage.setItem('truyen_audio_voice', name);
                } catch {}
                if (isPlaying && !activeChapterContent.audioBlob) {
                  speakCurrentChunk(chunkIndexRef.current);
                } else {
                  toast('Đã chọn giọng thiết bị mới');
                }
              }}
              onChangeVoiceProfile={(id) => {
                setVoiceProfileId(id);
                voiceProfileRef.current = id;
                // Unlock automatic Vietnamese gender matching when switching AI profile
                setSelectedVoiceName('');
                selectedVoiceRef.current = '';
                try {
                  localStorage.setItem('truyen_audio_voice_profile', id);
                  localStorage.setItem('truyen_audio_voice', '');
                } catch {}
                if (isPlaying && !activeChapterContent.audioBlob) {
                  speakCurrentChunk(chunkIndexRef.current);
                } else {
                  const prof = OFFLINE_VOICE_PROFILES.find((p) => p.id === id);
                  if (prof) toast(`Đã chọn giọng: ${prof.label}`);
                }
              }}
              onPreviewVoice={previewCurrentVoice}
              onSelectEqPreset={(presetId) => {
                const found = EQ_PRESETS.find((p) => p.id === presetId);
                if (!found) return;
                const next: EqState = {
                  preset: found.id,
                  gains: [...found.gains] as EqGains,
                };
                setEqState(next);
                eqGainsRef.current = next.gains;
                saveEqState(next);
                updateEqualizerGainsOnAudio(nativeAudioRef.current, next.gains);
                updateEqualizerGainsOnAudio(keepAliveEngine.getAudioElement(), next.gains);
              }}
              onChangeEqBand={(bandIdx, db) => {
                const clamped = Math.max(-12, Math.min(12, Math.round(db)));
                setEqState((prev) => {
                  const nextGains = [...prev.gains] as EqGains;
                  nextGains[bandIdx] = clamped;
                  const matched = EQ_PRESETS.find((p) =>
                    p.gains.every((v, i) => v === nextGains[i])
                  );
                  const next: EqState = {
                    preset: matched ? matched.id : 'custom',
                    gains: nextGains,
                  };
                  eqGainsRef.current = nextGains;
                  saveEqState(next);
                  updateEqualizerGainsOnAudio(nativeAudioRef.current, nextGains);
                  updateEqualizerGainsOnAudio(keepAliveEngine.getAudioElement(), nextGains);
                  return next;
                });
              }}
              onChangeRate={(r) => {
                setRate(r);
                rateRef.current = r;
                try {
                  localStorage.setItem('truyen_audio_rate', String(r));
                } catch {}
                if (nativeAudioRef.current) nativeAudioRef.current.playbackRate = r;
                if (isPlaying && !activeChapterContent.audioBlob) {
                  speakCurrentChunk(chunkIndexRef.current);
                }
              }}
              onChangeSleep={(mins) => {
                setSleepMinutes(mins);
                if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
                if (mins > 0) {
                  sleepTimerRef.current = window.setTimeout(() => {
                    pausePlayback(true);
                    setSleepMinutes(0);
                    toast('Đã hết giờ hẹn, tự động dừng phát');
                  }, mins * 60000);
                  toast(`Hẹn giờ tắt sau ${mins} phút`);
                }
              }}
              onChangeAmbient={async (mode) => {
                setAmbientMode(mode);
                ambientModeRef.current = mode;
                try {
                  localStorage.setItem('truyen_audio_ambient', mode);
                } catch {}
                await keepAliveEngine.setMode(mode, isPlaying && !activeChapterContent.audioBlob);
                if (mode !== 'silent' && isPlaying && !activeChapterContent.audioBlob) {
                  await resumeAndSyncEqualizer(keepAliveEngine.getAudioElement(), eqGainsRef.current);
                }
              }}
              onToggleWakeLock={async () => {
                const next = !wakeLockEnabled;
                const ok = await keepAliveEngine.setWakeLock(next);
                setWakeLockEnabled(next ? ok : false);
                if (next && !ok) toast('Thiết bị không hỗ trợ giữ sáng màn hình.');
              }}
              onToggleAutoPlayNext={() => {
                setAutoPlayNext((prev) => {
                  const next = !prev;
                  autoPlayNextRef.current = next;
                  try {
                    localStorage.setItem('truyen_audio_autoplay_next', String(next));
                  } catch {}
                  toast(
                    next
                      ? 'Đã bật tự động phát chương tiếp theo'
                      : 'Đã tắt tự động phát chương tiếp theo'
                  );
                  return next;
                });
              }}
              onToggleBlueLightFilter={() => {
                setBlueLightFilter((prev) => {
                  const next = !prev;
                  try {
                    localStorage.setItem('truyen_audio_blue_light', String(next));
                  } catch {}
                  toast(
                    next
                      ? 'Đã bật chế độ lọc ánh sáng xanh'
                      : 'Đã tắt chế độ lọc ánh sáng xanh'
                  );
                  return next;
                });
              }}
            />
          ) : tab === 'library' && selectedStory ? (
            <StoryDetailView
              story={selectedStory}
              allStories={stories}
              progressMap={progressMap}
              progress={progressMap[selectedStory.id]}
              activeChapterIndex={
                activeStoryId === selectedStory.id ? activeChapterIndex : null
              }
              isPlaying={activeStoryId === selectedStory.id && isPlaying}
              isOnline={isOnline}
              isDownloadingAll={downloadingStoryId === selectedStory.id}
              downloadProgressText={downloadProgressText}
              onBack={() => setSelectedStoryId(null)}
              onOpenStory={(sid) => {
                setSelectedStoryId(sid);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPlayChapter={(chIdx) => openChapter(selectedStory.id, chIdx, true, { mode: 'story' })}
              onAddChapters={(files) => handleAddChapters(selectedStory.id, files)}
              onUpdateCover={(f) => handleUpdateCover(selectedStory.id, f)}
              onUpdateGenre={(genre) => handleUpdateGenre(selectedStory.id, genre)}
              onRenameChapter={(chIdx, title) =>
                handleRenameChapter(selectedStory.id, chIdx, title)
              }
              onMoveChapter={(chIdx, dir) => handleMoveChapter(selectedStory.id, chIdx, dir)}
              onAutoSortChapters={() => handleAutoSortChapters(selectedStory.id)}
              onDeleteChapter={(chIdx) => handleDeleteChapter(selectedStory.id, chIdx)}
              onDeleteStory={() => handleDeleteStory(selectedStory.id)}
              onDownloadAllOffline={() => handleDownloadStoryOffline(selectedStory.id)}
              onDownloadSingleChapter={(chIdx) =>
                handleDownloadSingleChapter(selectedStory.id, chIdx)
              }
              onRemoveChapterOffline={(chIdx) =>
                handleRemoveChapterOffline(selectedStory.id, chIdx)
              }
              onOpenAddToPlaylist={() => setPlaylistModalTarget(selectedStory)}
            />
          ) : tab === 'library' ? (
            <LibraryView
              stories={stories}
              progressMap={progressMap}
              isOnline={isOnline}
              onOpenStory={(sid) => setSelectedStoryId(sid)}
              onResumeStory={(sid) => {
                const p = progressMap[sid];
                openChapter(sid, p ? p.chapterIndex : 0, true, { mode: 'story' });
              }}
              onCreateStory={handleCreateStory}
              onDeleteStory={handleDeleteStory}
              onDownloadStoryOffline={handleDownloadStoryOffline}
              onOpenAddToPlaylist={(st) => setPlaylistModalTarget(st)}
              downloadingStoryId={downloadingStoryId}
            />
          ) : tab === 'playlists' ? (
            <PlaylistsView
              playlists={playlists}
              stories={stories}
              progressMap={progressMap}
              activeStoryId={activeStoryId}
              isOnline={isOnline}
              shuffleEnabled={shuffleEnabled}
              repeatEnabled={repeatEnabled}
              onToggleShuffle={() => setShuffleEnabled((v) => !v)}
              onToggleRepeat={() => setRepeatEnabled((v) => !v)}
              onCreatePlaylist={(n, d) => handleCreatePlaylist(n, d)}
              onDeletePlaylist={handleDeletePlaylist}
              onUpdatePlaylist={handleUpdatePlaylist}
              onPlayPlaylist={(plId, itemIdx) => {
                const pl = playlists.find((p) => p.id === plId);
                const item = pl?.items[itemIdx];
                if (item) {
                  const st = stories.find((s) => s.id === item.storyId);
                  const prog = progressMap[item.storyId];
                  const resumeCh =
                    isWholeStoryPlaylistItem(item) && st && prog
                      ? Math.min(Math.max(0, prog.chapterIndex), Math.max(0, st.chapters.length - 1))
                      : isWholeStoryPlaylistItem(item)
                        ? 0
                        : item.chapterIndex;
                  openChapter(item.storyId, resumeCh, true, {
                    mode: 'playlist',
                    playlistId: plId,
                    playlistIndex: itemIdx,
                  });
                }
              }}
              onDownloadPlaylistOffline={handleDownloadPlaylistOffline}
              downloadingPlaylistId={downloadingPlaylistId}
            />
          ) : tab === 'offline' ? (
            <OfflineManagerView
              stories={stories}
              isOnline={isOnline}
              storageStats={storageStats}
              downloadingStoryId={downloadingStoryId}
              onOpenStory={(sid) => {
                setTab('library');
                setSelectedStoryId(sid);
              }}
              onDownloadStoryOffline={handleDownloadStoryOffline}
              onClearAllOffline={() =>
                new Promise<void>((resolve) => {
                  setConfirmState({
                    message:
                      'Xóa toàn bộ nội dung chương đã tải ngoại tuyến trên máy này? Dữ liệu đã đồng bộ trên đám mây vẫn được giữ nguyên.',
                    confirmLabel: 'Dọn bộ nhớ',
                    onConfirm: async () => {
                      await clearAllOfflineChapters();
                      await refreshLocalData();
                      toast('Đã dọn sạch bộ nhớ ngoại tuyến');
                      resolve();
                    },
                  });
                })
              }
            />
          ) : (
            <SyncSettingsView
              user={user}
              authReady={authReady}
              isOnline={isOnline}
              isSyncing={isSyncing}
              syncStatusText={syncStatusText}
              lastSyncedAt={lastSyncedAt}
              pendingSyncCount={pendingSyncCount}
              theme={theme}
              deviceName={deviceName}
              onChangeTheme={setTheme}
              onChangeDeviceName={(name) => {
                setDeviceName(name);
                try {
                  localStorage.setItem('truyen_audio_device', name);
                } catch {}
              }}
              onSignInGoogle={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                  toast('Đăng nhập Google thành công');
                } catch (err: unknown) {
                  const code = (err as { code?: string })?.code || '';
                  if (code === 'auth/unauthorized-domain') {
                    const host = typeof window !== 'undefined' ? window.location.hostname : '';
                    throw new Error(
                      `Tên miền “${host}” chưa được cấp quyền trong Firebase Console (dự án audio-c60da → Authentication → Settings → Authorized domains → Add domain).`
                    );
                  }
                  if (code === 'auth/operation-not-allowed') {
                    throw new Error(
                      'Bạn chưa bật Google Sign-In trong Firebase Console của dự án audio-c60da (Authentication → Sign-in method).'
                    );
                  }
                  if (code === 'auth/popup-blocked') {
                    throw new Error(
                      'Trình duyệt đang chặn cửa sổ bật lên (popup). Hãy cho phép popup rồi thử lại.'
                    );
                  }
                  if (code === 'auth/popup-closed-by-user') {
                    throw new Error('Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.');
                  }
                  throw new Error(
                    err instanceof Error ? `Không đăng nhập được: ${err.message}` : 'Đăng nhập bị hủy.'
                  );
                }
              }}
              onSignInEmail={async (email, password) => {
                try {
                  const cred = await signInWithEmailAndPassword(auth, email, password);
                  if (cred.user.emailVerified) {
                    toast('Đăng nhập thành công');
                  } else {
                    toast('Hãy xác minh email để bật đồng bộ đám mây');
                  }
                } catch (err: unknown) {
                  const code = (err as { code?: string })?.code || '';
                  if (code === 'auth/operation-not-allowed') {
                    throw new Error(
                      'Bạn chưa bật công tắc Email/Password trong Firebase Console của dự án audio-c60da (Authentication → Sign-in method).'
                    );
                  }
                  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                    throw new Error(
                      'Email hoặc mật khẩu không đúng. Nếu chưa có tài khoản, hãy chuyển sang tab "Đăng ký mới" (hoặc bấm "Quên mật khẩu?" nếu từng đăng nhập Google trên Web).'
                    );
                  }
                  if (code === 'auth/too-many-requests') {
                    throw new Error('Thử sai quá nhiều lần, vui lòng đợi vài phút.');
                  }
                  throw new Error(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
                }
              }}
              onRegisterEmail={async (email, password) => {
                try {
                  const cred = await createUserWithEmailAndPassword(auth, email, password);
                  await sendEmailVerification(cred.user);
                  toast('Đã tạo tài khoản! Kiểm tra hộp thư để xác minh email.');
                } catch (err: unknown) {
                  const code = (err as { code?: string })?.code || '';
                  if (code === 'auth/operation-not-allowed') {
                    throw new Error(
                      'Bạn chưa bật công tắc Email/Password trong Firebase Console của dự án audio-c60da (Authentication → Sign-in method).'
                    );
                  }
                  if (code === 'auth/email-already-in-use') {
                    throw new Error('Email này đã được đăng ký, hãy chuyển sang tab Đăng nhập (hoặc bấm Quên mật khẩu? nếu từng dùng Google).');
                  }
                  if (code === 'auth/weak-password') {
                    throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
                  }
                  throw new Error(err instanceof Error ? err.message : 'Đăng ký thất bại.');
                }
              }}
              onResetPassword={async (email) => {
                try {
                  await sendPasswordResetEmail(auth, email);
                  toast('Đã gửi email đặt lại mật khẩu');
                } catch (err: unknown) {
                  const code = (err as { code?: string })?.code || '';
                  if (code === 'auth/user-not-found') {
                    throw new Error('Không tìm thấy tài khoản với email này.');
                  }
                  throw new Error(err instanceof Error ? err.message : 'Không gửi được email.');
                }
              }}
              onResendVerification={async () => {
                if (!auth.currentUser) return;
                try {
                  await sendEmailVerification(auth.currentUser);
                  toast('Đã gửi lại email xác minh');
                } catch {
                  toast('Vui lòng đợi một lát trước khi gửi lại email.');
                }
              }}
              onReloadVerification={async () => {
                if (!auth.currentUser) return;
                await auth.currentUser.reload();
                await auth.currentUser.getIdToken(true);
                const refreshed = auth.currentUser;
                setUser(refreshed);
                setAuthTick((n) => n + 1);
                if (refreshed?.emailVerified) {
                  toast('Email đã xác minh! Đang đồng bộ dữ liệu…');
                  await handleSyncNow(refreshed);
                } else {
                  toast('Email vẫn chưa được xác minh. Hãy bấm link trong hộp thư của bạn.');
                }
              }}
              onSignOut={async () => {
                await signOut(auth);
                toast('Đã đăng xuất');
              }}
              onSyncNow={() => handleSyncNow()}
              onExportBackup={async () => {
                const bundle = await exportBackupData();
                const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `truyen-audio-backup-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast(`Đã xuất ${bundle.stories.length} truyện & ${bundle.chapters.length} chương`);
              }}
              onImportBackup={async (file) => {
                try {
                  const text = await file.text();
                  const res = await importBackupData(text);
                  await refreshLocalData();
                  toast(
                    `Đã nhập ${res.storiesImported} truyện, ${res.chaptersImported} chương, ${res.playlistsImported} danh sách phát`
                  );
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Không đọc được file sao lưu');
                }
              }}
            />
          )}
        </div>
      </main>

      {/* Persistent MiniPlayer */}
      {activeStory && activeChapterContent && !isReaderOpen && (
        <MiniPlayer
          story={activeStory}
          chapterTitle={activeChapterContent.title}
          progressPercent={miniProgressPercent}
          isPlaying={isPlaying}
          onExpand={() => setIsReaderOpen(true)}
          onTogglePlay={() => (isPlaying ? pausePlayback(true) : startPlayback())}
          onNext={() => handleAdvanceChapter(1)}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar (hidden while full reader player dock is active) */}
      {!(isReaderOpen && activeStory && activeChapterContent) && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 pb-safe border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#161920]/95 backdrop-blur-md">
          <div className="h-16 grid grid-cols-4 items-center">
            {navItems.map(({ id, label, Icon }) => {
              const active = tab === id && !isReaderOpen;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setIsReaderOpen(false);
                    if (id !== 'library') setSelectedStoryId(null);
                  }}
                  className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium tracking-tight truncate max-w-[76px]">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Add to Playlist Modal */}
      {playlistModalTarget && (
        <AddToPlaylistModal
          story={playlistModalTarget}
          playlists={playlists}
          onClose={() => setPlaylistModalTarget(null)}
          onAddStoryToPlaylist={async (plId, targetStory) => {
            const pl = playlists.find((p) => p.id === plId);
            if (!pl) return;
            if (pl.items.some((it) => it.storyId === targetStory.id)) {
              toast(`“${targetStory.title}” đã có trong “${pl.name}”`);
              return;
            }
            const entry: PlaylistItem = {
              storyId: targetStory.id,
              chapterIndex: 0,
              storyTitle: targetStory.title,
              chapterTitle: PLAYLIST_WHOLE_STORY_MARKER,
            };
            const merged = [...pl.items, entry].slice(0, 200);
            await handleUpdatePlaylist({ ...pl, items: merged, updatedAt: Date.now() });
            toast(`Đã thêm truyện “${targetStory.title}” vào “${pl.name}”`);
          }}
          onCreatePlaylistWithStory={async (name, targetStory) => {
            const entry: PlaylistItem = {
              storyId: targetStory.id,
              chapterIndex: 0,
              storyTitle: targetStory.title,
              chapterTitle: PLAYLIST_WHOLE_STORY_MARKER,
            };
            await handleCreatePlaylist(name, '', [entry]);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmState(null)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const fn = confirmState.onConfirm;
                  setConfirmState(null);
                  fn();
                }}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed left-1/2 -translate-x-1/2 top-[calc(4.25rem+env(safe-area-inset-top,0px))] md:top-6 z-50 max-w-[90vw] px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs sm:text-sm font-medium shadow-lg text-center">
          {toastMsg}
        </div>
      )}

      {/* Night Amber Blue-Light Filter Overlay */}
      {blueLightFilter && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[60] pointer-events-none bg-amber-400/20 dark:bg-amber-500/20 backdrop-sepia-[.25] transition-opacity duration-300"
        />
      )}
    </div>
  );
}
