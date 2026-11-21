import React from 'react';
import {
  CheckCircle2,
  Download,
  HardDrive,
  Headphones,
  Lock,
  Trash2,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import { formatBytes } from '@/src/lib/localDb';
import type { Story } from '@/src/types';

interface Props {
  stories: Story[];
  isOnline: boolean;
  storageStats: {
    usedBytes: number;
    quotaBytes: number;
    offlineChaptersBytes: number;
    offlineChapterCount: number;
  };
  downloadingStoryId: string | null;
  onOpenStory: (storyId: string) => void;
  onDownloadStoryOffline: (storyId: string) => Promise<void>;
  onClearAllOffline: () => Promise<void>;
}

export const OfflineManagerView: React.FC<Props> = ({
  stories,
  isOnline,
  storageStats,
  downloadingStoryId,
  onOpenStory,
  onDownloadStoryOffline,
  onClearAllOffline,
}) => {
  const downloadedStories = stories.filter((s) =>
    s.chapters.some((c) => c.downloadedOffline)
  );
  const cloudPendingStories = stories.filter(
    (s) => s.chapters.length > 0 && s.chapters.some((c) => !c.downloadedOffline)
  );

  const percentUsed =
    storageStats.quotaBytes > 0
      ? Math.min(100, (storageStats.usedBytes / storageStats.quotaBytes) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Trung tâm ngoại tuyến & Bộ nhớ
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Quản lý dữ liệu lưu cục bộ trên máy để nghe mượt khi mất mạng hoặc tắt màn hình
        </p>
      </div>

      {/* Storage Summary Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                Đã lưu {storageStats.offlineChapterCount} chương ngoại tuyến ·{' '}
                {formatBytes(storageStats.offlineChaptersBytes)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                Tổng dung lượng ứng dụng: {formatBytes(storageStats.usedBytes)}
                {storageStats.quotaBytes > 0
                  ? ` / ${formatBytes(storageStats.quotaBytes)} khả dụng`
                  : ''}
              </div>
            </div>
          </div>
          {storageStats.offlineChapterCount > 0 && (
            <button
              onClick={onClearAllOffline}
              className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Dọn bộ nhớ offline</span>
            </button>
          )}
        </div>

        {storageStats.quotaBytes > 0 && (
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${Math.max(2, percentUsed)}%` }}
            />
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Phát khi tắt màn hình:</strong> Khi bấm phát, ứng dụng giữ phiên âm thanh
              nền và hiển thị điều khiển ngoài màn hình khóa.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Headphones className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Mẹo thiết bị di động:</strong> Bạn có thể nhập file .docx để đọc giọng hệ
              thống hoặc nhập thẳng file .mp3 / .m4a để phát như trình nghe nhạc gốc.
            </span>
          </div>
        </div>
      </div>

      {/* Downloaded Offline Ready */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Sẵn sàng nghe ngoại tuyến ({downloadedStories.length})
        </h3>
        {downloadedStories.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500 dark:text-slate-400">
            Chưa có chương nào được lưu ngoại tuyến trên thiết bị này.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {downloadedStories.map((s) => {
              const offCount = s.chapters.filter((c) => c.downloadedOffline).length;
              const bytes = s.chapters.reduce(
                (a, c) => a + (c.downloadedOffline ? c.sizeBytes : 0),
                0
              );
              return (
                <div
                  key={s.id}
                  onClick={() => onOpenStory(s.id)}
                  className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-3.5 flex items-center gap-3.5 hover:border-blue-500/60 cursor-pointer"
                >
                  <StoryCover
                    title={s.title}
                    cover={s.cover}
                    className="w-12 h-16 rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1 tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {offCount}/{s.chapters.length} chương · {formatBytes(bytes)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available on Cloud to Download */}
      {cloudPendingStories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chưa tải đủ ngoại tuyến ({cloudPendingStories.length})
          </h3>
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {cloudPendingStories.map((s) => {
              const offCount = s.chapters.filter((c) => c.downloadedOffline).length;
              return (
                <div key={s.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div
                    onClick={() => onOpenStory(s.id)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      Đã có {offCount}/{s.chapters.length} chương trên máy
                    </div>
                  </div>
                  <button
                    onClick={() => onDownloadStoryOffline(s.id)}
                    disabled={!isOnline || downloadingStoryId === s.id}
                    className="min-h-[40px] px-3.5 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-45 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingStoryId === s.id ? 'Đang tải…' : 'Tải hết'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
