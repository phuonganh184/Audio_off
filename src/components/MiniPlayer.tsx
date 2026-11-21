import React from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import { StoryCover } from '@/src/components/StoryCover';
import type { Story } from '@/src/types';

interface Props {
  story: Story;
  chapterTitle: string;
  progressPercent: number;
  isPlaying: boolean;
  onExpand: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
}

export const MiniPlayer: React.FC<Props> = ({
  story,
  chapterTitle,
  progressPercent,
  isPlaying,
  onExpand,
  onTogglePlay,
  onNext,
}) => {
  return (
    <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-64 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1a1d24]/95 backdrop-blur-md">
      <div className="h-0.5 w-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-blue-600 transition-all duration-200"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>
      <div
        onClick={onExpand}
        className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3 cursor-pointer"
      >
        <StoryCover
          title={story.title}
          cover={story.cover}
          className="w-9 h-11 rounded-lg shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {chapterTitle}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {story.title}
          </div>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={onNext}
            aria-label="Chương tiếp theo"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
