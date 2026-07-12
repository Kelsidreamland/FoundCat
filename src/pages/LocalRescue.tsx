import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCopy, Download, Home, RotateCw, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  createLocalRescueBackupFilename,
  createLocalRescueBackupPayload,
  parseLocalRescueBackupPayload,
  readLocalRescueBackup,
  type LocalRescueBackup,
} from '../lib/localRescueBackup';
import { useScrapbookStore } from '../store/useScrapbookStore';

const paperTexture = {
  backgroundImage: [
    'linear-gradient(105deg, rgba(47,95,179,0.055) 0 1px, transparent 1px 100%)',
    'linear-gradient(0deg, rgba(17,17,17,0.04) 0 1px, transparent 1px 100%)',
    'repeating-linear-gradient(96deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 11px)',
    'linear-gradient(135deg, rgba(255,255,255,0.58), transparent 38%)',
  ].join(', '),
  backgroundSize: '28px 28px, 100% 18px, 100% 100%, 100% 100%',
};

function formatDate(value: string | undefined, language: 'zh' | 'en') {
  if (!value) return language === 'zh' ? '沒有日期' : 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function createDownload(payload: string, filename: string) {
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function LocalRescue() {
  const mergeRestoredItems = useScrapbookStore((state) => state.mergeRestoredItems);
  const language = useScrapbookStore((state) => state.language);
  const [backup, setBackup] = useState<LocalRescueBackup | null>(null);
  const copy = language === 'zh'
    ? {
        loading: '正在讀取這個 App 裡的本機貓卡...',
        found: (count: number) => `找到 ${count} 張本機貓卡`,
        empty: '這個視窗讀不到本機貓卡',
        readFailed: '讀取失敗，可能是瀏覽器或 PWA 儲存空間不允許讀取。',
        copied: '已複製備份文字',
        copyFailed: '無法自動複製，請改用下載 JSON。',
        downloaded: '已下載本機備份 JSON',
        merged: (count: number) => `已合併 ${count} 張貓卡，沒有覆蓋原本資料`,
        invalid: '這不是有效的 FOUND CAT 本機備份 JSON',
        title: '本機貓卡救援',
        intro: '只讀取這台裝置裡的貓卡，不會自動同步，也不會覆蓋任何資料。',
        home: '回首頁',
        deviceHint: '如果這裡顯示 0 張，但你的舊桌面 App 裡看得到貓卡，代表它們在另一個 PWA 儲存容器裡，資料不一定消失。',
        download: '下載 JSON',
        copy: '複製備份文字',
        reload: '重新讀取本機資料',
        importTitle: '匯入只會合併，不會覆蓋',
        importHint: '等你把舊 App 的備份文字救出來後，可以貼到這裡。相同 ID 的貓卡會保留本機版本，只加入缺少的貓卡。',
        paste: '貼上備份 JSON',
        import: '合併匯入備份',
      }
    : {
        loading: 'Reading local cat cards from this app...',
        found: (count: number) => `Found ${count} local cat ${count === 1 ? 'card' : 'cards'}`,
        empty: 'No local cat cards were found in this window',
        readFailed: 'Reading failed. The browser or PWA storage may be unavailable.',
        copied: 'Backup text copied',
        copyFailed: 'Automatic copy failed. Download the JSON instead.',
        downloaded: 'Local backup JSON downloaded',
        merged: (count: number) => `Merged ${count} cat ${count === 1 ? 'card' : 'cards'} without replacing existing data`,
        invalid: 'This is not a valid FOUND CAT local backup JSON',
        title: 'Rescue local cat cards',
        intro: 'Reads cat cards from this device only. It does not sync or overwrite anything automatically.',
        home: 'Return home',
        deviceHint: 'If this shows 0 cards but your old home-screen app still has cats, they may be in another PWA storage container. Your data may not be gone.',
        download: 'Download JSON',
        copy: 'Copy backup text',
        reload: 'Reload local data',
        importTitle: 'Import merges; it never overwrites',
        importHint: 'Paste backup text from the old app here. Matching IDs keep the local version; only missing cards are added.',
        paste: 'Paste backup JSON',
        import: 'Merge backup',
      };
  const [status, setStatus] = useState(copy.loading);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const payload = useMemo(() => {
    return backup ? createLocalRescueBackupPayload(backup) : '';
  }, [backup]);

  const loadBackup = async () => {
    setStatus(copy.loading);
    try {
      const nextBackup = await readLocalRescueBackup();
      setBackup(nextBackup);
      setStatus(nextBackup.itemCount > 0 ? copy.found(nextBackup.itemCount) : copy.empty);
    } catch {
      setBackup(null);
      setStatus(copy.readFailed);
    }
  };

  useEffect(() => {
    void loadBackup();
  }, []);

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setStatus(copy.copied);
    } catch {
      setStatus(copy.copyFailed);
    }
  };

  const handleDownload = () => {
    if (!payload) return;
    createDownload(payload, createLocalRescueBackupFilename());
    setStatus(copy.downloaded);
  };

  const handleImport = async () => {
    try {
      const parsedBackup = parseLocalRescueBackupPayload(importText);
      const addedCount = await mergeRestoredItems(parsedBackup.items);
      setImportStatus(copy.merged(addedCount));
      await loadBackup();
    } catch {
      setImportStatus(copy.invalid);
    }
  };

  const previewItems = backup?.items.slice(0, 6) ?? [];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#fff7e8] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-[#1d1714]" style={paperTexture}>
      <header className="mx-auto flex max-w-md items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2f5fb3]">FOUND CAT RESCUE</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">{copy.title}</h1>
          <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">
            {copy.intro}
          </p>
        </div>
        <Link
          to="/"
          aria-label={copy.home}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#1d1714] bg-[#fffdf2] shadow-[3px_3px_0_rgba(29,23,20,0.65)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
        >
          <Home size={18} strokeWidth={2.7} />
        </Link>
      </header>

      <main className="mx-auto mt-4 max-w-md space-y-4">
        <section className="rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf2] p-4 shadow-[5px_5px_0_rgba(47,95,179,0.2)]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border-2 border-[#1d1714] bg-[#d9ecff] text-[#2f5fb3]">
              <ShieldCheck size={20} strokeWidth={2.8} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-black">{status}</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">
                {copy.deviceHint}
              </p>
            </div>
          </div>

          {previewItems.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {previewItems.map((item) => (
                <article key={item.id} className="rounded-[18px] border border-[#1d1714]/18 bg-[#fff7e8] p-2">
                  <div className="aspect-square overflow-hidden rounded-[14px] border border-[#1d1714]/15 bg-[#f6ead7]">
                    <img src={item.heroImageData ?? item.imageData} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="mt-2 truncate text-xs font-black">{item.catName || `貓卡 #${item.catdexNumber ?? '?'}`}</p>
                  <p className="text-[10px] font-bold text-[#6d5f52]">{formatDate(item.date, language)}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!payload || backup?.itemCount === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#2f5fb3] px-3 text-xs font-black text-[#fffdf2] shadow-[3px_3px_0_rgba(29,23,20,0.7)] disabled:cursor-not-allowed disabled:bg-[#9aa9bf]"
            >
              <Download size={15} strokeWidth={2.7} />
              {copy.download}
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!payload || backup?.itemCount === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#fff2cf] px-3 text-xs font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.55)] disabled:cursor-not-allowed disabled:bg-[#d8d2c4]"
            >
              <ClipboardCopy size={15} strokeWidth={2.7} />
              {copy.copy}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void loadBackup()}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-[#1d1714]/30 bg-[#fffdf2] px-3 text-[11px] font-black text-[#2f5fb3] shadow-[2px_2px_0_rgba(47,95,179,0.12)]"
          >
            <RotateCw size={13} strokeWidth={2.7} />
            {copy.reload}
          </button>
        </section>

        <section className="rounded-[24px] border-2 border-[#1d1714]/80 bg-[#fffdf2] p-4 shadow-[5px_5px_0_rgba(247,201,72,0.26)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} strokeWidth={2.8} className="mt-0.5 text-[#9f3a2f]" />
            <div>
              <h2 className="text-sm font-black">{copy.importTitle}</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">
                {copy.importHint}
              </p>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-[#2f5fb3]">
              {copy.paste}
            </span>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              aria-label="貼上備份 JSON"
              rows={5}
              className="w-full resize-none rounded-[16px] border-2 border-[#1d1714]/65 bg-[#fff7e8] p-3 text-xs font-bold leading-5 shadow-[3px_3px_0_rgba(29,23,20,0.28)] outline-none focus:border-[#2f5fb3]"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={!importText.trim()}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#1d1714] px-4 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(47,95,179,0.2)] disabled:cursor-not-allowed disabled:bg-[#9b9288]"
          >
            <Upload size={15} strokeWidth={2.7} />
            {copy.import}
          </button>
          {importStatus ? (
            <p className="mt-3 rounded-[14px] border border-[#2f5fb3]/20 bg-[#d9ecff]/70 px-3 py-2 text-xs font-black leading-5 text-[#2f5fb3]">
              {importStatus}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
