import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

import { getAllWords, resolveAudio } from '../lessonLoader';

/**
 * Independent content fingerprints for the Unit 5 LF cards/dog pair (#198).
 * Established by Whisper transcription of each body before the swap fix:
 * - cards phrase lives in the shorter clip (sha of former u05_w0012_lf body)
 * - dog phrase lives in the longer clip (sha of former u05_w0010_lf body)
 */
const EXPECTED_ASSET_SHA256 = {
  u05_w0010_lf: 'ee3001dfca57047c546800115e0721590722ee9f05e826da921faf3b4f502c53',
  u05_w0012_lf: '74605f15fede93b2dc679aa664cd007cfb086f1ae307c7dc3cbde1b4794fb03b'
};

const EXPECTED_WORD_AUDIO = [
  {
    rowId: 'u05_w0010',
    target: 'On aime jouer aux cartes.',
    audioKey: 'u05_w0010_lf'
  },
  {
    rowId: 'u05_w0012',
    target: "Mon chien aime pas d'être seul.",
    audioKey: 'u05_w0012_lf'
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

describe('Unit 5 LF cards/dog Audio asset mapping (#198)', () => {
  it.each(EXPECTED_WORD_AUDIO)(
    'Catalog Word $rowId keeps audioKey $audioKey for its target phrase',
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
    'Catalog resolveAudio resolves %s under Louisiana French',
    (audioKey) => {
      expect(resolveAudio('cajun', audioKey)).toBeTruthy();
    }
  );

  it.each(Object.entries(EXPECTED_ASSET_SHA256))(
    'bundled %s body matches the spoken phrase fingerprint',
    (audioKey, expectedSha256) => {
      expect(sha256OfAsset(audioKey)).toBe(expectedSha256);
    }
  );
});
