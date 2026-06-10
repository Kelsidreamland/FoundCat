import { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, LogOut, Mail, UploadCloud, X } from 'lucide-react';
import { backupLocalCatCards } from '../../lib/cloudBackup';
import { useAuthStore } from '../../store/useAuthStore';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

type CloudBackupPromptProps = {
  language: 'zh' | 'en';
  items: ScrapbookItem[];
};

type BackupStatus = 'idle' | 'backing_up' | 'success' | 'error';

const copy = {
  zh: {
    cta: '備份我的貓咪地圖',
    signedInCta: '查看備份狀態',
    localCount: (count: number) => `${count} 隻貓目前保存在這台裝置`,
    signedInHint: '已登入，之後可以同步你的貓咪地圖。',
    title: '備份我的貓咪地圖',
    subtitle: '用 Email 登入後，之後可以把貓卡、地點與備註保存到雲端。',
    notConfiguredTitle: '雲端備份尚未啟用',
    notConfiguredBody: '現在仍可繼續用本機保存貓卡；設定好雲端後，這裡會開啟 Email 登入與備份。',
    notConfiguredHint: '不會影響目前手機裡的貓卡。',
    emailPlaceholder: 'your@email.com',
    sendMagicLink: '寄送登入信',
    sending: '寄送中',
    sentTitle: '已寄出登入信',
    sentBody: '請到信箱點擊連結，回到 FOUND CAT 後就能繼續備份。',
    signInFailed: '登入信寄送失敗，請稍後再試。',
    signedInTitle: '已登入',
    backupNow: '立即備份',
    retryBackup: '再試一次',
    backingUp: '備份中',
    backedUp: (count: number) => `已備份 ${count} 隻貓`,
    backupFailed: '備份失敗，請稍後再試。',
    signOut: '登出',
    close: '關閉備份視窗',
  },
  en: {
    cta: 'Back Up My Cat Map',
    signedInCta: 'View Backup Status',
    localCount: (count: number) => `${count} cats are saved on this device`,
    signedInHint: 'Signed in. Your cat map can sync later.',
    title: 'Back Up My Cat Map',
    subtitle: 'Sign in with email so cat cards, places, and notes can be saved to the cloud later.',
    notConfiguredTitle: 'Cloud backup is not enabled yet',
    notConfiguredBody: 'You can keep saving cat cards locally. Once cloud is configured, email sign-in and backup will open here.',
    notConfiguredHint: 'This will not affect the cat cards already on this device.',
    emailPlaceholder: 'your@email.com',
    sendMagicLink: 'Send Sign-In Link',
    sending: 'Sending',
    sentTitle: 'Sign-in link sent',
    sentBody: 'Open the email link, then return to FOUND CAT to continue backup.',
    signInFailed: 'Could not send the sign-in link. Please try again later.',
    signedInTitle: 'Signed in',
    backupNow: 'Back Up Now',
    retryBackup: 'Try Again',
    backingUp: 'Backing Up',
    backedUp: (count: number) => `Backed up ${count} cat${count === 1 ? '' : 's'}`,
    backupFailed: 'Backup failed. Please try again later.',
    signOut: 'Sign Out',
    close: 'Close backup panel',
  },
};

export default function CloudBackupPrompt({ language, items }: CloudBackupPromptProps) {
  const t = copy[language];
  const user = useAuthStore((state) => state.user);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const signOut = useAuthStore((state) => state.signOut);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
  const [backedUpCount, setBackedUpCount] = useState(0);

  const isSignedIn = Boolean(user);
  const userEmail = user?.email;
  const catCount = items.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured || isLoading) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;

    await signInWithEmail(normalizedEmail);
    if (!useAuthStore.getState().error) {
      setIsSent(true);
    }
  };

  const handleBackup = async () => {
    if (backupStatus === 'backing_up') return;

    setBackupStatus('backing_up');
    const result = await backupLocalCatCards({
      ownerId: user?.id ?? null,
      items,
    });

    if (result.ok) {
      setBackedUpCount(result.backedUpCount);
      setBackupStatus('success');
      return;
    }

    setBackupStatus('error');
  };

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
            {isSignedIn ? t.signedInHint : t.localCount(catCount)}
          </span>
        </span>
        <span className="rounded-full border border-[#1d1714]/20 bg-[#fff2cf] px-2 py-1 text-[10px] font-black tracking-[0.12em] text-[#2f5fb3]">
          CLOUD
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1d1714]/36 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px]">
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
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
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
                    onClick={() => void signOut()}
                    className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-[#1d1714] bg-[#fff2cf] px-4 text-xs font-black shadow-[3px_3px_0_rgba(29,23,20,0.72)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                  >
                    <LogOut size={14} strokeWidth={2.7} aria-hidden="true" />
                    {t.signOut}
                  </button>
                </div>
                {backupStatus === 'success' ? (
                  <p className="mt-3 text-xs font-black text-[#2f5fb3]">{t.backedUp(backedUpCount)}</p>
                ) : null}
                {backupStatus === 'error' ? (
                  <p className="mt-3 text-xs font-black text-[#9f3a2f]">{t.backupFailed}</p>
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
              <div className="mt-4 rounded-[20px] border-2 border-[#1d1714]/70 bg-[#fffdf2] p-4 shadow-[4px_4px_0_rgba(47,95,179,0.18)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} strokeWidth={2.7} className="mt-0.5 text-[#2f5fb3]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-black">{t.sentTitle}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">{t.sentBody}</p>
                  </div>
                </div>
              </div>
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
                  <p className="mt-2 text-xs font-black text-[#9f3a2f]">{t.signInFailed}</p>
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
      ) : null}
    </>
  );
}
