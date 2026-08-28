import { getAudioSource } from '../../data/audioManifest';
import {
  clearTargetAudioLookupCache,
  getTargetAudioLookup,
  resolveAlternativeAudioKey
} from '../alternativeAudio';

jest.mock('../../data/audioManifest', () => ({
  getAudioSource: jest.fn()
}));

describe('alternativeAudio', () => {
  beforeEach(() => {
    clearTargetAudioLookupCache();
    jest.clearAllMocks();
  });

  it('maps catalog targets to playable audio keys', () => {
    getAudioSource.mockImplementation((_language, key) =>
      key ? { uri: key } : null
    );

    const lookup = getTargetAudioLookup('cajun');

    expect(lookup.get('Bonjour!')).toBe('u01_w0001_cajun');
    expect(lookup.get('Ça va?')).toBe('u01_w0003_lf');
  });

  it('resolves an alternative phrase from another catalog row', () => {
    getAudioSource.mockImplementation((_language, key) =>
      key ? { uri: key } : null
    );

    const activity = {
      target: 'Pas de quoi!',
      audioKey: 'u01_w0023_lf',
      variantAltResponse: '"De rien!"'
    };

    expect(
      resolveAlternativeAudioKey('cajun', 'Au revoir!', {
        target: 'On va se revoir!',
        audioKey: 'u01_w0026_lf'
      })
    ).toBe('u01_w0026_lf');

    expect(
      resolveAlternativeAudioKey('cajun', 'De rien!', activity)
    ).toBeNull();
  });

  it('falls back to the activity primary audio when the phrase matches', () => {
    getAudioSource.mockImplementation((_language, key) =>
      key === 'fixture_audio' ? { uri: 'fixture_audio' } : null
    );

    expect(
      resolveAlternativeAudioKey('cajun', 'Bonjour', {
        target: 'Bonjour',
        audioKey: 'fixture_audio'
      })
    ).toBe('fixture_audio');
  });

  it('returns null when no playable audio exists for the phrase', () => {
    getAudioSource.mockReturnValue(null);

    expect(
      resolveAlternativeAudioKey('cajun', 'Unknown phrase', {
        target: 'Bonjour',
        audioKey: 'fixture_audio'
      })
    ).toBeNull();
  });
});
