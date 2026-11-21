import React, { useState } from 'react';
import { ListPlus, Plus, X } from 'lucide-react';
import type { Playlist, Story } from '@/src/types';

interface Props {
  story: Story;
  chapterIndex?: number;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, chapterIndices: number[]) => Promise<void>;
  onCreatePlaylistWithItems: (name: string, chapterIndices: number[]) => Promise<void>;
}

export const AddToPlaylistModal: React.FC<Props> = ({
  story,
  chapterIndex,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreatePlaylistWithItems,
}) => {
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const targetIndices =
    chapterIndex !== undefined
      ? [chapterIndex]
      : story.chapters.map((_, i) => i);

  const label =
    chapterIndex !== undefined
      ? story.chapters[chapterIndex]?.title || `Chương ${chapterIndex + 1}`
      : `Toàn bộ ${story.chapters.length} chương của “${story.title}”`;

  const handlePick = async (playlistId: string) => {
    setBusy(true);
    try {
      await onAddToPlaylist(playlistId, targetIndices);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    setBusy(true);
    try {
      await onCreatePlaylistWithItems(newName.trim(), targetIndices);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Thêm vào danh sách phát
          </h3>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
          Nội dung: {label}
        </p>

        {playlists.length > 0 && (
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                disabled={busy}
                onClick={() => handlePick(pl.id)}
                className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {pl.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {pl.items.length} mục
                  </div>
                </div>
                <ListPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Hoặc tạo danh sách phát mới
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ví dụ: Nghe trước khi ngủ"
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              disabled={!newName.trim() || busy}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
