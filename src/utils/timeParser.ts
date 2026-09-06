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
// İki nokta ayracı tek anlamlıdır: "14:30" her zaman saattir.
const CLOCK_COLON_REGEX = /(?:\bsaat\s+)?\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*['’]?(?:de|da|te|ta))?\b/giu;

// Nokta ayracı Türkçe'de HEM saat HEM ondalık ayracıdır ("14.30" ama
// "3.45 TL", "sürüm 1.20"). Bu yüzden yalnız bir saat bağlamı varsa
// kabul edilir; bağlam denetimi shouldAcceptDotClock içinde.
// Gruplar: 1=saat öneki, 2=saat, 3=dakika, 4=de/da/te/ta soneki
const CLOCK_DOT_REGEX = /(\bsaat\s+)?\b([01]?\d|2[0-3])\.([0-5]\d)(\s*['’]?(?:de|da|te|ta))?\b/giu;

/**
 * Eşleşmenin hemen ardından bir BİRİM geliyorsa bu bir ölçüdür, saat değil:
 * "3.45 TL", "12.30 kg", "18.45 cm", "10.30 dakika".
 *
 * Ayırt edici bilgi sayının kendisi değil, ardından geleni: "14.30 toplantı"
 * ile "12.30 kg" aynı şekle sahip. Meşru saat girdilerinin ardından bir birim
 * gelmediği için bu kontrol onları etkilemez.
 *
 * Sınır Unicode-güvenli: "kuruş", "derece" gibi ASCII dışı harf içeren
 * birimlerde `\b` çalışmaz.
 */
const UNIT_AFTER_REGEX = new RegExp(
  '^\\s*(?:' + [
    // para birimi
    '₺', '\\$', '€', '£', 'tl', 'try', 'lira', 'krş', 'kuruş',
    'dolar', 'usd', 'euro', 'avro', 'eur', 'sterlin', 'gbp', 'cent', 'sent',
    // kütle
    'kg', 'kilo', 'gram', 'gr', 'mg', 'ton',
    // uzunluk
    'km', 'cm', 'mm', 'metre', 'santim', 'm',
    // hacim
    'litre', 'lt', 'ml', 'l',
    // sıcaklık ve oran
    'derece', '°c', '°', '%', 'yüzde',
    // veri
    'kb', 'mb', 'gb', 'tb',
    // sayma ve ölçek
    'adet', 'tane', 'kişi', 'sayfa', 'puan', 'bin', 'milyon', 'milyar',
    // SÜRE (saat/dakika ölçüsü; "saat 10.20" öneki bundan ayrı, o saat sayılır)
    'saat', 'dakika', 'dk', 'saniye', 'sn',
  ].join('|') + ')(?=$|[^\\p{L}\\p{N}_])',
  'iu'
);

/**
 * Noktalı yazımın saat sayılıp sayılmayacağına karar verir.
 * Saat kabul edilir çünkü bağlam var:
 *   - "saat 14.30"        -> açık saat öneki
 *   - "3.45'te", "14.30 da" -> Türkçe bulunma hâli eki
 *   - "09.30", "14.30"    -> iki haneli saat, saat yazımının olağan biçimi
 * Aksi hâlde ("3.45 TL", "sürüm 1.20") ondalık sayı kabul edilir.
 * Ardından bir BİRİM geliyorsa iki haneli olsa bile saat sayılmaz
 * ("12.50 lira", "12.30 kg", "18.45 cm").
 */
/**
 * Sayıdan ÖNCE gelen ve onu bir tanımlayıcı/sürüm yapan sözcükler:
 * "Sürüm 10.20", "Model 12.30". Liste bilinçli olarak DAR tutuldu — Türkçe'de
 * saatten önce isim gelmesi çok yaygın ("Toplantı 18.45", "Ders 14.30"), bu
 * yüzden geniş bir liste meşru girdileri bozardı.
 */
const IDENTIFIER_BEFORE_REGEX = /(?:^|[^\p{L}\p{N}_])(sürüm|surum|versiyon|version|model|seri)\s*$/iu;

const shouldAcceptDotClock = (
  text: string,
  matchStart: number,
  matchEnd: number,
  hourText: string,
  hasSaatPrefix: boolean,
  hasSuffix: boolean
): boolean => {
  if (UNIT_AFTER_REGEX.test(text.slice(matchEnd, matchEnd + 12))) return false;

  // Açık saat işareti varsa ("saat 10.20", "10.20'de") önceki sözcüğe bakılmaz;
  // tanımlayıcı kontrolü yalnız bağlamsız iki haneli yazım için geçerli.
  if (hasSaatPrefix || hasSuffix) return true;

  if (IDENTIFIER_BEFORE_REGEX.test(text.slice(Math.max(0, matchStart - 16), matchStart))) {
    return false;
  }

  return hourText.length === 2;
};
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

  for (const match of text.matchAll(CLOCK_COLON_REGEX)) {
    const candidate = {
      start: match.index || 0,
      end: (match.index || 0) + match[0].length,
      hour: Number(match[1]),
      minute: Number(match[2]),
    };
    if (!overlaps(candidate, matches)) matches.push(candidate);
  }

  for (const match of text.matchAll(CLOCK_DOT_REGEX)) {
    const start = match.index || 0;
    const end = start + match[0].length;
    if (!shouldAcceptDotClock(text, start, end, match[2], Boolean(match[1]), Boolean(match[4]))) continue;

    const candidate = { start, end, hour: Number(match[2]), minute: Number(match[3]) };
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
