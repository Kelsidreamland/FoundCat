import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './storagePersistence';

const setStorage = (value: unknown) => Object.defineProperty(navigator, 'storage', { configurable: true, value });

describe('requestPersistentStorage', () => {
  afterEach(() => setStorage(undefined));

  it('asks the browser to keep storage when not already persisted', async () => {
    const persist = vi.fn(async () => true);
    setStorage({ persisted: vi.fn(async () => false), persist });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('skips the request when storage is already persisted', async () => {
    const persist = vi.fn(async () => true);
    setStorage({ persisted: vi.fn(async () => true), persist });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('returns false where the API is missing or throws', async () => {
    setStorage(undefined);
    await expect(requestPersistentStorage()).resolves.toBe(false);
    setStorage({ persist: vi.fn(async () => { throw new Error('nope'); }) });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
