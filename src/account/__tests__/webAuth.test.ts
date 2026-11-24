import { describe, expect, it, jest } from '@jest/globals';

import { authLinking, completeWebAuth } from '../webAuth';

describe('web auth callback', () => {
  it('completes the browser session and maps /auth/callback on web', () => {
    const complete = jest.fn();
    completeWebAuth('web', complete);
    completeWebAuth('ios', complete);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(authLinking('web', 'https://learn.example/')).toEqual({
      prefixes: ['https://learn.example'],
      config: { screens: { AuthCallback: 'auth/callback' } }
    });
    expect(authLinking('android', 'https://learn.example')).toBeUndefined();
  });
});
