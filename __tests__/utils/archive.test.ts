import { buildArchiveMonths, summarizeArchive } from '../../src/utils/archive';
import { Plans, Task } from '../../src/types';

const task = (id: string, done: boolean): Task => ({ id, title: `Görev ${id}`, done });
const day = (done: number, open = 0): Task[] => [
  ...Array.from({ length: done }, (_, i) => task(`d${i}`, true)),
  ...Array.from({ length: open }, (_, i) => task(`o${i}`, false)),
];

const TODAY = '2026-09-10';

describe('buildArchiveMonths', () => {
  it('geçmiş günleri aya göre gruplar', () => {
    const plans: Plans = {
      '2026-09-08': day(1),
      '2026-09-02': day(2),
      '2026-08-30': day(1),
    };

    const months = buildArchiveMonths(plans, TODAY);

    expect(months.map(m => m.key)).toEqual(['2026-09', '2026-08']);
    expect(months[0].days.map(d => d.date)).toEqual(['2026-09-08', '2026-09-02']);
  });

  it('ayları ve günleri YENİDEN ESKİYE sıralar', () => {
    const plans: Plans = {
      '2026-07-01': day(1),
      '2026-09-09': day(1),
      '2026-08-15': day(1),
      '2026-09-01': day(1),
    };

    const months = buildArchiveMonths(plans, TODAY);

    expect(months.map(m => m.key)).toEqual(['2026-09', '2026-08', '2026-07']);
    expect(months[0].days.map(d => d.date)).toEqual(['2026-09-09', '2026-09-01']);
  });

  // Kapsam kararı: arşiv GEÇMİŞİ gösterir; bugün ve ileri tarihler
  // Planlarım/Takvim ekranlarının işi.
  it('bugünü ve ileri tarihleri dışarıda bırakır', () => {
    const plans: Plans = {
      '2026-09-08': day(1),
      [TODAY]: day(5),
      '2026-09-20': day(3),
    };

    const months = buildArchiveMonths(plans, TODAY);

    expect(months).toHaveLength(1);
    expect(months[0].days.map(d => d.date)).toEqual(['2026-09-08']);
  });

  it('görevi olmayan günleri atlar', () => {
    const plans: Plans = { '2026-09-08': [], '2026-09-07': day(1) };

    const months = buildArchiveMonths(plans, TODAY);

    expect(months[0].days.map(d => d.date)).toEqual(['2026-09-07']);
  });

  it('gün başına tamamlanma özetini hesaplar', () => {
    const plans: Plans = { '2026-09-08': day(3, 1) };

    const [month] = buildArchiveMonths(plans, TODAY);

    expect(month.days[0]).toMatchObject({ total: 4, completed: 3, percentage: 75 });
  });

  it('ay toplamlarını gün toplamlarından türetir', () => {
    const plans: Plans = {
      '2026-09-08': day(3, 1),
      '2026-09-05': day(1, 1),
    };

    const [month] = buildArchiveMonths(plans, TODAY);

    expect(month).toMatchObject({ total: 6, completed: 4, percentage: 67 });
  });

  it('gün etiketini Türkçe biçimde üretir', () => {
    const plans: Plans = { '2026-09-05': day(1) };

    const [month] = buildArchiveMonths(plans, TODAY);

    expect(month.label).toContain('Eylül');
    expect(month.label).toContain('2026');
    expect(month.days[0].label).toContain('5');
    expect(month.days[0].label).toContain('Eylül');
  });

  it('yıl sınırını doğru gruplar', () => {
    const plans: Plans = { '2025-12-31': day(1), '2026-01-02': day(1) };

    const months = buildArchiveMonths(plans, '2026-01-10');

    expect(months.map(m => m.key)).toEqual(['2026-01', '2025-12']);
  });

  it('hiç geçmiş yoksa boş liste döner', () => {
    expect(buildArchiveMonths({}, TODAY)).toEqual([]);
    expect(buildArchiveMonths({ [TODAY]: day(3) }, TODAY)).toEqual([]);
  });

  it('eksik gün listelerinde çökmez', () => {
    const plans = { '2026-09-08': undefined } as unknown as Plans;
    expect(() => buildArchiveMonths(plans, TODAY)).not.toThrow();
  });

  it('çok sayıda günü makul sürede gruplar', () => {
    const plans: Plans = {};
    const start = new Date(2021, 0, 1);
    for (let i = 0; i < 1500; i++) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      plans[key] = day(1, 1);
    }

    const began = Date.now();
    const months = buildArchiveMonths(plans, TODAY);

    expect(months.length).toBeGreaterThan(40);
    expect(Date.now() - began).toBeLessThan(1000);
  });
});

describe('summarizeArchive', () => {
  it('ay, gün ve görev toplamlarını verir', () => {
    const plans: Plans = {
      '2026-09-08': day(3, 1),
      '2026-08-20': day(1, 1),
    };

    const summary = summarizeArchive(buildArchiveMonths(plans, TODAY));

    expect(summary).toMatchObject({
      monthCount: 2,
      dayCount: 2,
      total: 6,
      completed: 4,
      percentage: 67,
      oldestDate: '2026-08-20',
    });
  });

  it('boş arşivde sıfıra bölme yapmaz', () => {
    expect(summarizeArchive([])).toMatchObject({
      monthCount: 0, dayCount: 0, total: 0, completed: 0, percentage: 0, oldestDate: null,
    });
  });
});
