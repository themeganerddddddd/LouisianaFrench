type Digest = (data: Uint8Array) => Promise<ArrayBuffer>;
type CryptoLike = { subtle?: { digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer> } };

export function installPkceCrypto(target: CryptoLike, digestSha256: Digest) {
  if (typeof target.subtle?.digest === 'function') return;
  target.subtle = {
    async digest(algorithm, data) {
      if (algorithm !== 'SHA-256') throw new Error(`Unsupported digest algorithm: ${algorithm}`);
      return digestSha256(data);
    }
  };
}
