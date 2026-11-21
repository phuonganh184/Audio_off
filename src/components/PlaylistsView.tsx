import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ListMusic,
  Play,
  Plus,
  Repeat,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import type { Playlist, Story } from '@/src/types';

interface Props {
  playlists: Playlist[];
  stories: Story[];
  isOnline: boolean;
  shuffleEnabled: boolean;
  repeatEnabled: boolean;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onCreatePlaylist: (name: string, description: string) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onUpdatePlaylist: (playlist: Playlist) => Promise<void>;
  onPlayPlaylist: (playlistId: string, itemIndex: number) => void;
  onDownloadPlaylistOffline: (playlistId: string) => Promise<void>;
  downloadingPlaylistId: string | null;
}

export const PlaylistsView: React.FC<Props> = ({
  playlists,
  stories,
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
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const selected = playlists.find((p) => p.id === selectedId) || null;

  const storyMap = new Map(stories.map((s) => [s.id, s]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreatePlaylist(name.trim(), desc.trim());
    setName('');
    setDesc('');
    setShowCreate(false);
  };

  const moveItem = async (pl: Playlist, index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= pl.items.length) return;
    const copy = [...pl.items];
    const [removed] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, removed);
    await onUpdatePlaylist({ ...pl, items: copy, updatedAt: Date.now() });
  };

  const removeItem = async (pl: Playlist, index: number) => {
    const copy = pl.items.filter((_, i) => i !== index);
    await onUpdatePlaylist({ ...pl, items: copy, updatedAt: Date.now() });
  };

  if (selected) {
    const offlineReadyCount = selected.items.filter((it) => {
      const st = storyMap.get(it.storyId);
      return !!st?.chapters[it.chapterIndex]?.downloadedOffline;
    }).length;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedId(null)}
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
              {selected.items.length} chương · {offlineReadyCount}/{selected.items.length} sẵn sàng
              ngoại tuyến
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {selected.items.length > 0 && (
              <button
                onClick={() => onPlayPlaylist(selected.id, 0)}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Phát tất cả</span>
              </button>
            )}
            {selected.items.length > offlineReadyCount && (
              <button
                onClick={() => onDownloadPlaylistOffline(selected.id)}
                disabled={!isOnline || downloadingPlaylistId === selected.id}
                className="min-h-[44px] px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-medium inline-flex items-center gap-2 hover:bg-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingPlaylistId === selected.id ? 'Đang tải…' : 'Tải ngoại tuyến tất cả'}
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

        {selected.items.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Danh sách phát đang trống. Hãy mở một truyện trong Thư viện và bấm “Thêm vào DS phát”.
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {selected.items.map((item, idx) => {
              const st = storyMap.get(item.storyId);
              const ch = st?.chapters[item.chapterIndex];
              const readyOffline = !!ch?.downloadedOffline;
              const disabled = !readyOffline && !isOnline;

              return (
                <div
                  key={`${item.storyId}-${item.chapterIndex}-${idx}`}
                  onClick={() => !disabled && onPlayPlaylist(selected.id, idx)}
                  className={`p-3.5 flex items-center gap-3 ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                  }`}
                >
                  <span className="w-7 text-center text-xs font-semibold text-slate-500 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.chapterTitle}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.storyTitle} · {readyOffline ? 'Đã tải ngoại tuyến' : 'Chưa tải offline'}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => moveItem(selected, idx, -1)}
                      disabled={idx === 0}
                      title="Lên"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(selected, idx, 1)}
                      disabled={idx === selected.items.length - 1}
                      title="Xuống"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(selected, idx)}
                      title="Xóa khỏi danh sách"
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
            {playlists.length} danh sách · Sắp xếp thứ tự nghe liên tục & đồng bộ đa thiết bị
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo danh sách mới</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-10 text-center">
          <ListMusic className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Chưa có danh sách phát nào
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Tạo danh sách phát như “Nghe trước khi ngủ” hoặc “Chạy bộ buổi sáng” rồi thêm các
            chương từ nhiều truyện khác nhau để phát liên tục.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo danh sách đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map((pl) => (
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
                    {pl.items.length} chương
                    {pl.description ? ` · ${pl.description}` : ''}
                  </p>
                </div>
              </div>
              {pl.items.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayPlaylist(pl.id, 0);
                  }}
                  aria-label={`Phát ${pl.name}`}
                  className="min-h-[40px] min-w-[40px] rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
                placeholder="Ví dụ: Tuyển chọn các chương hay nhất"
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
    </div>
  );
};
