import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';

export type AuthErrorCode = 'cloud_not_configured' | 'session_load_failed' | 'sign_in_failed' | 'sign_out_failed';

type AuthState = {
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: AuthErrorCode | null;
  errorMessage: string | null;
  unsubscribeAuthState: (() => void) | null;
  initAuth: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const getErrorMessage = (error: unknown) => (
  error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : typeof error === 'string'
        ? error
        : null
);

export const useAuthStore = create<AuthState>((setStore, getStore) => ({
  session: null,
  user: null,
  isConfigured: false,
  isLoading: false,
  error: null,
  errorMessage: null,
  unsubscribeAuthState: null,

  initAuth: async () => {
    const client = await getSupabaseClient();

    getStore().unsubscribeAuthState?.();

    if (!client) {
      setStore({
        session: null,
        user: null,
        isConfigured: false,
        isLoading: false,
        error: null,
        errorMessage: null,
        unsubscribeAuthState: null,
      });
      return;
    }

    setStore({ isConfigured: true, isLoading: true, error: null, errorMessage: null });

    const { data, error } = await client.auth.getSession();

    if (error) {
      setStore({
        session: null,
        user: null,
        isLoading: false,
        error: 'session_load_failed',
        errorMessage: getErrorMessage(error),
      });
      return;
    }

    const subscription = client.auth.onAuthStateChange((_event, session) => {
      setStore({
        session,
        user: session?.user ?? null,
        isConfigured: true,
        isLoading: false,
        error: null,
        errorMessage: null,
      });
    });

    setStore({
      session: data.session,
      user: data.session?.user ?? null,
      isConfigured: true,
      isLoading: false,
      error: null,
      errorMessage: null,
      unsubscribeAuthState: () => subscription.data.subscription.unsubscribe(),
    });
  },

  signInWithEmail: async (email: string) => {
    const client = await getSupabaseClient();
    if (!client) {
      setStore({ error: 'cloud_not_configured', errorMessage: null });
      return;
    }

    setStore({ isLoading: true, error: null, errorMessage: null });

    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      setStore({
        isLoading: false,
        error: error ? 'sign_in_failed' : null,
        errorMessage: getErrorMessage(error),
      });
    } catch (error) {
      setStore({
        isLoading: false,
        error: 'sign_in_failed',
        errorMessage: getErrorMessage(error),
      });
    }
  },

  signOut: async () => {
    const client = await getSupabaseClient();
    if (!client) {
      setStore({ session: null, user: null, error: null, errorMessage: null });
      return;
    }

    setStore({ isLoading: true, error: null, errorMessage: null });
    const { error } = await client.auth.signOut();

    setStore({
      session: error ? getStore().session : null,
      user: error ? getStore().user : null,
      isLoading: false,
      error: error ? 'sign_out_failed' : null,
      errorMessage: getErrorMessage(error),
    });
  },
}));
