import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

import { getAllWords } from '../lessonLoader';
import { audioManifest } from '../audioManifest';

/**
 * Unit 3 Part 1 audio pairing (#413).
 * être uses the new recording. j’sus keeps the original clip that says j’sus.
 */
const EXPECTED_ASSET_SHA256 = {
  u03_w0001_lf: '9ac2e0b9b74682ea0baffc75a53d609834665b904fe0b2dca7f94cbb638d5589',
  u03_w0001_cajun: 'eaf65bd4b064c299334e9da876cdf6591eb1ef11ab083f282208180d071133fe'
};

const EXPECTED_WORD_AUDIO = [
  {
    rowId: 'u03_w0001',
    target: 'être',
    audioKey: 'u03_w0001_lf'
  },
  {
    rowId: 'u03_w0002',
    target: 'j’sus',
    audioKey: 'u03_w0001_cajun'
  }
];

function sha256OfAsset(audioKey) {
  const assetPath = path.join(
    process.cwd(),
    'assets/audio/cajun',
    `${audioKey}.mp3`
  );
  return createHash('sha256').update(readFileSync(assetPath)).digest('hex');
}

describe('Unit 3 Part 1 être and j’sus Audio (#413)', () => {
  it.each(EXPECTED_WORD_AUDIO)(
    'Catalog Word $rowId keeps audioKey $audioKey',
    ({ rowId, target, audioKey }) => {
      const word = getAllWords('cajun').find((entry) => entry.rowId === rowId);
      expect(word).toEqual(
        expect.objectContaining({
          rowId,
          target,
          audioKey
        })
      );
    }
  );

  it.each(Object.keys(EXPECTED_ASSET_SHA256))(
    'audioManifest resolves %s under Louisiana French',
    (audioKey) => {
      expect(audioManifest.cajun[audioKey]).toBeTruthy();
    }
  );

  it.each(Object.entries(EXPECTED_ASSET_SHA256))(
    'bundled %s body stays the clip paired with that key',
    (audioKey, expectedSha256) => {
      expect(sha256OfAsset(audioKey)).toBe(expectedSha256);
    }
  );
});
