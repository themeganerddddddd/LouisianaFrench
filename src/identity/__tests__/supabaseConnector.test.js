jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: async () => ({ data: { session: null } })
    }
  }))
}));

// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { createSupabaseIdentityConnector } from '../connector';

describe('Supabase identity connector', () => {
  it('keeps the session exchange inside the client on a phone', () => {
    createSupabaseIdentityConnector({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key'
    });

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true
        })
      })
    );
  });

  it('does not create a client when the public configuration is missing', async () => {
    createClient.mockClear();
    const connector = createSupabaseIdentityConnector({});
    expect(createClient).not.toHaveBeenCalled();
    expect(
      await connector.signInWithPassword({
        email: 'ada@example.com',
        password: 'secret'
      })
    ).toEqual({
      identity: null,
      message: 'Sign-in is unavailable.'
    });
  });
});
