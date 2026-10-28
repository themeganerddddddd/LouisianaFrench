export function shuffle(arr, randomFn = Math.random) {
  return [...arr].sort(() => randomFn() - 0.5);
}

function normalizeText(str) {
  return String(str || '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘`´]/g, "'")
    .replace(/…/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeTextAnswer(str) {
  return normalizeText(str)
    .replace(/\bje suis\b/g, 'jsus')
    .replace(/\bje sus\b/g, 'jsus');
}

function parseVariantAlts(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];

  const quoted = [];
  const quotePattern = /[“"]([^”"]+)[”"]/g;
  let match = quotePattern.exec(text);

  while (match) {
    const form = match[1].trim();
    if (form) quoted.push(form);
    match = quotePattern.exec(text);
  }

  if (quoted.length > 0) {
    return quoted;
  }

  return text
    .split(/\s*(?:,|;|\||\/|\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAcceptedVariantAlts(activity) {
  return [
    activity?.variantAltResponse,
    activity?.altVariantText,
    activity?.altVariant,
    activity?.variant_alt_response,
    activity?.alt_variant_text,
    activity?.alt_variant
  ]
    .flatMap(parseVariantAlts)
    .filter(Boolean);
}

export function isTextAnswerCorrect(value, activity) {
  const normalizedValue = canonicalizeTextAnswer(value);
  const normalizedMain = canonicalizeTextAnswer(activity?.answer);

  if (normalizedValue === normalizedMain) {
    return true;
  }

  return getAcceptedVariantAlts(activity).some(
    (alt) => canonicalizeTextAnswer(alt) === normalizedValue
  );
}
