jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: async () => ({ data: { session: null } })
    }
  }))
}));

jest.mock('expo-linking', () => ({
  createURL: () => 'com.westleysturhan.louisianafrench://auth/callback'
}));

jest.mock('expo-constants', () => ({
  executionEnvironment: 'bare',
  appOwnership: null,
  expoGoConfig: { developer: { tool: 'expo-cli' } },
  expoConfig: { hostUri: '10.0.2.2:8082' },
  manifest: null,
  manifest2: null
}));

// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { readFileSync } from 'fs';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { join } from 'path';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import { createClient } from '@supabase/supabase-js';
// eslint-disable-next-line import/first -- jest.mock must run before these imports
import {
  createSupabaseIdentityConnector,
  redirectHostIsBlockedIp,
  resolveAuthRedirect,
  STANDALONE_AUTH_REDIRECT
} from '../connector';

const connectorSource = readFileSync(join(process.cwd(), 'src/identity/connector.js'), 'utf8');

describe('resolveAuthRedirect', () => {
  it('rewrites the standalone scheme to exp:// when Metro hostUri is present', () => {
    expect(
      resolveAuthRedirect({
        createURL: () => STANDALONE_AUTH_REDIRECT,
        constants: {
          expoConfig: { hostUri: '10.0.2.2:8082' },
          expoGoConfig: { developer: {} }
        }
      })
    ).toBe('exp://10.0.2.2:8082/--/auth/callback');
  });

  it('keeps a release createURL result that is already the app scheme without Metro', () => {
    expect(
      resolveAuthRedirect({
        createURL: () => STANDALONE_AUTH_REDIRECT,
        constants: { expoConfig: {}, expoGoConfig: null, manifest: null, manifest2: null }
      })
    ).toBe(STANDALONE_AUTH_REDIRECT);
  });

  it('passes through an exp:// createURL result', () => {
    expect(
      resolveAuthRedirect({
        createURL: () => 'exp://172.16.0.103:8082/--/auth/callback',
        constants: { expoConfig: { hostUri: '172.16.0.103:8082' } }
      })
    ).toBe('exp://172.16.0.103:8082/--/auth/callback');
  });

  it('documents the Expo Go rewrite in the connector source', () => {
    expect(connectorSource).toContain('exp://');
    expect(connectorSource).toContain('hostUri');
  });

  it('flags Expo Go LAN redirects that Supabase Auth will reject as IPs', () => {
    expect(redirectHostIsBlockedIp('exp://172.16.0.103:8081/--/auth/callback')).toBe(true);
    expect(redirectHostIsBlockedIp('exp://10.0.2.2:8082/--/auth/callback')).toBe(true);
    expect(redirectHostIsBlockedIp('exp://abc.exp.direct:80/--/auth/callback')).toBe(false);
    expect(redirectHostIsBlockedIp(STANDALONE_AUTH_REDIRECT)).toBe(false);
  });
});

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
    const source = connectorSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(source).toContain('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(source).not.toMatch(/service_role|SUPABASE_SERVICE/i);

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
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://machine.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'machine-key';
    createClient.mockClear();
    try {
      const connector = createSupabaseIdentityConnector({});
      expect(createClient).not.toHaveBeenCalled();
      expect(await connector.getIdentity()).toBeNull();
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
