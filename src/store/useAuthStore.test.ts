import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

const authStateSubscription = {
  data: {
    subscription: {
      unsubscribe: vi.fn(),
    },
  },
};

const supabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => authStateSubscription),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock('../lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(async () => null),
}));

describe('useAuthStore', () => {
  beforeEach(async () => {
    const { getSupabaseClient } = await import('../lib/supabaseClient');
    vi.mocked(getSupabaseClient).mockResolvedValue(null);
    supabaseClient.auth.getSession.mockReset();
    supabaseClient.auth.onAuthStateChange.mockClear();
    supabaseClient.auth.signInWithOtp.mockReset();
    supabaseClient.auth.signOut.mockReset();
    authStateSubscription.data.subscription.unsubscribe.mockClear();
    useAuthStore.setState({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      unsubscribeAuthState: null,
    });
  });

  it('initializes safely when Supabase is not configured', async () => {
    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
    });
  });

  it('loads the current session when Supabase is configured', async () => {
    const { getSupabaseClient } = await import('../lib/supabaseClient');
    const session = {
      access_token: 'token',
      refresh_token: 'refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: 'user-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-06-02T00:00:00.000Z' },
    };
    vi.mocked(getSupabaseClient).mockResolvedValue(supabaseClient as never);
    supabaseClient.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState()).toMatchObject({
      session,
      user: session.user,
      isConfigured: true,
      isLoading: false,
      error: null,
    });
    expect(supabaseClient.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('requests a magic-link sign-in email', async () => {
    const { getSupabaseClient } = await import('../lib/supabaseClient');
    vi.mocked(getSupabaseClient).mockResolvedValue(supabaseClient as never);
    supabaseClient.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });

    await useAuthStore.getState().signInWithEmail(' test@example.com ');

    expect(supabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('sets an error when sign-in is requested without configuration', async () => {
    await useAuthStore.getState().signInWithEmail('test@example.com');

    expect(useAuthStore.getState().error).toBe('cloud_not_configured');
  });

  it('signs out when Supabase is configured', async () => {
    const { getSupabaseClient } = await import('../lib/supabaseClient');
    vi.mocked(getSupabaseClient).mockResolvedValue(supabaseClient as never);
    supabaseClient.auth.signOut.mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    expect(supabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
