/**
 * Cat cards live only in this browser's IndexedDB. Browsers may evict that storage under
 * pressure, and Safari clears it for sites not opened for about a week unless the app is
 * on the home screen. Asking for persistent storage makes eviction much less likely where
 * supported (Chromium, Firefox, recent Safari).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

export const isStandaloneApp = () => {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
};

/** Fired to open the cloud backup / sign-in panel from anywhere in the app. */
export const OPEN_BACKUP_PANEL_EVENT = 'found-cat-open-backup';
