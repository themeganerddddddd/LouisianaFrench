export type Language = 'cajun' | 'kreole';

export function accentFor(language: Language): string {
  switch (language) {
    case 'cajun':
      return '#2771CB';
    case 'kreole':
      return '#08834C';
    default: {
      const unexpected: never = language;
      throw new Error(`No accent for language: ${String(unexpected)}`);
    }
  }
}
