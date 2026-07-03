type Replacement = {
  canonical: string;
  variants: string[];
};

const TECH_TERM_REPLACEMENTS: Replacement[] = [
  {
    canonical: 'backend developer',
    variants: ['başkent evlatlarım', 'baskent evlatlarim', 'baş kent evlatlarım', 'başkan evlatlarım'],
  },
  { canonical: 'backend', variants: ['backent', 'bekent', 'bekend', 'back end', 'bek ent'] },
  { canonical: 'frontend', variants: ['frontand', 'frantend', 'fırontend', 'front end', 'fron tend'] },
  { canonical: 'prompt', variants: ['promp', 'pırompt', 'pıromp'] },
  { canonical: 'framework', variants: ['fremvörk', 'freymvörk', 'fremvork', 'freymvork', 'frem work'] },
  { canonical: 'database', variants: ['databeys', 'data beys', 'databeyz', 'databeyis'] },
  { canonical: 'deploy', variants: ['dıploy', 'diplay', 'diploy', 'deploy et'] },
  { canonical: 'repository', variants: ['ripozitori', 'repozitori', 'repositoryi', 'repo sitori'] },
  { canonical: 'AI', variants: ['hey ay', 'hey ayrı', 'hey ai', 'ey ay'] },
  { canonical: 'API', variants: ['ey pi ay', 'eypiay', 'ey piay', 'apiy'] },
];

const COMMON_TURKISH_WORDS = new Set([
  'akşam',
  'bugün',
  'ders',
  'ev',
  'iş',
  'kitap',
  'okul',
  'sabah',
  'spor',
  'toplantı',
  'yarın',
  'yemek',
]);

const normalizeForMatch = (text: string): string =>
  text
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildBoundaryRegex = (phrase: string): RegExp =>
  new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegExp(phrase)})(?=$|[^\\p{L}\\p{N}_])`, 'giu');

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }

  return previous[b.length];
};

const findFuzzyReplacement = (word: string): string | null => {
  const normalizedWord = normalizeForMatch(word);
  if (normalizedWord.length < 5 || COMMON_TURKISH_WORDS.has(normalizedWord)) return null;

  for (const replacement of TECH_TERM_REPLACEMENTS) {
    for (const variant of replacement.variants) {
      const normalizedVariant = normalizeForMatch(variant);
      if (normalizedVariant.includes(' ') || normalizedVariant.length < 5) continue;

      const maxDistance = normalizedVariant.length >= 8 ? 2 : 1;
      if (Math.abs(normalizedWord.length - normalizedVariant.length) <= maxDistance &&
          levenshtein(normalizedWord, normalizedVariant) <= maxDistance) {
        return replacement.canonical;
      }
    }
  }

  return null;
};

const replaceExactPhrases = (text: string): string => {
  let corrected = text;
  const phraseReplacements = TECH_TERM_REPLACEMENTS
    .flatMap(replacement => replacement.variants.map(variant => ({ ...replacement, variant })))
    .sort((a, b) => b.variant.length - a.variant.length);

  for (const { canonical, variant } of phraseReplacements) {
    corrected = corrected.replace(buildBoundaryRegex(variant), (_match, prefix) => `${prefix}${canonical}`);
  }

  return corrected;
};

export const correctTranscriptLocal = (text: string): string => {
  if (!text.trim()) return text;

  const exactCorrected = replaceExactPhrases(text);
  return exactCorrected.replace(/[\p{L}\p{N}_ğüşöçıİĞÜŞÖÇ]+/giu, (word) => {
    const fuzzyReplacement = findFuzzyReplacement(word);
    return fuzzyReplacement || word;
  });
};

