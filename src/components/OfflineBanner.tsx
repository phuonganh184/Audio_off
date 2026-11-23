import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';

interface Props {
  pendingSyncCount: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  quotaExceeded?: boolean;
}

export const OfflineBanner: React.FC<Props> = ({
  pendingSyncCount,
  onSyncNow,
  isSyncing,
  quotaExceeded,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingSyncCount === 0 && !quotaExceeded) return null;

  if (!isOnline) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-amber-500/12 border border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="truncate font-medium">
            Chế độ ngoại tuyến — Đang dùng dữ liệu lưu trên máy
          </span>
        </div>
        {pendingSyncCount > 0 && (
          <span className="text-xs font-medium tabular-nums shrink-0 opacity-85">
            {pendingSyncCount} chờ đồng bộ
          </span>
        )}
      </div>
    );
  }

  if (quotaExceeded) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/12 border border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-medium leading-snug">
            Đã đạt hạn mức ghi Firestore miễn phí hôm nay — Dữ liệu vẫn được lưu an toàn trên máy và sẽ đồng bộ lại vào ngày mai.
          </span>
        </div>
        {onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isSyncing ? 'Đang thử lại…' : 'Thử đồng bộ lại'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-blue-500/10 border border-blue-500/25 px-4 py-2.5 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="truncate font-medium">
          Đã có mạng trở lại · {pendingSyncCount} thay đổi ngoại tuyến chờ đồng bộ
        </span>
      </div>
      {onSyncNow && (
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isSyncing ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
        </button>
      )}
    </div>
  );
};
