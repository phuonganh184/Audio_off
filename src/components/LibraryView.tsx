import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  Headphones,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import { formatBytes } from '@/src/lib/localDb';
import type { ListeningProgress, Story } from '@/src/types';

type FilterMode = 'all' | 'offline' | 'in_progress';

interface Props {
  stories: Story[];
  progressMap: Record<string, ListeningProgress>;
  isOnline: boolean;
  onOpenStory: (storyId: string) => void;
  onResumeStory: (storyId: string) => void;
  onCreateStory: (title: string, author: string, coverFile?: File) => Promise<void>;
  onDeleteStory: (storyId: string) => void;
  onDownloadStoryOffline: (storyId: string) => Promise<void>;
  downloadingStoryId: string | null;
}

export const LibraryView: React.FC<Props> = ({
  stories,
  progressMap,
  isOnline,
  onOpenStory,
  onResumeStory,
  onCreateStory,
  onDeleteStory,
  onDownloadStoryOffline,
  downloadingStoryId,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>(() => (isOnline ? 'all' : 'offline'));
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCover, setNewCover] = useState<File | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  const mostRecentProgress = useMemo(() => {
    let best: ListeningProgress | null = null;
    for (const p of Object.values(progressMap)) {
      if (!best || p.updatedAt > best.updatedAt) {
        best = p;
      }
    }
    if (!best) return null;
    const st = stories.find((s) => s.id === best!.storyId);
    if (!st || st.chapters.length === 0) return null;
    return { story: st, progress: best };
  }, [progressMap, stories]);

  const filteredStories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stories.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q) && !(s.author || '').toLowerCase().includes(q)) {
        return false;
      }
      const downloadedCount = s.chapters.filter((c) => c.downloadedOffline).length;
      if (filter === 'offline') {
        return downloadedCount > 0 || (s.chapters.length === 0 && !s.cloudOnly);
      }
      if (filter === 'in_progress') {
        return !!progressMap[s.id];
      }
      return true;
    });
  }, [stories, search, filter, progressMap]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      await onCreateStory(newTitle.trim(), newAuthor.trim(), newCover);
      setNewTitle('');
      setNewAuthor('');
      setNewCover(undefined);
      setShowNewModal(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Thư viện truyện
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
            {stories.length} truyện ·{' '}
            {stories.filter((s) => s.chapters.some((c) => c.downloadedOffline)).length} sẵn sàng
            ngoại tuyến
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Truyện mới</span>
        </button>
      </div>

      {/* Continue Listening Banner */}
      {mostRecentProgress && (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
          <StoryCover
            title={mostRecentProgress.story.title}
            cover={mostRecentProgress.story.cover}
            className="w-16 h-20 rounded-xl shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Nghe tiếp gần đây
              {mostRecentProgress.progress.deviceName
                ? ` · từ ${mostRecentProgress.progress.deviceName}`
                : ''}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
              {mostRecentProgress.story.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5 tabular-nums">
              Chương {mostRecentProgress.progress.chapterIndex + 1}/
              {mostRecentProgress.story.chapters.length}
              {mostRecentProgress.progress.chapterTitle
                ? ` · ${mostRecentProgress.progress.chapterTitle}`
                : ''}
            </p>
          </div>
          <button
            onClick={() => onResumeStory(mostRecentProgress.story.id)}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
            <span>Nghe tiếp</span>
          </button>
        </div>
      )}

      {/* Search & Segmented Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên truyện hoặc tác giả…"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'offline', label: 'Ngoại tuyến' },
              { id: 'in_progress', label: 'Đang nghe' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Story Grid */}
      {filteredStories.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-10 text-center">
          <Headphones className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {stories.length === 0
              ? 'Thư viện của bạn chưa có truyện'
              : 'Không tìm thấy truyện phù hợp'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {stories.length === 0
              ? 'Bấm “Truyện mới”, đặt tên rồi thêm từng chương bằng file .docx, .txt hoặc file âm thanh (.mp3, .m4a) để nghe mọi lúc ngay cả khi tắt màn hình.'
              : 'Thử đổi bộ lọc sang “Tất cả” hoặc nhập từ khóa tìm kiếm khác.'}
          </p>
          {stories.length === 0 && (
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-5 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo truyện đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStories.map((s) => {
            const totalCh = s.chapters.length;
            const offlineCh = s.chapters.filter((c) => c.downloadedOffline).length;
            const allOffline = totalCh > 0 && offlineCh === totalCh;
            const prog = progressMap[s.id];
            const totalBytes = s.chapters.reduce((acc, c) => acc + (c.downloadedOffline ? c.sizeBytes : 0), 0);
            const isDownloading = downloadingStoryId === s.id;

            return (
              <div
                key={s.id}
                onClick={() => onOpenStory(s.id)}
                className="group rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-4 flex gap-3.5 hover:border-blue-500/60 transition-colors cursor-pointer"
              >
                <StoryCover
                  title={s.title}
                  cover={s.cover}
                  className="w-20 h-28 rounded-xl shrink-0"
                />
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {s.title}
                    </h3>
                    {s.author && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {s.author}
                      </p>
                    )}
                    <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>{totalCh} chương</span>
                      {prog && totalCh > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Đang nghe ch. {prog.chapterIndex + 1}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {allOffline ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Ngoại tuyến ({formatBytes(totalBytes)})</span>
                        </span>
                      ) : offlineCh > 0 ? (
                        <span>
                          Đã tải {offlineCh}/{totalCh} · {formatBytes(totalBytes)}
                        </span>
                      ) : totalCh > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Cloud className="w-3.5 h-3.5 shrink-0" />
                          <span>Chỉ trên mây</span>
                        </span>
                      ) : (
                        <span>Chưa có chương</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {!allOffline && totalCh > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadStoryOffline(s.id);
                        }}
                        disabled={isDownloading || !isOnline}
                        className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 disabled:opacity-45 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isDownloading ? 'Đang tải…' : 'Tải offline'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {totalCh > 0 ? 'Mở nghe ngay' : 'Thêm chương'}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteStory(s.id);
                      }}
                      aria-label={`Xóa ${s.title}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Story Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Tạo truyện mới
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tên truyện
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Đấu Phá Thương Khung"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Tác giả (không bắt buộc)
              </label>
              <input
                type="text"
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                placeholder="Ví dụ: Thiên Tàm Thổ Đậu"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Ảnh bìa (không bắt buộc)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewCover(e.target.files?.[0])}
                className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 file:font-medium cursor-pointer"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sau khi tạo truyện, bạn có thể chọn nhiều file .docx, .txt hoặc file âm thanh (.mp3,
              .m4a) để lưu trữ trực tiếp trên máy.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Đang tạo…' : 'Tạo truyện'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
