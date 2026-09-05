import {
  getToday,
  getTomorrow,
  addDays,
  formatDate,
  parseDate,
  formatDateDisplay,
  getDaysInMonth,
  clampDayToMonth,
  toDateString,
} from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('getToday', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    // jest.setup.js TZ'yi Europe/Istanbul (UTC+3) olarak sabitler.
    // Gece yarısı ile 03:00 arasında UTC günü ile yerel gün AYRIŞIR;
    // planlar yerel güne göre anahtarlandığı için getToday yerel günü vermeli.
    it('gece yarısından sonra UTC gününü değil YEREL günü döndürür', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-05T22:30:00Z')); // Istanbul: 06.09 01:30
      try {
        expect(new Date().toISOString().split('T')[0]).toBe('2026-09-05'); // UTC hâlâ 5'i
        expect(getToday()).toBe('2026-09-06');
        expect(getTomorrow()).toBe('2026-09-07');
      } finally {
        jest.useRealTimers();
      }
    });

    it('yıl sınırında da yerel günü döndürür', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-12-31T21:10:00Z')); // Istanbul: 01.01.2027 00:10
      try {
        expect(new Date().toISOString().split('T')[0]).toBe('2026-12-31');
        expect(getToday()).toBe('2027-01-01');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('formatDate / parseDate', () => {
    it('gidiş dönüş dönüşümü tarihi değiştirmez', () => {
      for (const iso of ['2026-01-01', '2026-02-29', '2028-02-29', '2026-12-31', '2026-06-15']) {
        const parsed = parseDate(iso);
        if (iso === '2026-02-29') {
          // 2026 artık yıl değil: 29 Şubat 1 Mart'a taşar
          expect(formatDate(parsed)).toBe('2026-03-01');
        } else {
          expect(formatDate(parsed)).toBe(iso);
        }
      }
    });

    it('parseDate yerel gece yarısını üretir (UTC kaymaz)', () => {
      const d = parseDate('2026-09-05');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8);
      expect(d.getDate()).toBe(5);
      expect(d.getHours()).toBe(0);
    });
  });

  describe('getDaysInMonth', () => {
    it('ay uzunluklarını doğru verir', () => {
      expect(getDaysInMonth(2026, 1)).toBe(31);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2026, 4)).toBe(30);
      expect(getDaysInMonth(2026, 12)).toBe(31);
    });

    it('artık yılda Şubat 29 gündür', () => {
      expect(getDaysInMonth(2028, 2)).toBe(29);
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2100, 2)).toBe(28); // 100'e bölünen ama 400'e bölünmeyen yıl
      expect(getDaysInMonth(2000, 2)).toBe(29);
    });
  });

  describe('clampDayToMonth', () => {
    it('ayın son gününü aşan günü kırpar', () => {
      expect(clampDayToMonth(2026, 2, 31)).toBe(28);
      expect(clampDayToMonth(2028, 2, 31)).toBe(29);
      expect(clampDayToMonth(2026, 4, 31)).toBe(30);
    });

    it('geçerli günü değiştirmez', () => {
      expect(clampDayToMonth(2026, 1, 31)).toBe(31);
      expect(clampDayToMonth(2026, 9, 5)).toBe(5);
    });

    it("1'den küçük günü 1'e çeker", () => {
      expect(clampDayToMonth(2026, 3, 0)).toBe(1);
      expect(clampDayToMonth(2026, 3, -4)).toBe(1);
    });
  });

  describe('toDateString', () => {
    it('her zaman var olan bir takvim günü üretir', () => {
      expect(toDateString(2026, 2, 31)).toBe('2026-02-28');
      expect(toDateString(2028, 2, 29)).toBe('2028-02-29');
      expect(toDateString(2029, 2, 29)).toBe('2029-02-28');
      expect(toDateString(2026, 9, 5)).toBe('2026-09-05');
    });

    it('ay ve günü iki haneye tamamlar', () => {
      expect(toDateString(2026, 1, 1)).toBe('2026-01-01');
    });

    it('ürettiği tarih parseDate/formatDate turunda sabit kalır', () => {
      const iso = toDateString(2026, 2, 31);
      expect(formatDate(parseDate(iso))).toBe(iso);
    });
  });

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const start = '2023-01-01';
      expect(addDays(start, 5)).toBe('2023-01-06');
    });

    it('should subtract days correctly', () => {
      const start = '2023-01-10';
      expect(addDays(start, -5)).toBe('2023-01-05');
    });

    it('should handle month crossovers', () => {
      const start = '2023-01-30';
      expect(addDays(start, 2)).toBe('2023-02-01');
    });

    it('should handle leap years correctly', () => {
      const start = '2024-02-28';
      expect(addDays(start, 1)).toBe('2024-02-29');
    });
  });

  describe('formatDateDisplay', () => {
    it('should format dates nicely', () => {
      const date = '2026-05-28';
      const formatted = formatDateDisplay(date);
      expect(formatted).toContain('2026');
      expect(typeof formatted).toBe('string');
    });
  });
});
