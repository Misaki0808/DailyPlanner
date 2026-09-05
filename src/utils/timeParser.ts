export interface ExtractedTime {
  hour: number;
  minute: number;
  label: string;
}

type TimeMatch = {
  start: number;
  end: number;
  hour: number;
  minute: number;
};

/**
 * DİKKAT: `\b` JavaScript'te ASCII kelime sınırıdır; "ö" ASCII harf olmadığı
 * için `\böğlen` HİÇ eşleşmez. Bu yüzden buradaki sınırlar NOON_REGEX'teki
 * gibi Unicode-güvenli yazılmıştır (grup 1 = önek). Aksi halde "öğlen 3'te"
 * bu kalıba düşmez, SUFFIX_HOUR_REGEX'e takılır ve 15:00 yerine 03:00 olur.
 */
const PERIOD_HOUR_REGEX = /(^|[^\p{L}\p{N}_])(sabah|öğlen|öğle|akşam|gece)\s+(?:saat\s+)?(\d{1,2})(?:[:.](\d{2}))?(?:\s*['’]?(?:de|da|te|ta))?(?=$|[^\p{L}\p{N}_])/giu;
const CLOCK_REGEX = /(?:\bsaat\s+)?\b([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*['’]?(?:de|da|te|ta))?\b/giu;
const SUFFIX_HOUR_REGEX = /(?:\bsaat\s+)?\b(\d{1,2})(?:[:.](\d{2}))?\s*['’]?(?:de|da|te|ta)\b/giu;
const NOON_REGEX = /(^|[^\p{L}\p{N}_])(öğlen|öğle)(?:\s*['’]?(?:de|da))?(?=$|[^\p{L}\p{N}_])/giu;

const normalizePeriodHour = (period: string, rawHour: number): number | null => {
  if (rawHour < 0 || rawHour > 23) return null;
  const normalizedPeriod = period.toLocaleLowerCase('tr-TR');

  if (normalizedPeriod === 'sabah') {
    if (rawHour === 12) return 12;
    return rawHour >= 1 && rawHour <= 11 ? rawHour : null;
  }

  if (normalizedPeriod === 'öğlen' || normalizedPeriod === 'öğle') {
    if (rawHour === 12) return 12;
    if (rawHour >= 1 && rawHour <= 5) return rawHour + 12;
    return rawHour >= 13 && rawHour <= 17 ? rawHour : null;
  }

  if (normalizedPeriod === 'akşam') {
    if (rawHour === 12) return 12;
    if (rawHour >= 1 && rawHour <= 11) return rawHour + 12;
    return rawHour >= 18 && rawHour <= 23 ? rawHour : null;
  }

  if (normalizedPeriod === 'gece') {
    if (rawHour === 12) return 0;
    if (rawHour >= 1 && rawHour <= 5) return rawHour;
    if (rawHour >= 6 && rawHour <= 11) return rawHour + 12;
    return rawHour >= 22 && rawHour <= 23 ? rawHour : null;
  }

  return null;
};

const overlaps = (candidate: TimeMatch, matches: TimeMatch[]): boolean =>
  matches.some(match => candidate.start < match.end && candidate.end > match.start);

const collectMatches = (text: string): TimeMatch[] => {
  const matches: TimeMatch[] = [];

  for (const match of text.matchAll(PERIOD_HOUR_REGEX)) {
    const prefixLength = match[1]?.length || 0;
    const hour = normalizePeriodHour(match[2], Number(match[3]));
    const minute = match[4] ? Number(match[4]) : 0;
    if (hour === null || minute > 59) continue;
    matches.push({
      start: (match.index || 0) + prefixLength,
      end: (match.index || 0) + match[0].length,
      hour,
      minute,
    });
  }

  for (const match of text.matchAll(CLOCK_REGEX)) {
    const candidate = {
      start: match.index || 0,
      end: (match.index || 0) + match[0].length,
      hour: Number(match[1]),
      minute: Number(match[2]),
    };
    if (!overlaps(candidate, matches)) matches.push(candidate);
  }

  for (const match of text.matchAll(SUFFIX_HOUR_REGEX)) {
    const rawHour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    if (rawHour > 23 || minute > 59) continue;
    const candidate = { start: match.index || 0, end: (match.index || 0) + match[0].length, hour: rawHour, minute };
    if (!overlaps(candidate, matches)) matches.push(candidate);
  }

  for (const match of text.matchAll(NOON_REGEX)) {
    const prefixLength = match[1]?.length || 0;
    const index = (match.index || 0) + prefixLength;
    const end = (match.index || 0) + match[0].length;
    const after = text.slice(end, end + 8);
    if (/^\s+\d/.test(after)) continue;
    const candidate = { start: index, end, hour: 12, minute: 0 };
    if (!overlaps(candidate, matches)) matches.push(candidate);
  }

  return matches.sort((a, b) => a.start - b.start);
};

const cleanupLabel = (label: string): string => {
  const cleaned = label
    .replace(/^[\s,.;:!?-]+/g, '')
    .replace(/^(ve|sonra|ardından|için|da|de|ise)\s+/iu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Hatırlatma';

  const shortLabel = cleaned.split(' ').slice(0, 4).join(' ');
  return shortLabel.charAt(0).toLocaleUpperCase('tr-TR') + shortLabel.slice(1);
};

const getLabelForMatch = (text: string, match: TimeMatch, nextMatch?: TimeMatch): string => {
  const nextBoundary = nextMatch ? nextMatch.start : text.length;
  const afterTime = text.slice(match.end, nextBoundary).split(/[.,;!?。\n]/)[0];
  const cleanedAfter = cleanupLabel(afterTime);
  if (cleanedAfter !== 'Hatırlatma') return cleanedAfter;

  const previousBoundary = Math.max(
    text.lastIndexOf('.', match.start),
    text.lastIndexOf(',', match.start),
    text.lastIndexOf(';', match.start),
    text.lastIndexOf('\n', match.start)
  );
  const beforeTime = text.slice(previousBoundary + 1, match.start);
  return cleanupLabel(beforeTime);
};

export const extractTimesLocal = (text: string): ExtractedTime[] => {
  if (!text.trim()) return [];

  const matches = collectMatches(text);
  return matches.map((match, index) => ({
    hour: match.hour,
    minute: match.minute,
    label: getLabelForMatch(text, match, matches[index + 1]),
  }));
};
