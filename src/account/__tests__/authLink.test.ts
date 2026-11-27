import { describe, expect, it } from '@jest/globals';

import { matchesAuthRedirect, parseAuthUrl, resolveAuthRedirect } from '../authLink';

const REDIRECT = 'com.westleysturhan.louisianafrench://auth/callback';

describe('auth links', () => {
  it('reads a code from the query or the fragment and rejects a lookalike path', () => {
    expect(parseAuthUrl(`${REDIRECT}?code=abc`)).toEqual({ kind: 'oauth', code: 'abc' });
    expect(parseAuthUrl(`${REDIRECT}#code=frag&type=recovery`)).toEqual({ kind: 'recovery', code: 'frag' });
    expect(parseAuthUrl(`${REDIRECT}?error=access_denied&error_description=secret`)).toEqual({ kind: 'failed' });
    expect(parseAuthUrl(`${REDIRECT}EVIL?code=abc&type=recovery`)).toEqual({ kind: 'ignored' });
    expect(matchesAuthRedirect(`${REDIRECT}EVIL?code=abc`, REDIRECT)).toBe(false);
    expect(matchesAuthRedirect(`${REDIRECT}?code=abc`, REDIRECT)).toBe(true);
  });

  it('has no web output and uses exp:// when Expo Go would emit the app scheme', () => {
    expect(resolveAuthRedirect({ platform: 'web', origin: 'https://learn.example/' } as never)).toBe(REDIRECT);
    expect(resolveAuthRedirect({
      createURL: () => REDIRECT,
      host: 'abc.ngrok.io'
    })).toBe('exp://abc.ngrok.io/--/auth/callback');
  });
});
