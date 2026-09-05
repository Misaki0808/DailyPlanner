import { clampDayToMonth } from '../../src/utils/dateUtils';

/**
 * appStore.syncRecurringForToday, aylık tekrarlayan görevin hedef gününü
 * clampDayToMonth ile ayın uzunluğuna kırpıp o günün gün numarasıyla
 * karşılaştırır. Aşağıdaki testler bu kuralın kısa aylarda tetiklendiğini
 * doğrular: eskiden tam eşitlik arandığı için "her ayın 31'i" 12 ayın
 * 5'inde hiç çalışmıyordu.
 */
const firesOn = (monthDay: number, year: number, month: number, dayOfMonth: number) =>
  clampDayToMonth(year, month, monthDay) === dayOfMonth;

describe('aylık tekrarlayan görev tetikleme günü', () => {
  it('"her ayın 31i" 31 çeken aylarda 31inde tetiklenir', () => {
    expect(firesOn(31, 2026, 1, 31)).toBe(true);  // Ocak
    expect(firesOn(31, 2026, 3, 31)).toBe(true);  // Mart
    expect(firesOn(31, 2026, 12, 31)).toBe(true); // Aralık
  });

  it('"her ayın 31i" kısa aylarda ayın SON gününde tetiklenir', () => {
    expect(firesOn(31, 2026, 2, 28)).toBe(true);  // Şubat 2026 (28 gün)
    expect(firesOn(31, 2028, 2, 29)).toBe(true);  // Şubat 2028 (artık yıl)
    expect(firesOn(31, 2026, 4, 30)).toBe(true);  // Nisan
    expect(firesOn(31, 2026, 9, 30)).toBe(true);  // Eylül
    expect(firesOn(31, 2026, 11, 30)).toBe(true); // Kasım
  });

  it('"her ayın 30u" Şubatta ayın son gününde tetiklenir', () => {
    expect(firesOn(30, 2026, 2, 28)).toBe(true);
    expect(firesOn(30, 2028, 2, 29)).toBe(true);
    expect(firesOn(30, 2026, 4, 30)).toBe(true);
  });

  it('kısa ayda ayın son gününden ÖNCE tetiklenmez', () => {
    expect(firesOn(31, 2026, 2, 27)).toBe(false);
    expect(firesOn(31, 2026, 4, 29)).toBe(false);
  });

  it('normal bir hedef gün yalnız o gün tetiklenir', () => {
    expect(firesOn(15, 2026, 2, 15)).toBe(true);
    expect(firesOn(15, 2026, 2, 14)).toBe(false);
    expect(firesOn(15, 2026, 2, 16)).toBe(false);
  });

  it('"her ayın 31i" bir yılın 12 ayında da tetiklenir', () => {
    const daysInMonth2026 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const firedMonths = daysInMonth2026.filter((lastDay, index) =>
      firesOn(31, 2026, index + 1, lastDay)
    );
    expect(firedMonths).toHaveLength(12);
  });
});
