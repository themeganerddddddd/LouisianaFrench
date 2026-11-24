import { describe, expect, it, jest } from '@jest/globals';

import { completeWebAuth } from '../webAuth';

describe('web auth callback', () => {
  it('completes the browser session on web', () => {
    const complete = jest.fn();
    completeWebAuth('web', complete);
    completeWebAuth('ios', complete);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
