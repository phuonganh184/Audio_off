import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Download,
  ListMusic,
  Play,
  Plus,
  Repeat,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import {
  PLAYLIST_WHOLE_STORY_MARKER,
  type ListeningProgress,
  type Playlist,
  type PlaylistItem,
  type Story,
} from '@/src/types';

interface Props {
  playlists: Playlist[];
  stories: Story[];
  progressMap: Record<string, ListeningProgress>;
  activeStoryId: string | null;
  isOnline: boolean;
  shuffleEnabled: boolean;
  repeatEnabled: boolean;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onCreatePlaylist: (
    name: string,
    description: string,
    initialItems?: PlaylistItem[]
  ) => Promise<Playlist | void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onUpdatePlaylist: (playlist: Playlist) => Promise<void>;
  onPlayPlaylist: (playlistId: string, itemIndex: number) => void;
  onDownloadPlaylistOffline: (playlistId: string) => Promise<void>;
  downloadingPlaylistId: string | null;
}

interface StoryGroup {
  storyId: string;
  storyTitle: string;
  firstItemIndex: number;
  story?: Story;
}

function groupPlaylistByStories(
  items: PlaylistItem[],
  storyMap: Map<string, Story>
): StoryGroup[] {
  const seen = new Set<string>();
  const groups: StoryGroup[] = [];
  items.forEach((it, idx) => {
    if (seen.has(it.storyId)) return;
    seen.add(it.storyId);
    const st = storyMap.get(it.storyId);
    groups.push({
      storyId: it.storyId,
      storyTitle: st?.title || it.storyTitle,
      firstItemIndex: idx,
      story: st,
    });
  });
  return groups;
}

function toWholeStoryItems(groups: StoryGroup[]): PlaylistItem[] {
  return groups.slice(0, 200).map((g) => ({
    storyId: g.storyId,
    chapterIndex: 0,
    storyTitle: (g.story?.title || g.storyTitle || 'Truyện').slice(0, 200),
    chapterTitle: PLAYLIST_WHOLE_STORY_MARKER,
  }));
}

function shuffleArray<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface GenreStat {
  genre: string;
  listenedCount: number;
  libraryCount: number;
  score: number;
}

function analyzeGenrePreferences(
  stories: Story[],
  progressMap: Record<string, ListeningProgress>
): GenreStat[] {
  const statsMap = new Map<string, GenreStat>();
  const now = Date.now();

  for (const st of stories) {
    if (st.chapters.length === 0) continue;
    const genre = st.genre?.trim();
    if (!genre) continue;
    const key = genre.toLowerCase();
    const existing = statsMap.get(key) || {
      genre,
      listenedCount: 0,
      libraryCount: 0,
      score: 0,
    };
    existing.libraryCount += 1;

    const prog = progressMap[st.id];
    if (prog) {
      existing.listenedCount += 1;
      const chapterWeight = Math.min(2, (prog.chapterIndex + 1) / Math.max(1, st.chapters.length));
      const daysAgo = Math.max(0, (now - prog.updatedAt) / (1000 * 60 * 60 * 24));
      const recencyBoost = daysAgo < 3 ? 1.5 : daysAgo < 14 ? 0.8 : 0.3;
      existing.score += 2 + chapterWeight + recencyBoost;
    } else {
      existing.score += 0.15;
    }
    statsMap.set(key, existing);
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.listenedCount !== a.listenedCount) return b.listenedCount - a.listenedCount;
    return b.libraryCount - a.libraryCount;
  });
}

export const PlaylistsView: React.FC<Props> = ({
  playlists,
  stories,
  progressMap,
  activeStoryId,
  isOnline,
  shuffleEnabled,
  repeatEnabled,
  onToggleShuffle,
  onToggleRepeat,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylist,
  onPlayPlaylist,
  onDownloadPlaylistOffline,
  downloadingPlaylistId,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSmartShuffle, setShowSmartShuffle] = useState(false);
  const [smartGenreKey, setSmartGenreKey] = useState<string>('auto');
  const [smartPrioritizeUnfinished, setSmartPrioritizeUnfinished] = useState(true);
  const [smartShuffleSeed, setSmartShuffleSeed] = useState(0);
  const [smartPlaylistName, setSmartPlaylistName] = useState('');
  const [smartCreating, setSmartCreating] = useState(false);
  const [showAddStories, setShowAddStories] = useState(false);
  const [storySearch, setStorySearch] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const selected = playlists.find((p) => p.id === selectedId) || null;

  const storyMap = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);

  const playableStories = useMemo(
    () => stories.filter((s) => s.chapters.length > 0),
    [stories]
  );

  const genrePreferences = useMemo(
    () => analyzeGenrePreferences(stories, progressMap),
    [stories, progressMap]
  );

  const topDetectedGenre = genrePreferences[0] || null;
  const hasListenedGenreSignal = genrePreferences.some((g) => g.listenedCount > 0);

  const effectiveSmartGenre = useMemo(() => {
    if (smartGenreKey === 'all') return null;
    if (smartGenreKey === 'auto') return topDetectedGenre?.genre || null;
    return (
      genrePreferences.find((g) => g.genre.toLowerCase() === smartGenreKey.toLowerCase())?.genre ||
      topDetectedGenre?.genre ||
      null
    );
  }, [genrePreferences, smartGenreKey, topDetectedGenre]);

  const smartShuffledStories = useMemo(() => {
    // smartShuffleSeed triggers intentional reshuffling when user clicks "Trộn lại"
    void smartShuffleSeed;
    let pool = effectiveSmartGenre
      ? playableStories.filter(
          (s) => (s.genre?.trim() || '').toLowerCase() === effectiveSmartGenre.toLowerCase()
        )
      : playableStories;

    if (pool.length === 0) {
      pool = playableStories;
    }

    if (smartPrioritizeUnfinished) {
      const unfinished: Story[] = [];
      const completed: Story[] = [];
      for (const st of pool) {
        const prog = progressMap[st.id];
        const isDone =
          prog &&
          prog.chapterIndex >= st.chapters.length - 1 &&
          prog.totalChunks > 0 &&
          prog.chunkIndex >= prog.totalChunks - 1;
        if (isDone) {
          completed.push(st);
        } else {
          unfinished.push(st);
        }
      }
      return [...shuffleArray(unfinished), ...shuffleArray(completed)].slice(0, 30);
    }

    return shuffleArray(pool).slice(0, 30);
  }, [effectiveSmartGenre, playableStories, progressMap, smartPrioritizeUnfinished, smartShuffleSeed]);

  const openSmartShuffleModal = () => {
    const detected = topDetectedGenre?.genre || null;
    setSmartGenreKey('auto');
    setSmartShuffleSeed((s) => s + 1);
    setSmartPlaylistName(
      detected ? `Ngẫu nhiên: ${detected}` : 'Danh sách phát ngẫu nhiên'
    );
    setShowSmartShuffle(true);
  };

  const handleSelectSmartGenre = (nextKey: string) => {
    setSmartGenreKey(nextKey);
    setSmartShuffleSeed((s) => s + 1);
    const resolved =
      nextKey === 'all'
        ? null
        : nextKey === 'auto'
          ? topDetectedGenre?.genre || null
          : genrePreferences.find((g) => g.genre.toLowerCase() === nextKey.toLowerCase())?.genre ||
            null;
    setSmartPlaylistName(
      resolved ? `Ngẫu nhiên: ${resolved}` : 'Danh sách phát ngẫu nhiên'
    );
  };

  const handleConfirmSmartShuffle = async (playImmediately: boolean) => {
    if (smartCreating || smartShuffledStories.length === 0) return;
    setSmartCreating(true);
    try {
      const finalName =
        smartPlaylistName.trim() ||
        (effectiveSmartGenre ? `Ngẫu nhiên: ${effectiveSmartGenre}` : 'Danh sách phát ngẫu nhiên');
      const finalDesc = effectiveSmartGenre
        ? `Tạo ngẫu nhiên từ ${smartShuffledStories.length} truyện thể loại ${effectiveSmartGenre}`
        : `Tạo ngẫu nhiên từ ${smartShuffledStories.length} truyện trong thư viện`;
      const items: PlaylistItem[] = smartShuffledStories.map((st) => ({
        storyId: st.id,
        chapterIndex: 0,
        storyTitle: st.title.slice(0, 200),
        chapterTitle: PLAYLIST_WHOLE_STORY_MARKER,
      }));
      const created = await onCreatePlaylist(finalName, finalDesc, items);
      setShowSmartShuffle(false);
      if (created && created.id) {
        setSelectedId(created.id);
        if (playImmediately && created.items.length > 0) {
          onPlayPlaylist(created.id, 0);
        }
      }
    } finally {
      setSmartCreating(false);
    }
  };

  const selectedGroups = useMemo(
    () => (selected ? groupPlaylistByStories(selected.items, storyMap) : []),
    [selected, storyMap]
  );

  const filteredPickerStories = useMemo(() => {
    const q = storySearch.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.author || '').toLowerCase().includes(q) ||
        (s.genre || '').toLowerCase().includes(q)
    );
  }, [stories, storySearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreatePlaylist(name.trim(), desc.trim());
    setName('');
    setDesc('');
    setShowCreate(false);
  };

  const moveStoryGroup = async (pl: Playlist, groupIdx: number, dir: -1 | 1) => {
    const groups = groupPlaylistByStories(pl.items, storyMap);
    const nextIdx = groupIdx + dir;
    if (nextIdx < 0 || nextIdx >= groups.length) return;
    const copy = [...groups];
    const [removed] = copy.splice(groupIdx, 1);
    copy.splice(nextIdx, 0, removed);
    await onUpdatePlaylist({
      ...pl,
      items: toWholeStoryItems(copy),
      updatedAt: Date.now(),
    });
  };

  const removeStoryGroup = async (pl: Playlist, storyId: string) => {
    const groups = groupPlaylistByStories(pl.items, storyMap).filter(
      (g) => g.storyId !== storyId
    );
    await onUpdatePlaylist({
      ...pl,
      items: toWholeStoryItems(groups),
      updatedAt: Date.now(),
    });
  };

  const toggleStoryInPlaylist = async (pl: Playlist, story: Story) => {
    const groups = groupPlaylistByStories(pl.items, storyMap);
    const exists = groups.some((g) => g.storyId === story.id);
    const nextGroups = exists
      ? groups.filter((g) => g.storyId !== story.id)
      : [
          ...groups,
          {
            storyId: story.id,
            storyTitle: story.title,
            firstItemIndex: groups.length,
            story,
          },
        ];
    await onUpdatePlaylist({
      ...pl,
      items: toWholeStoryItems(nextGroups),
      updatedAt: Date.now(),
    });
  };

  if (selected) {
    const totalChapters = selectedGroups.reduce(
      (sum, g) => sum + (g.story?.chapters.length ?? 0),
      0
    );
    const offlineReadyChapters = selectedGroups.reduce(
      (sum, g) =>
        sum + (g.story?.chapters.filter((ch) => ch.downloadedOffline).length ?? 0),
      0
    );
    const offlineReadyStories = selectedGroups.filter((g) => {
      const chs = g.story?.chapters || [];
      return chs.length > 0 && chs.every((ch) => ch.downloadedOffline);
    }).length;
    const hasPlayableChapters = totalChapters > 0;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setSelectedId(null);
              setShowAddStories(false);
            }}
            className="min-h-[44px] px-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
          >
            ← Danh sách phát
          </button>
          <button
            onClick={() => {
              onDeletePlaylist(selected.id);
              setSelectedId(null);
            }}
            className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa danh sách</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {selected.name}
            </h2>
            {selected.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {selected.description}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              {selectedGroups.length} tập truyện · {totalChapters} chương ·{' '}
              {offlineReadyStories}/{selectedGroups.length} tập sẵn sàng ngoại tuyến
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {selectedGroups.length > 0 && hasPlayableChapters && (
              <button
                onClick={() => onPlayPlaylist(selected.id, selectedGroups[0].firstItemIndex)}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Phát tất cả</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStorySearch('');
                setShowAddStories(true);
              }}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-800 dark:text-slate-200 text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Thêm truyện</span>
            </button>
            {totalChapters > offlineReadyChapters && (
              <button
                onClick={() => onDownloadPlaylistOffline(selected.id)}
                disabled={!isOnline || downloadingPlaylistId === selected.id}
                className="min-h-[44px] px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingPlaylistId === selected.id
                    ? 'Đang tải…'
                    : 'Tải ngoại tuyến tất cả'}
                </span>
              </button>
            )}
            <button
              onClick={onToggleShuffle}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                shuffleEnabled
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              <span>Trộn bài</span>
            </button>
            <button
              onClick={onToggleRepeat}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                repeatEnabled
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Lặp lại</span>
            </button>
          </div>
        </div>

        {selectedGroups.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
            <BookOpen className="w-9 h-9 mx-auto text-slate-400 dark:text-slate-600" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Danh sách phát đang trống. Hãy chọn các tập truyện từ thư viện để nghe liên tục cả bộ.
            </p>
            <button
              type="button"
              onClick={() => {
                setStorySearch('');
                setShowAddStories(true);
              }}
              className="min-h-[42px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Chọn truyện từ thư viện</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {selectedGroups.map((group, idx) => {
              const st = group.story;
              const totalCh = st?.chapters.length ?? 0;
              const offlineCh = st?.chapters.filter((c) => c.downloadedOffline).length ?? 0;
              const allOffline = totalCh > 0 && offlineCh === totalCh;
              const prog = progressMap[group.storyId];
              const resumeCh = prog
                ? Math.min(prog.chapterIndex + 1, Math.max(1, totalCh))
                : 0;
              const hasAnyPlayable =
                totalCh > 0 && (offlineCh > 0 || isOnline);
              const isPlayingThisStory = activeStoryId === group.storyId;

              return (
                <div
                  key={group.storyId}
                  onClick={() =>
                    hasAnyPlayable && onPlayPlaylist(selected.id, group.firstItemIndex)
                  }
                  className={`p-3.5 sm:px-4 flex items-center gap-3 transition-colors ${
                    !hasAnyPlayable
                      ? 'opacity-55 cursor-not-allowed'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                  } ${isPlayingThisStory ? 'bg-blue-500/8 dark:bg-blue-500/12' : ''}`}
                >
                  <span className="w-6 text-center text-xs font-semibold text-slate-500 tabular-nums shrink-0">
                    {idx + 1}
                  </span>
                  <StoryCover
                    title={group.storyTitle}
                    cover={st?.cover}
                    className="w-11 h-15 rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {group.storyTitle}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span>{totalCh} chương</span>
                      {st?.genre && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{st.genre}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      {allOffline ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Đã tải ngoại tuyến
                        </span>
                      ) : offlineCh > 0 ? (
                        <span>
                          Offline {offlineCh}/{totalCh}
                        </span>
                      ) : (
                        <span>Chưa tải offline</span>
                      )}
                      {prog && totalCh > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Đang nghe Ch. {resumeCh}/{totalCh}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => moveStoryGroup(selected, idx, -1)}
                      disabled={idx === 0}
                      title="Lên"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveStoryGroup(selected, idx, 1)}
                      disabled={idx === selectedGroups.length - 1}
                      title="Xuống"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeStoryGroup(selected, group.storyId)}
                      title="Gỡ truyện khỏi danh sách"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Story Picker Modal */}
        {showAddStories && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Thêm tập truyện vào “{selected.name}”
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddStories(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={storySearch}
                  onChange={(e) => setStorySearch(e.target.value)}
                  placeholder="Tìm tên truyện, tác giả, thể loại…"
                  className="w-full min-h-[42px] pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {filteredPickerStories.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    Không có truyện nào phù hợp trong thư viện.
                  </div>
                ) : (
                  filteredPickerStories.map((st) => {
                    const added = selectedGroups.some((g) => g.storyId === st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleStoryInPlaylist(selected, st)}
                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <StoryCover
                          title={st.title}
                          cover={st.cover}
                          className="w-10 h-14 rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {st.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                            {st.chapters.length} chương
                            {st.genre ? ` · ${st.genre}` : ''}
                            {st.author ? ` · ${st.author}` : ''}
                          </div>
                        </div>
                        <span
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shrink-0 ${
                            added
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {added ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã thêm</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm</span>
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddStories(false)}
                  className="min-h-[42px] px-5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Danh sách phát tùy chỉnh
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
            {playlists.length} danh sách · Gom nhiều tập truyện để phát nối tiếp &amp; đồng bộ đa thiết bị
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {playableStories.length > 0 && (
            <button
              type="button"
              onClick={openSmartShuffleModal}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Tạo danh sách ngẫu nhiên</span>
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo danh sách mới</span>
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-10 text-center">
          <ListMusic className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chưa có danh sách phát nào
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Tạo danh sách phát như “Nghe trước khi ngủ” hoặc dùng Smart Shuffle để tự động quét các
            truyện cùng thể loại hay nghe trong thư viện.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {playableStories.length > 0 && (
              <button
                type="button"
                onClick={openSmartShuffleModal}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tạo ngẫu nhiên theo thể loại</span>
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo danh sách đầu tiên</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map((pl) => {
            const groups = groupPlaylistByStories(pl.items, storyMap);
            const totalChapters = groups.reduce(
              (sum, g) => sum + (g.story?.chapters.length ?? 0),
              0
            );
            return (
              <div
                key={pl.id}
                onClick={() => setSelectedId(pl.id)}
                className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-500/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ListMusic className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                      {groups.length} tập truyện ({totalChapters} chương)
                      {pl.description ? ` · ${pl.description}` : ''}
                    </p>
                  </div>
                </div>
                {groups.length > 0 && totalChapters > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl.id, groups[0].firstItemIndex);
                    }}
                    aria-label={`Phát ${pl.name}`}
                    className="min-h-[40px] min-w-[40px] rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 ml-0.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Tạo danh sách phát
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tên danh sách phát
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nghe buổi tối"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Mô tả (không bắt buộc)
              </label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ví dụ: Tuyển chọn các bộ truyện hay nhất"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
              >
                Tạo danh sách
              </button>
            </div>
          </form>
        </div>
      )}
      {showSmartShuffle && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:p-4"
          onClick={() => setShowSmartShuffle(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4 max-h-[88vh] flex flex-col"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Tạo danh sách phát ngẫu nhiên
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSmartShuffle(false)}
                aria-label="Đóng hộp thoại tạo danh sách ngẫu nhiên"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {topDetectedGenre ? (
                <>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {hasListenedGenreSignal
                      ? `Thể loại bạn hay nghe nhất: ${topDetectedGenre.genre}`
                      : `Thể loại nổi bật trong thư viện: ${topDetectedGenre.genre}`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {hasListenedGenreSignal
                      ? `Đã nghe ${topDetectedGenre.listenedCount} truyện · Quét thấy ${topDetectedGenre.libraryCount} truyện cùng thể loại`
                      : `Tìm thấy ${topDetectedGenre.libraryCount} truyện có sẵn chương để trộn phát`}
                  </div>
                </>
              ) : (
                <div>
                  Các truyện chưa gắn thể loại cụ thể — hệ thống sẽ quét và trộn ngẫu nhiên toàn bộ truyện hiện có trong thư viện.
                </div>
              )}
            </div>

            {genrePreferences.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chọn thể loại để quét:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {genrePreferences.map((gp, idx) => {
                    const isSelected =
                      smartGenreKey === 'auto'
                        ? idx === 0
                        : smartGenreKey.toLowerCase() === gp.genre.toLowerCase();
                    return (
                      <button
                        key={gp.genre}
                        type="button"
                        onClick={() => handleSelectSmartGenre(gp.genre)}
                        className={`min-h-[34px] px-3 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer tabular-nums ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                            : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                        }`}
                      >
                        {gp.genre} ({gp.libraryCount})
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleSelectSmartGenre('all')}
                    className={`min-h-[34px] px-3 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition cursor-pointer tabular-nums ${
                      smartGenreKey === 'all'
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                    }`}
                  >
                    Tất cả thể loại ({playableStories.length})
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên danh sách phát
                </label>
                <input
                  type="text"
                  maxLength={115}
                  value={smartPlaylistName}
                  onChange={(e) => setSmartPlaylistName(e.target.value)}
                  placeholder="Ngẫu nhiên theo sở thích"
                  className="w-full min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  role="switch"
                  aria-checked={smartPrioritizeUnfinished}
                  onClick={() => setSmartPrioritizeUnfinished((v) => !v)}
                  className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    smartPrioritizeUnfinished
                      ? 'bg-blue-600/10 border-blue-500/50 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-[#111318] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="truncate">Ưu tiên truyện chưa nghe xong</span>
                  <span className="font-semibold shrink-0">
                    {smartPrioritizeUnfinished ? 'Bật' : 'Tắt'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  Kết quả quét &amp; trộn ({smartShuffledStories.length} truyện)
                </span>
                <button
                  type="button"
                  onClick={() => setSmartShuffleSeed((s) => s + 1)}
                  className="min-h-[32px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Trộn lại</span>
                </button>
              </div>

              <ul className="overflow-y-auto max-h-48 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {smartShuffledStories.map((st, idx) => (
                  <li key={st.id} className="px-3 py-2 flex items-center gap-2.5 text-xs">
                    <span className="w-5 text-center font-semibold text-slate-400 tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                    <StoryCover
                      title={st.title}
                      cover={st.cover}
                      className="w-8 h-11 rounded-md shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {st.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                        {st.chapters.length} chương
                        {st.genre ? ` · ${st.genre}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSmartShuffle(false)}
                className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={smartCreating || smartShuffledStories.length === 0}
                onClick={() => handleConfirmSmartShuffle(false)}
                className="min-h-[42px] px-4 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-semibold hover:bg-blue-500/15 disabled:opacity-50 cursor-pointer"
              >
                Lưu danh sách
              </button>
              <button
                type="button"
                disabled={smartCreating || smartShuffledStories.length === 0}
                onClick={() => handleConfirmSmartShuffle(true)}
                className="min-h-[42px] px-4 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>{smartCreating ? 'Đang tạo…' : 'Lưu & Phát ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
