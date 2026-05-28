import { getToday, addDays, formatDateDisplay } from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  describe('getToday', () => {
    it('should return a string in YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
