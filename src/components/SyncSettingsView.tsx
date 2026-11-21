import React from 'react';
import { type User } from 'firebase/auth';
import {
  Cloud,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
} from 'lucide-react';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import type { ThemeMode } from '@/src/types';

interface Props {
  user: User | null;
  authReady: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncStatusText: string;
  lastSyncedAt: number | null;
  pendingSyncCount: number;
  theme: ThemeMode;
  deviceName: string;
  onChangeTheme: (mode: ThemeMode) => void;
  onChangeDeviceName: (name: string) => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
}

export const SyncSettingsView: React.FC<Props> = ({
  user,
  authReady,
  isOnline,
  isSyncing,
  syncStatusText,
  lastSyncedAt,
  pendingSyncCount,
  theme,
  deviceName,
  onChangeTheme,
  onChangeDeviceName,
  onSignIn,
  onSignOut,
  onSyncNow,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Đồng bộ & Cài đặt ứng dụng
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Đồng bộ tiến trình nghe, thư viện và danh sách phát giữa điện thoại & máy tính
        </p>
      </div>

      {/* Cloud Sync Card */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Đồng bộ đa thiết bị (Cloud)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {!authReady
                  ? 'Đang kiểm tra phiên đăng nhập…'
                  : user
                    ? `Đã đăng nhập: ${user.email || user.displayName}`
                    : 'Chưa đăng nhập — Dữ liệu hiện chỉ lưu cục bộ trên máy này'}
              </p>
            </div>
          </div>

          {authReady && user && (
            <button
              onClick={onSignOut}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>

        {user ? (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                {syncStatusText ||
                  (lastSyncedAt
                    ? `Lần đồng bộ gần nhất: ${new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}`
                    : 'Sẵn sàng đồng bộ')}
                {pendingSyncCount > 0 ? ` · ${pendingSyncCount} thay đổi chờ gửi` : ''}
              </div>
              <button
                onClick={onSyncNow}
                disabled={isSyncing || !isOnline}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tiến trình nghe của bạn tự động lưu cục bộ và gửi lên đám mây mỗi khi tạm dừng hoặc
              chuyển chương. Trên thiết bị khác, đăng nhập cùng tài khoản Google để nhận danh sách
              truyện và tiếp tục nghe đúng vị trí đang dở.
            </p>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Đăng nhập Google để sao lưu thư viện truyện, danh sách phát và vị trí đang nghe giữa
              các máy.
            </p>
            <button
              onClick={onSignIn}
              disabled={!isOnline || !authReady}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Theme Mode */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Giao diện Sáng / Tối
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'light', label: 'Sáng', Icon: Sun },
              { id: 'dark', label: 'Tối', Icon: Moon },
              { id: 'auto', label: 'Hệ thống', Icon: Monitor },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onChangeTheme(id)}
              className={`min-h-[48px] px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                theme === id
                  ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Device Name & PWA Install */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
            <Smartphone className="w-4 h-4 text-slate-500" />
            <span>Tên thiết bị hiện tại</span>
          </label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => onChangeDeviceName(e.target.value)}
            maxLength={40}
            placeholder="Ví dụ: iPhone của tôi"
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Giúp nhận biết tiến trình nghe được đồng bộ từ điện thoại hay máy tính.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Cài đặt thành ứng dụng (PWA)
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mở toàn màn hình từ màn hình chính và hoạt động hoàn toàn ngoại tuyến.
            </div>
          </div>
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};
