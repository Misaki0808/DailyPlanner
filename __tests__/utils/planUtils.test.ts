import { findFirstEmptyDate } from '../../src/utils/planUtils';
import { Plans, Task } from '../../src/types';

const task = (id: string): Task => ({ id, title: `Görev ${id}`, done: false });

describe('findFirstEmptyDate', () => {
  it('başlangıç günü boşsa o günü döndürür', () => {
    expect(findFirstEmptyDate({}, '2026-09-05')).toBe('2026-09-05');
  });

  it('dolu günleri atlayıp ilk boş günü döndürür', () => {
    const plans: Plans = {
      '2026-09-05': [task('1')],
      '2026-09-06': [task('2')],
    };
    expect(findFirstEmptyDate(plans, '2026-09-05')).toBe('2026-09-07');
  });

  it('boş dizi tutan günü dolu saymaz', () => {
    const plans: Plans = { '2026-09-05': [] };
    expect(findFirstEmptyDate(plans, '2026-09-05')).toBe('2026-09-05');
  });

  it('ay sınırını doğru geçer', () => {
    const plans: Plans = {
      '2026-01-30': [task('1')],
      '2026-01-31': [task('2')],
    };
    expect(findFirstEmptyDate(plans, '2026-01-30')).toBe('2026-02-01');
  });

  it('yıl sınırını doğru geçer', () => {
    const plans: Plans = { '2026-12-31': [task('1')] };
    expect(findFirstEmptyDate(plans, '2026-12-31')).toBe('2027-01-01');
  });

  it('bir yıl boyunca boş gün yoksa başlangıç gününe döner', () => {
    const plans: Plans = {};
    let date = '2026-09-05';
    for (let i = 0; i < 365; i++) {
      plans[date] = [task(String(i))];
      const [y, m, d] = date.split('-').map(Number);
      const next = new Date(y, m - 1, d + 1);
      date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
    expect(findFirstEmptyDate(plans, '2026-09-05')).toBe('2026-09-05');
  });
});
