import React, { useRef, useState } from 'react';
import { type User } from 'firebase/auth';
import {
  AlertCircle,
  Cloud,
  Download,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Mail,
  Monitor,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';
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
  onSignInGoogle: () => Promise<void>;
  onSignInEmail: (email: string, password: string) => Promise<void>;
  onRegisterEmail: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
  onReloadVerification: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
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
  onSignInGoogle,
  onSignInEmail,
  onRegisterEmail,
  onResetPassword,
  onResendVerification,
  onReloadVerification,
  onSignOut,
  onSyncNow,
  onExportBackup,
  onImportBackup,
}) => {
  const { isInstallable, isInstalled, isIOS } = usePWAInstall();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || authBusy) return;
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (authMode === 'login') {
        await onSignInEmail(email.trim(), password);
      } else {
        await onRegisterEmail(email.trim(), password);
      }
      setPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không thể xác thực tài khoản.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setAuthError('Hãy nhập email của bạn vào ô phía trên trước khi bấm quên mật khẩu.');
      return;
    }
    setAuthError(null);
    setAuthBusy(true);
    try {
      await onResetPassword(email.trim());
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không gửi được email đặt lại mật khẩu.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authBusy) return;
    setAuthError(null);
    setAuthBusy(true);
    try {
      await onSignInGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Không đăng nhập được bằng Google.');
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Đồng bộ & Cài đặt ứng dụng
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Đồng bộ tiến trình nghe, thư viện và danh sách phát giữa điện thoại (APK / PWA) & máy tính
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                {!authReady
                  ? 'Đang kiểm tra phiên đăng nhập…'
                  : user
                    ? `Tài khoản: ${user.email || user.displayName}`
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
          !user.emailVerified ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="rounded-xl bg-amber-500/12 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Cần xác minh email để bật đồng bộ đám mây</span>
                </div>
                <p className="leading-relaxed">
                  Hệ thống đã gửi link xác minh tới <strong>{user.email}</strong>. Hãy mở hộp thư
                  (kiểm tra cả thư mục Spam), bấm vào link xác nhận rồi quay lại nhấn nút bên dưới.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={onReloadVerification}
                  disabled={!isOnline}
                  className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  Tôi đã xác minh — Kiểm tra lại
                </button>
                <button
                  onClick={onResendVerification}
                  disabled={!isOnline}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  Gửi lại email xác minh
                </button>
              </div>
            </div>
          ) : (
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
                Tiến trình nghe tự động lưu cục bộ và gửi lên đám mây khi tạm dừng hoặc chuyển
                chương. Đăng nhập cùng tài khoản này trên máy tính và file APK điện thoại để đồng
                bộ mọi lúc.
              </p>
            </div>
          )
        ) : (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Segmented Mode Toggle */}
            <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
                className={`min-h-[38px] px-3 sm:px-4 rounded-lg text-xs font-semibold transition text-center cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Đăng nhập Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
                className={`min-h-[38px] px-3 sm:px-4 rounded-lg text-xs font-semibold transition text-center cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Đăng ký mới
              </button>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@gmail.com"
                    autoComplete="email"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu (tối thiểu 6 ký tự)
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full min-h-[44px] pl-3.5 pr-10 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label="Hiện hoặc ẩn mật khẩu"
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {authError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{authError}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={!isOnline || !authReady || authBusy}
                  className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {authBusy
                      ? 'Đang xử lý…'
                      : authMode === 'login'
                        ? 'Đăng nhập & Đồng bộ'
                        : 'Tạo tài khoản đồng bộ'}
                  </span>
                </button>

                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isOnline || authBusy}
                    className="min-h-[40px] px-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 self-center sm:self-auto cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
            </form>

            {(() => {
              const isCapacitorNative =
                typeof window !== 'undefined' &&
                !!(
                  window as unknown as {
                    Capacitor?: { isNativePlatform?: () => boolean };
                  }
                ).Capacitor?.isNativePlatform?.();

              if (isCapacitorNative) {
                return (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Trong app APK Android, hãy dùng <strong>Email &amp; Mật khẩu</strong> ở trên
                    (chọn tab <strong>Đăng ký mới</strong> nếu đây là lần đầu). Nếu bạn từng đăng
                    nhập bằng Google trên Web với cùng email, bấm <strong>Quên mật khẩu?</strong> để
                    đặt mật khẩu cho tài khoản đó.
                  </div>
                );
              }

              return (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Hoặc đăng nhập nhanh bằng Google (trên trình duyệt Web / PWA):
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={!isOnline || !authReady || authBusy}
                    className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập Google</span>
                  </button>
                </div>
              );
            })()}
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
              className={`min-h-[46px] px-2 sm:px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition cursor-pointer ${
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
            placeholder="Ví dụ: Điện thoại Android"
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Giúp nhận biết tiến trình nghe được đồng bộ từ điện thoại hay máy tính.
          </p>
        </div>

        {!isInstalled && (isInstallable || isIOS) && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Cài đặt thành ứng dụng (PWA)
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mở toàn màn hình từ màn hình chính và hoạt động hoàn toàn ngoại tuyến.
              </div>
            </div>
            <PWAInstallButton />
          </div>
        )}
      </div>
      {/* Offline Backup Export / Import */}
      <div className="rounded-2xl bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Sao lưu &amp; Chuyển dữ liệu giữa các máy
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            Xuất toàn bộ truyện chữ, danh sách phát và tiến trình nghe ra file <code>.json</code> để
            gửi qua Zalo/Drive rồi nhập vào điện thoại (APK) hoặc máy tính mà không cần đăng nhập.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={backupBusy}
            onClick={async () => {
              setBackupBusy(true);
              try {
                await onExportBackup();
              } finally {
                setBackupBusy(false);
              }
            }}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Xuất file sao lưu (.json)</span>
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => backupInputRef.current?.click()}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Nhập từ file sao lưu</span>
          </button>
        </div>
        <input
          ref={backupInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBackupBusy(true);
            try {
              await onImportBackup(file);
            } finally {
              setBackupBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
};
