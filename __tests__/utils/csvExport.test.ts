import { buildPlansCsv, UTF8_BOM } from '../../src/utils/csvExport';
import { Plans, Task } from '../../src/types';

const task = (over: Partial<Task> = {}): Task => ({
  id: '1', title: 'Rapor yaz', done: false, priority: 'high', category: 'is', ...over,
});

const rows = (csv: string) => csv.replace(UTF8_BOM, '').trimEnd().split('\n');

describe('buildPlansCsv', () => {
  it('Excel için UTF-8 BOM ile başlar', () => {
    // BOM olmadan Excel dosyayı yerel kod sayfasıyla açıyor ve
    // "Sağlık" -> "SaÄŸlÄ±k" gibi bozulmalar oluyor.
    expect(buildPlansCsv({}).startsWith(UTF8_BOM)).toBe(true);
  });

  it('plan yokken yalnız başlık satırı üretir', () => {
    expect(rows(buildPlansCsv({}))).toEqual(['Tarih,Gorev Basligi,Oncelik,Kategori,Durum,Not']);
  });

  it('görevi beklenen sütunlara yazar', () => {
    const plans: Plans = { '2026-09-05': [task({ done: true, note: 'acele' })] };
    expect(rows(buildPlansCsv(plans))[1]).toBe(
      '2026-09-05,"Rapor yaz",high,"İş",Tamamlandi,"acele"'
    );
  });

  it('tamamlanmamış görevi Bekliyor olarak yazar', () => {
    const plans: Plans = { '2026-09-05': [task()] };
    expect(rows(buildPlansCsv(plans))[1]).toContain(',Bekliyor,');
  });

  it('günleri en yeniden eskiye sıralar', () => {
    const plans: Plans = {
      '2026-09-03': [task({ title: 'Eski' })],
      '2026-09-07': [task({ title: 'Yeni' })],
      '2026-09-05': [task({ title: 'Orta' })],
    };
    expect(rows(buildPlansCsv(plans)).slice(1).map(r => r.split(',')[0])).toEqual([
      '2026-09-07', '2026-09-05', '2026-09-03',
    ]);
  });

  it('başlıktaki virgül satır yapısını bozmaz', () => {
    const plans: Plans = { '2026-09-05': [task({ title: 'Süt, ekmek ve yumurta al' })] };
    const dataRows = rows(buildPlansCsv(plans));
    expect(dataRows).toHaveLength(2);
    expect(dataRows[1]).toContain('"Süt, ekmek ve yumurta al"');
  });

  it('başlıktaki tırnakları ikileyerek kaçırır', () => {
    const plans: Plans = { '2026-09-05': [task({ title: 'Şu "acil" işi bitir' })] };
    expect(rows(buildPlansCsv(plans))[1]).toContain('"Şu ""acil"" işi bitir"');
  });

  it('eksik alanları güvenli varsayılanlarla doldurur', () => {
    const plans: Plans = { '2026-09-05': [{ id: '1', title: '', done: false }] };
    expect(rows(buildPlansCsv(plans))[1]).toBe('2026-09-05,"",low,"Diğer",Bekliyor,""');
  });

  it('bilinmeyen kategoriyi Diğer olarak yazar', () => {
    const plans: Plans = { '2026-09-05': [task({ category: 'olmayan-kategori' })] };
    expect(rows(buildPlansCsv(plans))[1]).toContain('"Diğer"');
  });

  it('boş gün listelerini atlar', () => {
    const plans: Plans = { '2026-09-05': [], '2026-09-06': [task()] };
    expect(rows(buildPlansCsv(plans))).toHaveLength(2);
  });
});
