import {
  MAX_PICKER_YEAR,
  MIN_PICKER_YEAR,
  PickerDate,
  fromPickerDate,
  stepDay,
  stepMonth,
  stepYear,
  toPickerDate,
} from '../../src/utils/datePicker';
import { parseDate, formatDate } from '../../src/utils/dateUtils';

const d = (year: number, month: number, day: number): PickerDate => ({ year, month, day });

describe('toPickerDate', () => {
  it('geçerli tarihi olduğu gibi alır', () => {
    expect(toPickerDate('2026-09-05')).toEqual(d(2026, 9, 5));
  });

  it('boş metinde bugüne düşer', () => {
    const today = new Date(2026, 8, 5);
    expect(toPickerDate('', today)).toEqual(d(2026, 9, 5));
  });

  it('bozuk metinde bugüne düşer', () => {
    const today = new Date(2026, 8, 5);
    expect(toPickerDate('abc', today)).toEqual(d(2026, 9, 5));
    expect(toPickerDate('2026-13-01', today)).toEqual(d(2026, 9, 5));
  });

  it('var olmayan günü ayın son gününe kırpar', () => {
    expect(toPickerDate('2026-02-31')).toEqual(d(2026, 2, 28));
  });
});

describe('stepDay', () => {
  // Regresyon (W-06): changeDay -> changeMonth zincirinde changeMonth bayat
  // günü okuyor ve son yazan kazanıyordu; 31 Ocak'ta "gün ileri" 1 Şubat
  // yerine 28 Şubat'a atlıyordu.
  it('ayın son gününden sonraki ayın İLK gününe geçer', () => {
    expect(stepDay(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 1));
    expect(stepDay(d(2026, 3, 31), 1)).toEqual(d(2026, 4, 1));
    expect(stepDay(d(2026, 5, 31), 1)).toEqual(d(2026, 6, 1));
    expect(stepDay(d(2026, 8, 31), 1)).toEqual(d(2026, 9, 1));
    expect(stepDay(d(2026, 10, 31), 1)).toEqual(d(2026, 11, 1));
  });

  it('Şubat sonundan Mart 1e geçer (artık yıl dahil)', () => {
    expect(stepDay(d(2026, 2, 28), 1)).toEqual(d(2026, 3, 1));
    expect(stepDay(d(2028, 2, 28), 1)).toEqual(d(2028, 2, 29));
    expect(stepDay(d(2028, 2, 29), 1)).toEqual(d(2028, 3, 1));
  });

  it('yıl sonundan yeni yılın ilk gününe geçer', () => {
    expect(stepDay(d(2026, 12, 31), 1)).toEqual(d(2027, 1, 1));
  });

  it('ayın ilk gününden önceki ayın SON gününe geçer', () => {
    expect(stepDay(d(2026, 3, 1), -1)).toEqual(d(2026, 2, 28));
    expect(stepDay(d(2028, 3, 1), -1)).toEqual(d(2028, 2, 29));
    expect(stepDay(d(2027, 1, 1), -1)).toEqual(d(2026, 12, 31));
  });

  it('ay içinde normal ilerler', () => {
    expect(stepDay(d(2026, 9, 5), 1)).toEqual(d(2026, 9, 6));
    expect(stepDay(d(2026, 9, 5), -1)).toEqual(d(2026, 9, 4));
  });

  it('yıl sınırlarını aşmaz', () => {
    expect(stepDay(d(MAX_PICKER_YEAR, 12, 31), 1)).toEqual(d(MAX_PICKER_YEAR, 12, 31));
    expect(stepDay(d(MIN_PICKER_YEAR, 1, 1), -1)).toEqual(d(MIN_PICKER_YEAR, 1, 1));
  });
});

describe('stepMonth', () => {
  it('kısa aya geçerken günü kırpar', () => {
    expect(stepMonth(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 28));
    expect(stepMonth(d(2028, 1, 31), 1)).toEqual(d(2028, 2, 29));
    expect(stepMonth(d(2026, 3, 31), 1)).toEqual(d(2026, 4, 30));
  });

  it('yıl sınırında ay döner', () => {
    expect(stepMonth(d(2026, 12, 15), 1)).toEqual(d(2027, 1, 15));
    expect(stepMonth(d(2026, 1, 15), -1)).toEqual(d(2025, 12, 15));
  });

  it('yıl aralığı dışına çıkmaz', () => {
    expect(stepMonth(d(MAX_PICKER_YEAR, 12, 15), 1)).toEqual(d(MAX_PICKER_YEAR, 12, 15));
    expect(stepMonth(d(MIN_PICKER_YEAR, 1, 15), -1)).toEqual(d(MIN_PICKER_YEAR, 1, 15));
  });
});

describe('stepYear', () => {
  // Regresyon (W-07): changeYear günü hiç kırpmıyordu; 29 Şubat 2028'de yıl
  // ileri "2029-02-29" kaydediyordu ve parseDate bunu 1 Mart'a taşıdığı için
  // görevler gösterilen günde bulunamıyordu.
  it('artık yıldan normal yıla geçerken 29 Şubatı kırpar', () => {
    expect(stepYear(d(2028, 2, 29), 1)).toEqual(d(2029, 2, 28));
  });

  it('normal yıldan artık yıla geçerken günü korur', () => {
    expect(stepYear(d(2027, 2, 28), 1)).toEqual(d(2028, 2, 28));
  });

  it('yıl aralığı dışına çıkmaz', () => {
    expect(stepYear(d(MAX_PICKER_YEAR, 6, 1), 1)).toEqual(d(MAX_PICKER_YEAR, 6, 1));
    expect(stepYear(d(MIN_PICKER_YEAR, 6, 1), -1)).toEqual(d(MIN_PICKER_YEAR, 6, 1));
  });
});

describe('üretilen tarihlerin geçerliliği', () => {
  // Regresyon (W-05/W-07): seçiciden "2026-02-31" gibi var olmayan bir gün
  // çıkabiliyor ve o anahtara yazılan görevler hiçbir günde görünmüyordu.
  it('her adım sonrası tarih parseDate/formatDate turunda sabit kalır', () => {
    let current = d(2026, 1, 31);
    const steps: PickerDate[] = [];

    for (let i = 0; i < 14; i++) current = stepMonth(current, 1);
    steps.push(current);
    for (let i = 0; i < 40; i++) current = stepDay(current, 1);
    steps.push(current);
    for (let i = 0; i < 3; i++) current = stepYear(current, 1);
    steps.push(current);
    for (let i = 0; i < 60; i++) current = stepDay(current, -1);
    steps.push(current);

    for (const step of steps) {
      const iso = fromPickerDate(step);
      expect(formatDate(parseDate(iso))).toBe(iso);
    }
  });

  it('rastgele adım dizisi hiç geçersiz tarih üretmez', () => {
    let current = d(2026, 1, 31);
    const stepFns = [
      (p: PickerDate) => stepDay(p, 1),
      (p: PickerDate) => stepDay(p, -1),
      (p: PickerDate) => stepMonth(p, 1),
      (p: PickerDate) => stepMonth(p, -1),
      (p: PickerDate) => stepYear(p, 1),
      (p: PickerDate) => stepYear(p, -1),
    ];

    for (let i = 0; i < 400; i++) {
      current = stepFns[i % stepFns.length](current);
      const iso = fromPickerDate(current);
      expect(formatDate(parseDate(iso))).toBe(iso);
      expect(current.year).toBeGreaterThanOrEqual(MIN_PICKER_YEAR);
      expect(current.year).toBeLessThanOrEqual(MAX_PICKER_YEAR);
    }
  });
});
