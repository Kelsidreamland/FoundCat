import { create } from 'zustand';

export type CloudBackupStatus = 'idle' | 'backing_up' | 'success' | 'error';

type CloudBackupStatusState = {
  status: CloudBackupStatus;
  backedUpCount: number;
  pendingCount: number;
  message: string | null;
  updatedAt: string | null;
  markBackingUp: () => void;
  markSuccess: (backedUpCount: number) => void;
  markError: (input?: string | { message?: string | null; pendingCount?: number } | null) => void;
  reset: () => void;
};

const initialState = {
  status: 'idle' as const,
  backedUpCount: 0,
  pendingCount: 0,
  message: null,
  updatedAt: null,
};

const now = () => new Date().toISOString();

export const useCloudBackupStatusStore = create<CloudBackupStatusState>((setStore) => ({
  ...initialState,

  markBackingUp: () => setStore({
    status: 'backing_up',
    message: null,
    updatedAt: now(),
  }),

  markSuccess: (backedUpCount) => setStore({
    status: 'success',
    backedUpCount,
    pendingCount: 0,
    message: null,
    updatedAt: now(),
  }),

  markError: (input = null) => {
    const message = typeof input === 'string' ? input : input?.message ?? null;
    const pendingCount = typeof input === 'object' && input !== null ? input.pendingCount ?? 0 : 0;

    setStore({
      status: 'error',
      pendingCount,
      message,
      updatedAt: now(),
    });
  },

  reset: () => setStore(initialState),
}));
