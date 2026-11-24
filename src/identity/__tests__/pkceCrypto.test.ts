import { describe, expect, it, jest } from '@jest/globals';

import { installPkceCrypto } from '../installPkceCrypto';

describe('PKCE crypto', () => {
  it('hashes with SHA-256 when the runtime has no digest', async () => {
    const digestSha256 = jest.fn(async (_data: Uint8Array) => new Uint8Array([4, 5]).buffer);
    const target: { subtle?: { digest: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer> } } = {};
    installPkceCrypto(target, digestSha256);
    const data = new Uint8Array([9]);
    await expect(target.subtle?.digest('SHA-256', data)).resolves.toEqual(new Uint8Array([4, 5]).buffer);
    expect(digestSha256).toHaveBeenCalledWith(data);
  });

  it('keeps a digest the runtime already has', () => {
    const digest = jest.fn(async () => new ArrayBuffer(0));
    const target = { subtle: { digest } };
    installPkceCrypto(target, jest.fn(async () => new ArrayBuffer(0)));
    expect(target.subtle.digest).toBe(digest);
  });
});
