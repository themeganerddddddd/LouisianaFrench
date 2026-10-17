jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: async () => ({ data: { session: null } })
    }
  }))
}));

// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { readFileSync } from 'fs';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { join } from 'path';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { createSupabaseIdentityConnector } from '../connector';

const connectorSource = readFileSync(join(process.cwd(), 'src/identity/connector.js'), 'utf8');

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

  it('reads the public URL and publishable key directly when no env object is passed', () => {
    const code = connectorSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(code).toContain('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(code).not.toMatch(/service_role|SUPABASE_SERVICE/i);

    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://built.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
    createClient.mockClear();
    try {
      createSupabaseIdentityConnector();
      expect(createClient).toHaveBeenCalledWith(
        'https://built.supabase.co',
        'sb_publishable_test',
        expect.any(Object)
      );
    } finally {
      restorePublicEnv(previousUrl, previousKey);
    }
  });

  it('ignores the machine environment when the caller passes an empty env object', async () => {
    const previousUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://built.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_test';
    createClient.mockClear();
    try {
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
    } finally {
      restorePublicEnv(previousUrl, previousKey);
    }
  });
});

function restorePublicEnv(url, key) {
  if (url === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  else process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  if (key === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = key;
}
