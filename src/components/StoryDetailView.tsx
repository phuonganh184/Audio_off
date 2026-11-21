import React, { useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Download,
  FilePlus2,
  Headphones,
  Image as ImageIcon,
  ListPlus,
  Play,
  Trash2,
  Volume2,
} from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import { formatBytes } from '@/src/lib/localDb';
import { estimateMinutes } from '@/src/lib/parsers';
import type { ListeningProgress, Story } from '@/src/types';

interface Props {
  story: Story;
  progress?: ListeningProgress;
  activeChapterIndex: number | null;
  isPlaying: boolean;
  isOnline: boolean;
  isDownloadingAll: boolean;
  downloadProgressText: string;
  onBack: () => void;
  onPlayChapter: (chapterIndex: number) => void;
  onAddChapters: (files: FileList) => Promise<void>;
  onUpdateCover: (file: File) => Promise<void>;
  onDeleteChapter: (chapterIndex: number) => void;
  onDeleteStory: () => void;
  onDownloadAllOffline: () => Promise<void>;
  onDownloadSingleChapter: (chapterIndex: number) => Promise<void>;
  onRemoveChapterOffline: (chapterIndex: number) => Promise<void>;
  onOpenAddToPlaylist: (chapterIndex?: number) => void;
}

export const StoryDetailView: React.FC<Props> = ({
  story,
  progress,
  activeChapterIndex,
  isPlaying,
  isOnline,
  isDownloadingAll,
  downloadProgressText,
  onBack,
  onPlayChapter,
  onAddChapters,
  onUpdateCover,
  onDeleteChapter,
  onDeleteStory,
  onDownloadAllOffline,
  onDownloadSingleChapter,
  onRemoveChapterOffline,
  onOpenAddToPlaylist,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const offlineCount = story.chapters.filter((c) => c.downloadedOffline).length;
  const totalBytes = story.chapters.reduce(
    (sum, c) => sum + (c.downloadedOffline ? c.sizeBytes : 0),
    0
  );
  const allOffline = story.chapters.length > 0 && offlineCount === story.chapters.length;
  const resumeIndex = progress
    ? Math.min(progress.chapterIndex, Math.max(0, story.chapters.length - 1))
    : 0;

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

          <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2.5">
            {story.chapters.length > 0 && (
              <button
                onClick={() => onPlayChapter(resumeIndex)}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>{progress ? `Nghe tiếp Ch. ${resumeIndex + 1}` : 'Nghe từ đầu'}</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318] text-slate-800 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Thêm chương</span>
            </button>
            {story.chapters.length > 0 && !allOffline && (
              <button
                onClick={onDownloadAllOffline}
                disabled={isDownloadingAll || !isOnline}
                className="min-h-[44px] px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-500/20 disabled:opacity-50 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloadingAll ? downloadProgressText || 'Đang tải…' : 'Tải cả truyện'}</span>
              </button>
            )}
            {story.chapters.length > 0 && (
              <button
                onClick={() => onOpenAddToPlaylist(undefined)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>Thêm vào DS phát</span>
              </button>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Đổi bìa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Danh sách chương
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Hỗ trợ .docx, .txt, .mp3, .m4a, .wav
          </span>
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

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    if (!unavailableOffline) onPlayChapter(idx);
                  }}
                  className={`p-3.5 sm:px-4 flex items-center gap-3 transition-colors ${
                    unavailableOffline
                      ? 'opacity-55 cursor-not-allowed'
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
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {ch.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums flex items-center gap-1.5 flex-wrap">
                      <span>{ch.hasAudioBlob ? 'File âm thanh' : `~${estimateMinutes(ch.charCount)} phút`}</span>
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
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!ch.downloadedOffline ? (
                      <button
                        onClick={() => onDownloadSingleChapter(idx)}
                        disabled={!isOnline}
                        title="Tải xuống nghe ngoại tuyến"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenAddToPlaylist(idx)}
                        title="Thêm chương vào danh sách phát"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ListPlus className="w-4 h-4" />
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
