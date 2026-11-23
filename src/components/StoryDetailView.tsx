import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  CloudOff,
  Download,
  FilePlus2,
  Headphones,
  Image as ImageIcon,
  ListPlus,
  Pencil,
  Play,
  Tag,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import { formatBytes } from '@/src/lib/localDb';
import { estimateMinutes } from '@/src/lib/parsers';
import { STORY_GENRES, type ListeningProgress, type Story } from '@/src/types';

interface Props {
  story: Story;
  allStories: Story[];
  progressMap: Record<string, ListeningProgress>;
  progress?: ListeningProgress;
  activeChapterIndex: number | null;
  isPlaying: boolean;
  isOnline: boolean;
  isDownloadingAll: boolean;
  downloadProgressText: string;
  onBack: () => void;
  onOpenStory: (storyId: string) => void;
  onPlayChapter: (chapterIndex: number) => void;
  onAddChapters: (files: FileList) => Promise<void>;
  onUpdateCover: (file: File) => Promise<void>;
  onUpdateGenre: (genre: string) => Promise<void>;
  onRenameChapter: (chapterIndex: number, newTitle: string) => Promise<void>;
  onMoveChapter: (chapterIndex: number, direction: -1 | 1) => Promise<void>;
  onAutoSortChapters: () => Promise<void>;
  onDeleteChapter: (chapterIndex: number) => void;
  onDeleteStory: () => void;
  onDownloadAllOffline: () => Promise<void>;
  onDownloadSingleChapter: (chapterIndex: number) => Promise<void>;
  onRemoveChapterOffline: (chapterIndex: number) => Promise<void>;
  onOpenAddToPlaylist: () => void;
}

const CUSTOM_GENRE_VALUE = '__custom__';

export const StoryDetailView: React.FC<Props> = ({
  story,
  allStories,
  progressMap,
  progress,
  activeChapterIndex,
  isPlaying,
  isOnline,
  isDownloadingAll,
  downloadProgressText,
  onBack,
  onOpenStory,
  onPlayChapter,
  onAddChapters,
  onUpdateCover,
  onUpdateGenre,
  onRenameChapter,
  onMoveChapter,
  onAutoSortChapters,
  onDeleteChapter,
  onDeleteStory,
  onDownloadAllOffline,
  onDownloadSingleChapter,
  onRemoveChapterOffline,
  onOpenAddToPlaylist,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [editingGenre, setEditingGenre] = useState(false);
  const [genreSelect, setGenreSelect] = useState('');
  const [customGenre, setCustomGenre] = useState('');
  const [savingGenre, setSavingGenre] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const openGenreEditor = () => {
    const current = story.genre?.trim() || '';
    if (!current) {
      setGenreSelect('');
      setCustomGenre('');
    } else if ((STORY_GENRES as readonly string[]).includes(current)) {
      setGenreSelect(current);
      setCustomGenre('');
    } else {
      setGenreSelect(CUSTOM_GENRE_VALUE);
      setCustomGenre(current);
    }
    setEditingGenre(true);
  };

  const handleSaveGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGenre) return;
    const resolved =
      genreSelect === CUSTOM_GENRE_VALUE ? customGenre.trim() : genreSelect.trim();
    setSavingGenre(true);
    try {
      await onUpdateGenre(resolved);
      setEditingGenre(false);
    } finally {
      setSavingGenre(false);
    }
  };

  const startRename = (idx: number, currentTitle: string) => {
    setEditingIdx(idx);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIdx === null || savingRename) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) return;
    setSavingRename(true);
    try {
      await onRenameChapter(editingIdx, trimmed);
      setEditingIdx(null);
      setEditingTitle('');
    } finally {
      setSavingRename(false);
    }
  };

  const offlineCount = story.chapters.filter((c) => c.downloadedOffline).length;
  const totalBytes = story.chapters.reduce(
    (sum, c) => sum + (c.downloadedOffline ? c.sizeBytes : 0),
    0
  );
  const allOffline = story.chapters.length > 0 && offlineCount === story.chapters.length;
  const resumeIndex = progress
    ? Math.min(progress.chapterIndex, Math.max(0, story.chapters.length - 1))
    : 0;

  const currentGenre = story.genre?.trim() || '';
  const sameGenreStories = currentGenre
    ? allStories
        .filter(
          (s) =>
            s.id !== story.id &&
            (s.genre?.trim() || '').toLowerCase() === currentGenre.toLowerCase()
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 px-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thư viện</span>
        </button>
        <button
          onClick={onDeleteStory}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Xóa truyện</span>
        </button>
      </div>

      {/* Story Hero */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row gap-5">
        <StoryCover
          title={story.title}
          cover={story.cover}
          className="w-28 h-38 sm:w-32 sm:h-44 rounded-xl shrink-0 mx-auto sm:mx-0"
        />
        <div className="flex-1 min-w-0 flex flex-col justify-between text-center sm:text-left">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {story.title}
            </h2>
            {story.author && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{story.author}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {!editingGenre ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Tag className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>{story.genre?.trim() || 'Chưa phân loại'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={openGenreEditor}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Đổi thể loại</span>
                  </button>
                </>
              ) : (
                <form
                  onSubmit={handleSaveGenre}
                  className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 w-full"
                >
                  <select
                    aria-label="Chọn thể loại"
                    value={genreSelect}
                    onChange={(e) => setGenreSelect(e.target.value)}
                    className="min-h-[36px] px-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
                  >
                    <option value="">Chưa phân loại</option>
                    {STORY_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    <option value={CUSTOM_GENRE_VALUE}>+ Thể loại khác…</option>
                  </select>
                  {genreSelect === CUSTOM_GENRE_VALUE && (
                    <input
                      type="text"
                      maxLength={55}
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      placeholder="Nhập thể loại…"
                      className="min-h-[36px] w-36 px-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={savingGenre}
                    title="Lưu thể loại"
                    className="min-h-[36px] px-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGenre(false)}
                    title="Hủy"
                    className="min-h-[36px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              <span>{story.chapters.length} chương</span>
              <span aria-hidden="true"> · </span>
              <span>
                Đã lưu ngoại tuyến {offlineCount}/{story.chapters.length} ({formatBytes(totalBytes)})
              </span>
            </div>
            {progress && story.chapters.length > 0 && (
              <p className="mt-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                Tiến trình: Chương {progress.chapterIndex + 1}
                {progress.deviceName ? ` · cập nhật từ ${progress.deviceName}` : ''}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-start gap-2.5">
            {story.chapters.length > 0 && (
              <button
                onClick={() => onPlayChapter(resumeIndex)}
                className="col-span-2 sm:col-span-1 min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-700 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>{progress ? `Nghe tiếp Ch. ${resumeIndex + 1}` : 'Nghe từ đầu'}</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Thêm chương</span>
            </button>
            {story.chapters.length > 0 && !allOffline && (
              <button
                onClick={onDownloadAllOffline}
                disabled={isDownloadingAll || !isOnline}
                className="min-h-[44px] px-3.5 sm:px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-blue-500/20 disabled:opacity-50 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloadingAll ? downloadProgressText || 'Đang tải…' : 'Tải cả truyện'}</span>
              </button>
            )}
            {story.chapters.length > 0 && (
              <button
                onClick={onOpenAddToPlaylist}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>Thêm vào DS phát</span>
              </button>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Đổi bìa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Danh sách chương
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ .docx, .txt, .mp3, .m4a, .wav
            </span>
          </div>
          {story.chapters.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAutoSortChapters}
                title="Tự động sắp xếp theo số chương (Chương 1 → Chương 2 → Chương 3)"
                className="min-h-[36px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sắp xếp 1→2→3</span>
              </button>
              <button
                type="button"
                onClick={() => setReorderMode((v) => !v)}
                className={`min-h-[36px] px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  reorderMode
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1d24] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{reorderMode ? 'Xong' : 'Đổi vị trí'}</span>
              </button>
            </div>
          )}
        </div>

        {story.chapters.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Truyện chưa có chương nào. Chọn nhiều file .docx, .txt hoặc file âm thanh cùng lúc
              để nhập hàng loạt vào bộ nhớ ngoại tuyến.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Chọn file chương</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {story.chapters.map((ch, idx) => {
              const isCurrent = activeChapterIndex === idx;
              const unavailableOffline = !ch.downloadedOffline && !isOnline;
              const isEditing = editingIdx === idx;

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    if (!unavailableOffline && !isEditing && !reorderMode) {
                      onPlayChapter(idx);
                    }
                  }}
                  className={`p-3.5 sm:px-4 flex items-center gap-3 transition-colors ${
                    unavailableOffline && !isEditing && !reorderMode
                      ? 'opacity-55 cursor-not-allowed'
                      : isEditing || reorderMode
                        ? ''
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                  } ${isCurrent ? 'bg-blue-500/8 dark:bg-blue-500/12' : ''}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isCurrent && isPlaying ? <Volume2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        onSubmit={handleSaveRename}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          maxLength={200}
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder="Nhập tên chương…"
                          className="flex-1 min-w-0 min-h-[38px] px-2.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-blue-500/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                        <button
                          type="submit"
                          disabled={savingRename || !editingTitle.trim()}
                          title="Lưu tên chương"
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIdx(null);
                            setEditingTitle('');
                          }}
                          title="Hủy đổi tên"
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {ch.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                          <span>
                            {ch.hasAudioBlob
                              ? 'File âm thanh'
                              : `~${estimateMinutes(ch.charCount)} phút`}
                          </span>
                          <span aria-hidden="true">·</span>
                          {ch.downloadedOffline ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Offline ({formatBytes(ch.sizeBytes)})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <CloudOff className="w-3 h-3" />
                              <span>Chưa tải offline</span>
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {reorderMode ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onMoveChapter(idx, -1)}
                            disabled={idx === 0}
                            title="Di chuyển lên"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveChapter(idx, 1)}
                            disabled={idx === story.chapters.length - 1}
                            title="Di chuyển xuống"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startRename(idx, ch.title)}
                            title="Đổi tên chương"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {!ch.downloadedOffline && (
                            <button
                              onClick={() => onDownloadSingleChapter(idx)}
                              disabled={!isOnline}
                              title="Tải xuống nghe ngoại tuyến"
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {ch.downloadedOffline && story.syncedAt && (
                            <button
                              onClick={() => onRemoveChapterOffline(idx)}
                              title="Gỡ bản tải ngoại tuyến (giữ trên mây)"
                              className="min-h-[40px] px-2 rounded-lg text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer hidden sm:inline-flex items-center"
                            >
                              Gỡ offline
                            </button>
                          )}
                          <button
                            onClick={() => startRename(idx, ch.title)}
                            title="Đổi tên chương"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onPlayChapter(idx)}
                            disabled={unavailableOffline}
                            title="Phát chương"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteChapter(idx)}
                            title="Xóa chương"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Related Stories by Genre */}
      <section aria-label="Truyện cùng thể loại" className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Truyện cùng thể loại
            </h3>
            {currentGenre && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium">
                <Tag className="w-3 h-3" />
                <span>{currentGenre}</span>
              </span>
            )}
          </div>
          {sameGenreStories.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {sameGenreStories.length} truyện
            </span>
          )}
        </div>

        {!currentGenre ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Truyện này chưa được phân loại thể loại. Hãy gắn thể loại để xem gợi ý truyện tương tự.
            </p>
            <button
              type="button"
              onClick={openGenreEditor}
              className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Chọn thể loại
            </button>
          </div>
        ) : sameGenreStories.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Chưa có truyện nào khác thuộc thể loại “{currentGenre}” trong thư viện của bạn.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sameGenreStories.map((rel) => {
              const relTotalCh = rel.chapters.length;
              const relOfflineCh = rel.chapters.filter((c) => c.downloadedOffline).length;
              const relProg = progressMap[rel.id];
              const relChapterNum = relProg
                ? Math.min(relProg.chapterIndex + 1, Math.max(1, relTotalCh))
                : 0;
              return (
                <div
                  key={rel.id}
                  onClick={() => onOpenStory(rel.id)}
                  className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-3.5 flex items-center gap-3 hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <StoryCover
                    title={rel.title}
                    cover={rel.cover}
                    className="w-14 h-20 rounded-xl shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                    {rel.author && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {rel.author}
                      </p>
                    )}
                    <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span>{relTotalCh} chương</span>
                      {relOfflineCh > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            {relOfflineCh === relTotalCh ? 'Offline' : `${relOfflineCh}/${relTotalCh}`}
                          </span>
                        </>
                      )}
                      {relProg && relTotalCh > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Ch. {relChapterNum}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.txt,.md,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onAddChapters(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpdateCover(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};
