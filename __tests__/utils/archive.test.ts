import { buildArchiveMonths, summarizeArchive } from '../../src/utils/archive';
import { getToday } from '../../src/utils/dateUtils';
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

  // Regresyon (R-042): `today` varsayılanı getToday() ile YEREL tarihten
  // gelir. Biri bunu toISOString() tabanlı bir hesapla değiştirirse arşivin
  // penceresi kayar. Bu hata sınıfı projede iki kez yaşandı (haftalık grafik
  // ve CI saat dilimi), bu yüzden ayrıca kilitleniyor.
  //
  // jest.config.js TZ'yi Europe/Istanbul'a (UTC+3) sabitler. UTC 21:30'da
  // yerel gün çoktan ertesi güne geçmiştir:
  //   yerel bugün = 2026-09-10  →  2026-09-09 GEÇMİŞTİR, arşivde olmalı
  //   UTC bugün   = 2026-09-09  →  2026-09-09 "bugün" sayılır, DIŞLANIR
  describe('gece yarısı / UTC koruması', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('bugünü YEREL tarihe göre belirler (varsayılan parametre)', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-09T21:30:00Z'));

      // Ön koşul: bu anda UTC günü ile yerel gün gerçekten ayrışıyor
      expect(new Date().toISOString().split('T')[0]).toBe('2026-09-09');
      expect(getToday()).toBe('2026-09-10');

      const plans: Plans = {
        '2026-09-09': day(2, 1), // yerel olarak DÜN
        '2026-09-10': day(5),    // yerel olarak BUGÜN — arşivde olmamalı
      };

      // `today` bilerek verilmiyor: varsayılanın yerel tarihi kullandığını sınıyoruz
      const months = buildArchiveMonths(plans);

      expect(months.map(m => m.key)).toEqual(['2026-09']);
      expect(months[0].days.map(d => d.date)).toEqual(['2026-09-09']);
      expect(months[0].total).toBe(3);
    });

    it('yerel gün yıl sınırını geçerken de doğru pencereyi seçer', () => {
      // UTC 2026-12-31 21:30 → Istanbul 2027-01-01 00:30
      jest.useFakeTimers().setSystemTime(new Date('2026-12-31T21:30:00Z'));

      expect(new Date().toISOString().split('T')[0]).toBe('2026-12-31');
      expect(getToday()).toBe('2027-01-01');

      const plans: Plans = {
        '2026-12-31': day(1), // yerel olarak DÜN → arşivde
        '2027-01-01': day(4), // yerel olarak BUGÜN → arşiv dışı
      };

      const months = buildArchiveMonths(plans);

      expect(months.map(m => m.key)).toEqual(['2026-12']);
      expect(months[0].days.map(d => d.date)).toEqual(['2026-12-31']);
    });
  });

  it('eksik gün listelerinde çökmez', () => {
    const plans = { '2026-09-08': undefined } as unknown as Plans;
    expect(() => buildArchiveMonths(plans, TODAY)).not.toThrow();
  });

  /**
   * PERFORMANS KORUMASI — neden süre eşiği DEĞİL:
   *
   * Önceki test 1500 günü 1000 ms sınırıyla ölçüyordu; gerçek maliyet ~4 ms,
   * yani eşik 240 katıydı ve hiçbir regresyonu yakalayamazdı. Eşiği gerçek
   * sürenin ~10 katına çekmek de çözüm değil: paylaşımlı CI makinelerinde
   * duvar saati ölçümü doğal olarak oynak, bu da testi ya gevşek ya da
   * kırılgan yapardı.
   *
   * Bunun yerine korunması gereken ASIL şeyi doğruluyoruz: algoritmanın
   * plans üzerinde TEK GEÇİŞ yapması. Gruplama Map ile yapılıyor; biri bunu
   * ay başına arama yapan bir kurguya çevirse (ör. döngü içinde
   * `months.find(...)`) maliyet karesel olurdu. Erişim sayısı deterministik
   * ölçüldüğü için bu koruma makine hızından bağımsız.
   */
  describe('performans koruması (algoritmik)', () => {
    /** plans üzerindeki gün okumalarını sayan Proxy. */
    const countingPlans = (plans: Plans) => {
      const reads: string[] = [];
      const proxy = new Proxy(plans, {
        get(target, prop, receiver) {
          if (typeof prop === 'string') reads.push(prop);
          return Reflect.get(target, prop, receiver);
        },
      });
      return { proxy: proxy as Plans, reads };
    };

    const makePlans = (dayCount: number): Plans => {
      const plans: Plans = {};
      const start = new Date(2021, 0, 1);
      for (let i = 0; i < dayCount; i++) {
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        plans[key] = day(1, 1);
      }
      return plans;
    };

    it('her günü en fazla BİR kez okur (tek geçiş)', () => {
      const plans = makePlans(1500);
      const dayCount = Object.keys(plans).length;
      const { proxy, reads } = countingPlans(plans);

      const months = buildArchiveMonths(proxy, TODAY);

      expect(months.length).toBeGreaterThan(40);
      expect(reads.length).toBeLessThanOrEqual(dayCount);
      // Aynı gün iki kez okunmamalı
      expect(new Set(reads).size).toBe(reads.length);
    });

    it('gün sayısı 4 katına çıkınca okuma sayısı da ~4 katına çıkar (karesel değil)', () => {
      const small = countingPlans(makePlans(200));
      const large = countingPlans(makePlans(800));

      buildArchiveMonths(small.proxy, TODAY);
      buildArchiveMonths(large.proxy, TODAY);

      const ratio = large.reads.length / small.reads.length;
      // Doğrusalda ~4; karesel bir kurguda ~16 ve üzeri olurdu.
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(6);
    });
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
