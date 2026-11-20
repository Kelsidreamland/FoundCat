import { Eye, Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { hasMarkedSeen, markCatSeen, REPORT_REASONS, reportCat, type ReportReason } from '../../lib/catSocial';

const copy = {
  zh: {
    seen: '我也見過',
    seenDone: '你也見過',
    seenCount: (n: number) => `${n} 人見過`,
    report: '檢舉這張貓卡',
    reportTitle: '這張貓卡有什麼問題？',
    reasons: {
      inappropriate: '不當內容',
      privacy: '洩露個人隱私或住址',
      not_a_cat: '照片不是貓',
      spam: '廣告或洗版',
      other: '其他',
    } satisfies Record<ReportReason, string>,
    notePlaceholder: '補充說明（可略過）',
    submit: '送出檢舉',
    cancel: '取消',
    reported: '已收到檢舉，謝謝你。我們會盡快查看。',
    failed: '暫時送不出去，請稍後再試。',
  },
  en: {
    seen: "I've seen it too",
    seenDone: "You've seen it",
    seenCount: (n: number) => `Seen by ${n}`,
    report: 'Report this cat card',
    reportTitle: "What's wrong with this card?",
    reasons: {
      inappropriate: 'Inappropriate content',
      privacy: 'Reveals someone’s privacy or address',
      not_a_cat: 'Not a cat',
      spam: 'Spam or ads',
      other: 'Something else',
    } satisfies Record<ReportReason, string>,
    notePlaceholder: 'Details (optional)',
    submit: 'Send report',
    cancel: 'Cancel',
    reported: 'Report received. Thank you, we will take a look.',
    failed: 'Could not send right now. Please try again later.',
  },
};

export function SeenItButton({ catId, seenCount = 0, language }: { catId: string; seenCount?: number; language: 'zh' | 'en' }) {
  const t = copy[language];
  const [hasSeen, setHasSeen] = useState(() => hasMarkedSeen(catId));
  const [count, setCount] = useState(seenCount);
  const [isSending, setIsSending] = useState(false);

  const handleClick = async () => {
    if (hasSeen || isSending) return;
    setIsSending(true);
    const result = await markCatSeen(catId);
    setIsSending(false);
    if (result.ok) {
      setHasSeen(true);
      setCount((value) => value + 1);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={hasSeen || isSending}
      aria-pressed={hasSeen}
      className="inline-flex min-h-[52px] min-w-0 items-center gap-2 rounded-full border-2 border-[#221915] bg-[#fffdf2] px-4 text-sm font-black text-[#221915] shadow-[3px_3px_0_rgba(29,23,20,0.86)] disabled:shadow-none aria-pressed:bg-[#d9ecff]"
    >
      {isSending ? <Loader2 size={16} className="animate-spin" /> : <Eye size={17} strokeWidth={2.5} aria-hidden="true" />}
      <span className="truncate">{hasSeen ? t.seenDone : t.seen}</span>
      {count > 0 ? <span className="shrink-0 text-xs font-bold text-[#6d5f52]">· {t.seenCount(count)}</span> : null}
    </button>
  );
}

export function ReportCatLink({ catId, language }: { catId: string; language: 'zh' | 'en' }) {
  const t = copy[language];
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  if (status === 'sent') {
    return <p role="status" className="text-center text-xs font-bold text-[#6d5f52]">{t.reported}</p>;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mx-auto flex min-h-9 items-center gap-1.5 text-xs font-bold text-[#7a6a5b] underline-offset-4 hover:underline"
      >
        <Flag size={12} aria-hidden="true" />
        {t.report}
      </button>
    );
  }

  const submit = async () => {
    if (!reason) return;
    setStatus('sending');
    const result = await reportCat(catId, reason, note);
    setStatus(result.ok ? 'sent' : 'failed');
  };

  return (
    <fieldset className="rounded-[14px] border border-[#221915]/15 bg-white p-3" data-testid="report-cat-form">
      <legend className="px-1 text-sm font-black text-[#221915]">{t.reportTitle}</legend>
      <div className="mt-1 space-y-1">
        {REPORT_REASONS.map((value) => (
          <label key={value} className="flex min-h-9 items-center gap-2 text-sm font-bold text-[#221915]">
            <input type="radio" name={`report-${catId}`} checked={reason === value} onChange={() => setReason(value)} />
            {t.reasons[value]}
          </label>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t.notePlaceholder}
        maxLength={300}
        rows={2}
        className="mt-2 w-full rounded-[10px] border border-[#221915]/20 px-3 py-2 text-base"
      />
      {status === 'failed' ? <p className="mt-1 text-xs font-bold text-[#9f3a2f]">{t.failed}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!reason || status === 'sending'}
          className="min-h-10 flex-1 rounded-[10px] border-2 border-[#221915] bg-[#221915] text-sm font-black text-white disabled:opacity-40"
        >
          {t.submit}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="min-h-10 rounded-[10px] border border-[#221915]/20 px-3 text-sm font-bold text-[#6d5f52]"
        >
          {t.cancel}
        </button>
      </div>
    </fieldset>
  );
}
