import { create } from 'zustand';

export type CloudBackupStatus = 'idle' | 'backing_up' | 'success' | 'error';

type CloudBackupStatusState = {
  status: CloudBackupStatus;
  backedUpCount: number;
  message: string | null;
  updatedAt: string | null;
  markBackingUp: () => void;
  markSuccess: (backedUpCount: number) => void;
  markError: (message?: string | null) => void;
  reset: () => void;
};

const initialState = {
  status: 'idle' as const,
  backedUpCount: 0,
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
    message: null,
    updatedAt: now(),
  }),

  markError: (message = null) => setStore({
    status: 'error',
    message,
    updatedAt: now(),
  }),

  reset: () => setStore(initialState),
}));
