import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Cloud, DownloadCloud, LogOut, Mail, MapPin, UploadCloud, X } from 'lucide-react';
import { backupLocalCatCards } from '../../lib/cloudBackup';
import { restoreCloudCatCards } from '../../lib/cloudRestore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCloudBackupStatusStore } from '../../store/useCloudBackupStatusStore';
import { useScrapbookStore, type ScrapbookItem } from '../../store/useScrapbookStore';

type CloudBackupPromptProps = {
  language: 'zh' | 'en';
  items: ScrapbookItem[];
  autoOpenOnSignedInEmptyDevice?: boolean;
  redirectTo?: string;
};

type BackupStatus = 'idle' | 'backing_up' | 'success' | 'error';
type RestoreStatus = 'idle' | 'restoring' | 'success' | 'error';

const copy = {
  zh: {
    cta: '備份我的貓咪地圖',
    signedInCta: '查看備份狀態',
    localCount: (count: number) => `${count} 隻貓目前保存在這台裝置`,
    signedInHint: '已登入，之後可以同步你的貓咪地圖。',
    autoBackupInProgress: '正在備份剛新增的貓',
    autoBackupSuccess: (count: number) => `剛剛已備份 ${count} 隻貓`,
    autoBackupError: '剛剛備份失敗，點開可重試',
    autoBackupPending: (count: number) => `${count} 隻貓待備份，手機內資料不受影響`,
    title: '備份我的貓咪地圖',
    subtitle: '用 Email 登入後，之後可以把貓卡、地點與備註保存到雲端。',
    notConfiguredTitle: '雲端備份尚未啟用',
    notConfiguredBody: '現在仍可繼續用本機保存貓卡；設定好雲端後，這裡會開啟 Email 登入與備份。',
    notConfiguredHint: '不會影響目前手機裡的貓卡。',
    emailPlaceholder: 'your@email.com',
    sendMagicLink: '寄送登入信',
    sending: '寄送中',
    sentTitle: '已寄出登入信',
    sentBody: '請不要離開這個 App。到信箱看 6 位數驗證碼，回到這裡輸入完成登入。',
    otpLabel: 'Email 驗證碼',
    otpPlaceholder: '123456',
    verifyOtp: '驗證並登入',
    verifyingOtp: '驗證中',
    otpVerified: '驗證完成，正在保留這台裝置上的貓卡。',
    otpFailed: '驗證碼無法使用，請確認是否過期，或重新寄送登入信。',
    resendEmail: '重新寄送登入信',
    signInFailed: '登入信寄送失敗，請稍後再試。',
    signInFailedDetail: (message: string) => `登入信寄送失敗：${message}`,
    signInFailedNetwork: '登入信寄送失敗：雲端設定或網路無法連線，請稍後再試。',
    signedInTitle: '已登入',
    emptyDeviceRestoreHint: '這台裝置目前沒有貓咪；如果你之前備份過，可以先恢復雲端貓咪。',
    emptyDeviceSeparateStorageWarning: '如果你是從 Email 連結打開瀏覽器看到空白，原本的貓卡大多還在手機桌面版 App 裡。請先回到原本的 App 再登入備份，不要在這個空白視窗新增或備份。',
    localRescue: '打開本機貓卡救援',
    backupNow: '立即備份',
    retryBackup: '再試一次',
    backingUp: '備份中',
    backedUp: (count: number) => `已備份 ${count} 隻貓`,
    openMapToPublish: '去我的地圖公開貓點',
    backupFailed: '備份失敗，請稍後再試。',
    backupFailedDetail: (message: string) => `備份失敗：${message}`,
    backupCloudUnavailable: (count: number) => `雲端目前連不上，${count} 隻貓仍安全保存在這台手機。等雲端恢復後可以再試一次。`,
    restoreNow: '恢復雲端貓咪',
    restoring: '恢復中',
    restored: (count: number) => `已恢復 ${count} 隻貓`,
    restoreFailed: '恢復失敗，請稍後再試。',
    openSharedMap: '去全世界地圖',
    openSharedMapHint: '看看大家公開的貓點，也可以從我的地圖公開你遇到的貓。',
    signOut: '登出',
    close: '關閉備份視窗',
  },
  en: {
    cta: 'Back Up My Cat Map',
    signedInCta: 'View Backup Status',
    localCount: (count: number) => `${count} cats are saved on this device`,
    signedInHint: 'Signed in. Your cat map can sync later.',
    autoBackupInProgress: 'Backing up the cat you just added',
    autoBackupSuccess: (count: number) => `Just backed up ${count} cat${count === 1 ? '' : 's'}`,
    autoBackupError: 'Last backup failed. Open to retry',
    autoBackupPending: (count: number) => `${count} cat${count === 1 ? '' : 's'} waiting to back up. Local data is safe.`,
    title: 'Back Up My Cat Map',
    subtitle: 'Sign in with email so cat cards, places, and notes can be saved to the cloud later.',
    notConfiguredTitle: 'Cloud backup is not enabled yet',
    notConfiguredBody: 'You can keep saving cat cards locally. Once cloud is configured, email sign-in and backup will open here.',
    notConfiguredHint: 'This will not affect the cat cards already on this device.',
    emailPlaceholder: 'your@email.com',
    sendMagicLink: 'Send Sign-In Link',
    sending: 'Sending',
    sentTitle: 'Sign-in link sent',
    sentBody: 'Stay in this app. Check your email for the 6-digit code, then enter it here to sign in.',
    otpLabel: 'Email verification code',
    otpPlaceholder: '123456',
    verifyOtp: 'Verify and Sign In',
    verifyingOtp: 'Verifying',
    otpVerified: 'Verified. Keeping the cat cards saved on this device.',
    otpFailed: 'The code could not be verified. Check if it expired, or send a new sign-in email.',
    resendEmail: 'Send a New Sign-In Email',
    signInFailed: 'Could not send the sign-in link. Please try again later.',
    signInFailedDetail: (message: string) => `Could not send the sign-in email: ${message}`,
    signInFailedNetwork: 'Could not send the sign-in link: cloud setup or network is unreachable. Please try again later.',
    signedInTitle: 'Signed in',
    emptyDeviceRestoreHint: 'This device has no cats yet. If you backed up before, restore your cloud cats first.',
    emptyDeviceSeparateStorageWarning: 'If an email link opened a blank browser view, your original cat cards are probably still inside the installed home-screen app. Go back to that app before signing in or backing up; do not add or back up from this blank window.',
    localRescue: 'Open Local Cat Rescue',
    backupNow: 'Back Up Now',
    retryBackup: 'Try Again',
    backingUp: 'Backing Up',
    backedUp: (count: number) => `Backed up ${count} cat${count === 1 ? '' : 's'}`,
    openMapToPublish: 'Open My Map to Publish Cats',
    backupFailed: 'Backup failed. Please try again later.',
    backupFailedDetail: (message: string) => `Backup failed: ${message}`,
    backupCloudUnavailable: (count: number) => `Cloud is unreachable right now. ${count} cat${count === 1 ? ' is' : 's are'} still safe on this device. Try again after cloud service is restored.`,
    restoreNow: 'Restore Cloud Cats',
    restoring: 'Restoring',
    restored: (count: number) => `Restored ${count} cat${count === 1 ? '' : 's'}`,
    restoreFailed: 'Restore failed. Please try again later.',
    openSharedMap: 'Open World Map',
    openSharedMapHint: 'Explore public cat spots, or publish your own cats from My Map.',
    signOut: 'Sign Out',
    close: 'Close backup panel',
  },
};

export default function CloudBackupPrompt({
  language,
  items,
  autoOpenOnSignedInEmptyDevice = false,
  redirectTo,
}: CloudBackupPromptProps) {
  const t = copy[language];
  const user = useAuthStore((state) => state.user);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const verifyEmailOtp = useAuthStore((state) => state.verifyEmailOtp);
  const signOut = useAuthStore((state) => state.signOut);
  const latestBackupStatus = useCloudBackupStatusStore((state) => state.status);
  const latestBackedUpCount = useCloudBackupStatusStore((state) => state.backedUpCount);
  const latestPendingCount = useCloudBackupStatusStore((state) => state.pendingCount);
  const latestBackupMessage = useCloudBackupStatusStore((state) => state.message);
  const markBackingUp = useCloudBackupStatusStore((state) => state.markBackingUp);
  const markSuccess = useCloudBackupStatusStore((state) => state.markSuccess);
  const markError = useCloudBackupStatusStore((state) => state.markError);
  const mergeRestoredItems = useScrapbookStore((state) => state.mergeRestoredItems);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
  const [backedUpCount, setBackedUpCount] = useState(0);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('idle');
  const [restoredCount, setRestoredCount] = useState(0);
  const hasAutoOpenedRef = useRef(false);
  const canUsePortal = typeof document !== 'undefined';

  const isSignedIn = Boolean(user);
  const userEmail = user?.email;
  const catCount = items.length;
  const signedInButtonHint = latestBackupStatus === 'backing_up'
    ? t.autoBackupInProgress
    : latestBackupStatus === 'success'
      ? t.autoBackupSuccess(latestBackedUpCount)
      : latestBackupStatus === 'error'
        ? latestPendingCount > 0
          ? t.autoBackupPending(latestPendingCount)
          : t.autoBackupError
        : t.signedInHint;
  const signInErrorMessage = errorMessage?.toLowerCase().includes('fetch')
    || errorMessage?.toLowerCase().includes('network')
    || errorMessage?.toLowerCase().includes('failed to fetch')
    ? t.signInFailedNetwork
    : errorMessage
      ? t.signInFailedDetail(errorMessage)
      : t.signInFailed;
  const backupErrorLooksLikeUnavailable = latestBackupMessage?.toLowerCase().includes('fetch')
    || latestBackupMessage?.toLowerCase().includes('network')
    || latestBackupMessage?.toLowerCase().includes('failed to fetch');
  const backupErrorMessage = backupErrorLooksLikeUnavailable && latestPendingCount > 0
    ? t.backupCloudUnavailable(latestPendingCount)
    : latestBackupMessage
      ? t.backupFailedDetail(latestBackupMessage)
      : t.backupFailed;

  useEffect(() => {
    if (
      !autoOpenOnSignedInEmptyDevice ||
      hasAutoOpenedRef.current ||
      !isConfigured ||
      isLoading ||
      !isSignedIn ||
      catCount > 0
    ) {
      return;
    }

    hasAutoOpenedRef.current = true;
    setIsOpen(true);
  }, [autoOpenOnSignedInEmptyDevice, catCount, isConfigured, isLoading, isSignedIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured || isLoading) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    await signInWithEmail(normalizedEmail, {
      redirectTo: redirectTo ?? window.location.href,
    });
    if (!useAuthStore.getState().error) {
      setSentEmail(normalizedEmail);
      setIsSent(true);
      setIsOtpVerified(false);
      setOtp('');
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured || isLoading) return;

    const normalizedOtp = otp.trim();
    if (!sentEmail || !normalizedOtp) return;

    await verifyEmailOtp(sentEmail, normalizedOtp);
    if (!useAuthStore.getState().error) {
      setIsOtpVerified(true);
    }
  };

  const handleResend = () => {
    setIsSent(false);
    setIsOtpVerified(false);
    setOtp('');
  };

  const handleBackup = async () => {
    if (backupStatus === 'backing_up') return;

    setBackupStatus('backing_up');
    markBackingUp();
    const result = await backupLocalCatCards({
      ownerId: user?.id ?? null,
      items,
    });

    if (result.ok) {
      setBackedUpCount(result.backedUpCount);
      setBackupStatus('success');
      markSuccess(result.backedUpCount);
      return;
    }

    if (result.ok === false) {
      setBackupStatus('error');
      markError({
        message: result.message,
        pendingCount: items.length,
      });
    }
  };

  const handleRestore = async () => {
    if (restoreStatus === 'restoring') return;

    setRestoreStatus('restoring');
    const result = await restoreCloudCatCards({
      ownerId: user?.id ?? null,
    });

    if (!result.ok) {
      setRestoreStatus('error');
      return;
    }

    const addedCount = await mergeRestoredItems(result.items);
    setRestoredCount(addedCount);
    setRestoreStatus('success');
  };

  const dialog = isOpen ? (
    <div className="fixed inset-0 z-[260] isolate flex items-end justify-center bg-[#1d1714]/36 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="w-full max-w-md rounded-t-[28px] border-2 border-[#1d1714] bg-[#fff7e8] p-4 text-[#1d1714] shadow-[0_-10px_36px_rgba(29,23,20,0.22)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
              FOUND CAT CLOUD
            </p>
            <h2 className="mt-1 text-lg font-black leading-tight">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={t.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#1d1714] bg-[#fffdf2] shadow-[2px_2px_0_rgba(29,23,20,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
          >
            <X size={18} strokeWidth={2.7} aria-hidden="true" />
          </button>
        </div>

        {isSignedIn ? (
          <div className="mt-4 rounded-[20px] border-2 border-[#1d1714]/70 bg-[#fffdf2] p-4 shadow-[4px_4px_0_rgba(47,95,179,0.18)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} strokeWidth={2.7} className="text-[#2f5fb3]" aria-hidden="true" />
              <div>
                <p className="text-sm font-black">{t.signedInTitle}</p>
                {userEmail ? <p className="text-xs font-bold text-[#6d5f52]">{userEmail}</p> : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleBackup()}
                disabled={backupStatus === 'backing_up'}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-[#1d1714] bg-[#2f5fb3] px-4 text-xs font-black text-[#fffdf2] shadow-[3px_3px_0_rgba(29,23,20,0.72)] disabled:cursor-wait disabled:bg-[#8fa7d6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <UploadCloud size={14} strokeWidth={2.7} aria-hidden="true" />
                {backupStatus === 'backing_up'
                  ? t.backingUp
                  : backupStatus === 'error'
                    ? t.retryBackup
                    : t.backupNow}
              </button>
              <button
                type="button"
                onClick={() => void handleRestore()}
                disabled={restoreStatus === 'restoring'}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-[#1d1714] bg-[#fff2cf] px-4 text-xs font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.72)] disabled:cursor-wait disabled:bg-[#d7d1c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <DownloadCloud size={14} strokeWidth={2.7} aria-hidden="true" />
                {restoreStatus === 'restoring' ? t.restoring : t.restoreNow}
              </button>
            </div>
            {catCount === 0 ? (
              <div className="mt-3 space-y-2">
                <p className="rounded-[14px] border border-[#2f5fb3]/30 bg-[#d9ecff]/65 px-3 py-2 text-xs font-black leading-5 text-[#2f5fb3]">
                  {t.emptyDeviceRestoreHint}
                </p>
                <p className="rounded-[14px] border border-[#9f3a2f]/20 bg-[#fff2cf]/80 px-3 py-2 text-xs font-black leading-5 text-[#7f3b2d]">
                  {t.emptyDeviceSeparateStorageWarning}
                </p>
                <a
                  href="/rescue"
                  className="inline-flex min-h-9 items-center justify-center rounded-full border-2 border-[#1d1714] bg-[#fffdf2] px-4 text-[11px] font-black text-[#2f5fb3] shadow-[3px_3px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  {t.localRescue}
                </a>
              </div>
            ) : null}
            <a
              href="/map?mode=public"
              aria-label={t.openSharedMap}
              className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-[16px] border border-[#1d1714]/18 bg-[#d9ecff]/70 px-3 py-2 text-left shadow-[2px_2px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            >
              <span className="min-w-0">
                <span className="block text-xs font-black text-[#1d1714]">{t.openSharedMap}</span>
                <span className="mt-0.5 block text-[11px] font-bold leading-4 text-[#6d5f52]">{t.openSharedMapHint}</span>
              </span>
              <MapPin size={16} strokeWidth={2.7} className="shrink-0 text-[#2f5fb3]" aria-hidden="true" />
            </a>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-[#1d1714]/35 bg-[#fffdf2] px-3 text-[11px] font-black shadow-[2px_2px_0_rgba(29,23,20,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <LogOut size={14} strokeWidth={2.7} aria-hidden="true" />
                {t.signOut}
              </button>
            </div>
            {restoreStatus === 'success' ? (
              <p className="mt-3 text-xs font-black text-[#2f5fb3]">{t.restored(restoredCount)}</p>
            ) : null}
            {restoreStatus === 'error' ? (
              <p className="mt-3 text-xs font-black text-[#9f3a2f]">{t.restoreFailed}</p>
            ) : null}
            {backupStatus === 'success' ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-black text-[#2f5fb3]">{t.backedUp(backedUpCount)}</p>
                <a
                  href="/map"
                  className="inline-flex h-9 items-center justify-center rounded-full border-2 border-[#1d1714] bg-[#fff2cf] px-4 text-[11px] font-black text-[#1d1714] shadow-[3px_3px_0_rgba(47,95,179,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  {t.openMapToPublish}
                </a>
              </div>
            ) : null}
            {backupStatus === 'error' ? (
              <p className="mt-3 text-xs font-black text-[#9f3a2f]">
                {backupErrorMessage}
              </p>
            ) : null}
          </div>
        ) : !isConfigured ? (
          <div className="mt-4 rounded-[20px] border-2 border-[#1d1714]/70 bg-[#fffdf2] p-4 shadow-[4px_4px_0_rgba(247,201,72,0.32)]">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} strokeWidth={2.7} className="mt-0.5 text-[#2f5fb3]" aria-hidden="true" />
              <div>
                <p className="text-sm font-black">{t.notConfiguredTitle}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">{t.notConfiguredBody}</p>
                <p className="mt-2 text-[11px] font-black leading-5 text-[#2f5fb3]">{t.notConfiguredHint}</p>
              </div>
            </div>
          </div>
        ) : isSent ? (
          <form onSubmit={handleOtpSubmit} className="mt-4 rounded-[20px] border-2 border-[#1d1714]/70 bg-[#fffdf2] p-4 shadow-[4px_4px_0_rgba(47,95,179,0.18)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={22} strokeWidth={2.7} className="mt-0.5 text-[#2f5fb3]" aria-hidden="true" />
              <div>
                <p className="text-sm font-black">{t.sentTitle}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">{t.sentBody}</p>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-[#2f5fb3]">
                {t.otpLabel}
              </span>
              <input
                value={otp}
                onChange={(event) => {
                  setIsOtpVerified(false);
                  setOtp(event.target.value.replace(/\s+/g, ''));
                }}
                placeholder={t.otpPlaceholder}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={t.otpLabel}
                className="h-12 w-full rounded-[16px] border-2 border-[#1d1714] bg-[#fffdf2] px-3 text-center text-lg font-black tracking-[0.2em] shadow-[3px_3px_0_rgba(29,23,20,0.55)] outline-none focus:border-[#2f5fb3]"
              />
            </label>
            {error === 'otp_verify_failed' ? (
              <p className="mt-2 text-xs font-black leading-5 text-[#9f3a2f]">{t.otpFailed}</p>
            ) : null}
            {isOtpVerified ? (
              <p className="mt-2 text-xs font-black leading-5 text-[#2f5fb3]">{t.otpVerified}</p>
            ) : null}
            <button
              type="submit"
              disabled={isLoading || !otp.trim()}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#2f5fb3] px-4 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(29,23,20,0.78)] disabled:cursor-not-allowed disabled:bg-[#8fa7d6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            >
              <Mail size={16} strokeWidth={2.7} aria-hidden="true" />
              {isLoading ? t.verifyingOtp : t.verifyOtp}
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="mt-3 w-full text-center text-xs font-black text-[#2f5fb3] underline decoration-[#2f5fb3]/35 underline-offset-4"
            >
              {t.resendEmail}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <p className="text-xs font-bold leading-5 text-[#6d5f52]">{t.subtitle}</p>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-[#2f5fb3]">
                Email
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.emailPlaceholder}
                type="email"
                autoComplete="email"
                className="h-12 w-full rounded-[16px] border-2 border-[#1d1714] bg-[#fffdf2] px-3 text-sm font-bold shadow-[3px_3px_0_rgba(29,23,20,0.55)] outline-none focus:border-[#2f5fb3]"
              />
            </label>
            {error === 'sign_in_failed' ? (
              <p className="mt-2 text-xs font-black text-[#9f3a2f]">{signInErrorMessage}</p>
            ) : null}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#2f5fb3] px-4 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(29,23,20,0.78)] disabled:cursor-not-allowed disabled:bg-[#8fa7d6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            >
              <Mail size={16} strokeWidth={2.7} aria-hidden="true" />
              {isLoading ? t.sending : t.sendMagicLink}
            </button>
          </form>
        )}
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={isSignedIn ? t.signedInCta : t.cta}
        className="mt-3 flex w-full items-center justify-between gap-3 rounded-[18px] border-2 border-[#1d1714]/65 bg-[#fffdf2]/92 px-3 py-2.5 text-left shadow-[4px_4px_0_rgba(47,95,179,0.22)] transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border-2 border-[#1d1714] bg-[#d9ecff] text-[#2f5fb3] shadow-[2px_2px_0_rgba(29,23,20,0.55)]">
          <Cloud size={18} strokeWidth={2.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-black text-[#1d1714]">
            {isSignedIn ? t.signedInCta : t.cta}
          </span>
          <span className="block truncate text-[11px] font-extrabold text-[#6d5f52]">
            {isSignedIn ? signedInButtonHint : t.localCount(catCount)}
          </span>
        </span>
        <span className="rounded-full border border-[#1d1714]/20 bg-[#fff2cf] px-2 py-1 text-[10px] font-black tracking-[0.12em] text-[#2f5fb3]">
          CLOUD
        </span>
      </button>

      {canUsePortal ? createPortal(dialog, document.body) : dialog}
    </>
  );
}
