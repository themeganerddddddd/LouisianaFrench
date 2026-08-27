const QUOTED_PHRASE =
  /["\u201C]([^"\u201D]*)["\u201D]/g;

/**
 * Split a Catalog alternative string into display items.
 * Catalog data is unchanged; this is display-only.
 */
export function splitAlternativeResponses(text) {
  if (text == null) {
    return [];
  }

  const trimmed = String(text).trim();
  if (!trimmed) {
    return [];
  }

  const quoted = [];
  for (const match of trimmed.matchAll(QUOTED_PHRASE)) {
    const phrase = match[1].trim();
    if (phrase) {
      quoted.push(phrase);
    }
  }

  if (quoted.length > 0) {
    return quoted;
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [trimmed];
}
