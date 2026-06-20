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

function formatDate(value?: string) {
  if (!value) return '沒有日期';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-TW', {
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
  const [backup, setBackup] = useState<LocalRescueBackup | null>(null);
  const [status, setStatus] = useState('正在讀取這個 App 裡的本機貓卡...');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  const payload = useMemo(() => {
    return backup ? createLocalRescueBackupPayload(backup) : '';
  }, [backup]);

  const loadBackup = async () => {
    setStatus('正在讀取這個 App 裡的本機貓卡...');
    try {
      const nextBackup = await readLocalRescueBackup();
      setBackup(nextBackup);
      setStatus(nextBackup.itemCount > 0
        ? `找到 ${nextBackup.itemCount} 張本機貓卡`
        : '這個視窗讀不到本機貓卡');
    } catch {
      setBackup(null);
      setStatus('讀取失敗，可能是瀏覽器或 PWA 儲存空間不允許讀取。');
    }
  };

  useEffect(() => {
    void loadBackup();
  }, []);

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setStatus('已複製備份文字');
    } catch {
      setStatus('無法自動複製，請改用下載 JSON。');
    }
  };

  const handleDownload = () => {
    if (!payload) return;
    createDownload(payload, createLocalRescueBackupFilename());
    setStatus('已下載本機備份 JSON');
  };

  const handleImport = async () => {
    try {
      const parsedBackup = parseLocalRescueBackupPayload(importText);
      const addedCount = await mergeRestoredItems(parsedBackup.items);
      setImportStatus(`已合併 ${addedCount} 張貓卡，沒有覆蓋原本資料`);
      await loadBackup();
    } catch {
      setImportStatus('這不是有效的 FOUND CAT 本機備份 JSON');
    }
  };

  const previewItems = backup?.items.slice(0, 6) ?? [];

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#fff7e8] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-[#1d1714]" style={paperTexture}>
      <header className="mx-auto flex max-w-md items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2f5fb3]">FOUND CAT RESCUE</p>
          <h1 className="mt-1 text-2xl font-black leading-tight">本機貓卡救援</h1>
          <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">
            只讀取這台裝置裡的貓卡，不會自動同步，也不會覆蓋任何資料。
          </p>
        </div>
        <Link
          to="/"
          aria-label="回首頁"
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
                如果這裡顯示 0 張，但你的舊桌面 App 裡看得到貓卡，代表它們在另一個 PWA 儲存容器裡，資料不一定消失。
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
                  <p className="text-[10px] font-bold text-[#6d5f52]">{formatDate(item.date)}</p>
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
              下載 JSON
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!payload || backup?.itemCount === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#fff2cf] px-3 text-xs font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.55)] disabled:cursor-not-allowed disabled:bg-[#d8d2c4]"
            >
              <ClipboardCopy size={15} strokeWidth={2.7} />
              複製備份文字
            </button>
          </div>
          <button
            type="button"
            onClick={() => void loadBackup()}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-[#1d1714]/30 bg-[#fffdf2] px-3 text-[11px] font-black text-[#2f5fb3] shadow-[2px_2px_0_rgba(47,95,179,0.12)]"
          >
            <RotateCw size={13} strokeWidth={2.7} />
            重新讀取本機資料
          </button>
        </section>

        <section className="rounded-[24px] border-2 border-[#1d1714]/80 bg-[#fffdf2] p-4 shadow-[5px_5px_0_rgba(247,201,72,0.26)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} strokeWidth={2.8} className="mt-0.5 text-[#9f3a2f]" />
            <div>
              <h2 className="text-sm font-black">匯入只會合併，不會覆蓋</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-[#6d5f52]">
                等你把舊 App 的備份文字救出來後，可以貼到這裡。相同 ID 的貓卡會保留本機版本，只加入缺少的貓卡。
              </p>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.12em] text-[#2f5fb3]">
              貼上備份 JSON
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
            合併匯入備份
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
