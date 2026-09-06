import { extractTimesLocal } from '../../src/utils/timeParser';

describe('extractTimesLocal', () => {
  it('extracts HH:MM and Turkish suffix hour patterns', () => {
    expect(extractTimesLocal("8'de markete git, 14:30'da toplantı var")).toEqual([
      { hour: 8, minute: 0, label: 'Markete git' },
      { hour: 14, minute: 30, label: 'Toplantı var' },
    ]);
  });

  it('maps day period words with numbers to 24-hour time', () => {
    expect(extractTimesLocal("Sabah 8'de kalkacağım. Akşam 7'de spor. Gece 11'de yat.")).toEqual([
      { hour: 8, minute: 0, label: 'Kalkacağım' },
      { hour: 19, minute: 0, label: 'Spor' },
      { hour: 23, minute: 0, label: 'Yat' },
    ]);
  });

  it('handles noon words as a concrete 12:00 reference', () => {
    expect(extractTimesLocal('Öğlen yemek ye')).toEqual([
      { hour: 12, minute: 0, label: 'Yemek ye' },
    ]);
    expect(extractTimesLocal('öğle de ilaç al')).toEqual([
      { hour: 12, minute: 0, label: 'İlaç al' },
    ]);
  });

  it('does not extract vague period-only expressions except noon', () => {
    expect(extractTimesLocal('Sabah spor yap, akşam kitap oku, gece çalış')).toEqual([]);
  });

  it('keeps minutes from period based time expressions', () => {
    expect(extractTimesLocal("akşam 7:45'te yürüyüş yap")).toEqual([
      { hour: 19, minute: 45, label: 'Yürüyüş yap' },
    ]);
  });

  // Regresyon: PERIOD_HOUR_REGEX `\b` ile başlıyordu. JavaScript'te `\b`
  // ASCII kelime sınırıdır ve "ö" ASCII harf olmadığı için "öğlen"/"öğle"
  // kalıbı HİÇ eşleşmiyordu. Girdi SUFFIX_HOUR_REGEX'e düşüyor ve öğleden
  // sonrası sabaha çevriliyordu: "öğlen 3'te toplantı" -> 03:00 (15:00 yerine),
  // yani kurulan alarm 12 saat yanlıştı.
  describe('öğle/öğlen saatleri (Unicode kelime sınırı regresyonu)', () => {
    it("öğlen 1-5 arası saatleri öğleden sonraya çevirir", () => {
      expect(extractTimesLocal("öğlen 3'te kahve")).toEqual([
        { hour: 15, minute: 0, label: 'Kahve' },
      ]);
      expect(extractTimesLocal("öğle 2'de toplantı")).toEqual([
        { hour: 14, minute: 0, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal("Öğlen 5'te spor")).toEqual([
        { hour: 17, minute: 0, label: 'Spor' },
      ]);
    });

    it('cümle başında olmayan öğlen ifadesini de yakalar', () => {
      expect(extractTimesLocal("bugün öğlen 3'te kahve")).toEqual([
        { hour: 15, minute: 0, label: 'Kahve' },
      ]);
    });

    it('öğlen ile verilen 24 saat biçimini olduğu gibi bırakır', () => {
      expect(extractTimesLocal("öğlen 14'te toplantı")).toEqual([
        { hour: 14, minute: 0, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal("öğlen 12:30'da yemek")).toEqual([
        { hour: 12, minute: 30, label: 'Yemek' },
      ]);
    });
  });

  describe('gün dilimi eşlemeleri', () => {
    it('gece 12yi gece yarısına çevirir', () => {
      expect(extractTimesLocal("gece 12'de yat")).toEqual([
        { hour: 0, minute: 0, label: 'Yat' },
      ]);
    });

    it('gece 1-5 arasını olduğu gibi bırakır', () => {
      expect(extractTimesLocal("gece 2'de uyan")).toEqual([
        { hour: 2, minute: 0, label: 'Uyan' },
      ]);
    });

    it('gece 6-11 arasını akşama çevirir', () => {
      expect(extractTimesLocal("gece 9'da film")).toEqual([
        { hour: 21, minute: 0, label: 'Film' },
      ]);
    });

    it('akşam ile verilen 24 saat biçimini korur', () => {
      expect(extractTimesLocal("akşam 18'de spor")).toEqual([
        { hour: 18, minute: 0, label: 'Spor' },
      ]);
    });
  });

  describe('geçersiz ve sınır girdiler', () => {
    it('geçersiz saat/dakika değerlerini yok sayar', () => {
      expect(extractTimesLocal("saat 25:00'te toplantı")).toEqual([]);
      expect(extractTimesLocal("9:75'te toplantı")).toEqual([]);
    });

    it('boş ve saat içermeyen metinde boş liste döndürür', () => {
      expect(extractTimesLocal('')).toEqual([]);
      expect(extractTimesLocal('   ')).toEqual([]);
      expect(extractTimesLocal('hiç saat yok burada')).toEqual([]);
    });

    it('gün sınırlarını doğru okur', () => {
      expect(extractTimesLocal("00:00'da yeni yıl")).toEqual([
        { hour: 0, minute: 0, label: 'Yeni yıl' },
      ]);
      expect(extractTimesLocal("23:59'da uyu")).toEqual([
        { hour: 23, minute: 59, label: 'Uyu' },
      ]);
    });

    it('etiket bulunamazsa varsayılan etiketi kullanır', () => {
      expect(extractTimesLocal('saat 14:00')).toEqual([
        { hour: 14, minute: 0, label: 'Hatırlatma' },
      ]);
    });

    it('ondalık sayıyı saat sanmaz', () => {
      expect(extractTimesLocal('1.5 litre su iç')).toEqual([]);
    });
  });

  // Regresyon (R-031): nokta Türkçe'de hem saat hem ondalık ayracı. Eskiden
  // "3.45" bağlamdan bağımsız saat sayılıyor ve "3.45 TL öde" görevi için
  // gece 03:45'e alarm kuruluyordu.
  describe('noktalı yazım: saat mi, ondalık sayı mı', () => {
    it('para tutarını saat SAYMAZ', () => {
      expect(extractTimesLocal('3.45 TL öde')).toEqual([]);
      expect(extractTimesLocal('12.50 lira ver')).toEqual([]);
      expect(extractTimesLocal('5.25 euro')).toEqual([]);
      expect(extractTimesLocal('3.45₺ öde')).toEqual([]);
      expect(extractTimesLocal('3.45 kuruş')).toEqual([]);
    });

    it('iki haneli saat bile olsa para birimi geliyorsa saat saymaz', () => {
      // "12.50" tek başına geçerli bir saat yazımı; ayırt eden şey para birimi.
      expect(extractTimesLocal('12.50 TL ödeme yap')).toEqual([]);
      expect(extractTimesLocal('12.50 toplantı')).toEqual([
        { hour: 12, minute: 50, label: 'Toplantı' },
      ]);
    });

    it('para birimi olmayan ondalık sayıları da saat saymaz', () => {
      expect(extractTimesLocal('Sürüm 1.20 çıktı')).toEqual([]);
      expect(extractTimesLocal('Kilo 75.40 kg')).toEqual([]);
      expect(extractTimesLocal('Fatura 125.90 TL')).toEqual([]);
    });

    it('Türkçe bulunma hâli ekiyle yazılanı saat SAYAR', () => {
      expect(extractTimesLocal("3.45'te toplantı")).toEqual([
        { hour: 3, minute: 45, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal("14.30'da toplantı")).toEqual([
        { hour: 14, minute: 30, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal('14.30 da toplantı')).toEqual([
        { hour: 14, minute: 30, label: 'Toplantı' },
      ]);
    });

    it('"saat" öneki varsa tek haneli olsa da saat SAYAR', () => {
      expect(extractTimesLocal('saat 3.45 toplantı')).toEqual([
        { hour: 3, minute: 45, label: 'Toplantı' },
      ]);
    });

    it('iki haneli saat yazımını (09.30 / 14.30) saat SAYAR', () => {
      expect(extractTimesLocal('Toplantı 09.30')).toEqual([
        { hour: 9, minute: 30, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal('14.30 toplantı')).toEqual([
        { hour: 14, minute: 30, label: 'Toplantı' },
      ]);
    });

    it('gün dilimiyle birlikte noktalı yazımı saat SAYAR', () => {
      expect(extractTimesLocal("sabah 9.30'da kalk")).toEqual([
        { hour: 9, minute: 30, label: 'Kalk' },
      ]);
    });

    // Regresyon (R-034): iki haneli noktalı sayı bağlamsız da saat sayılıyordu;
    // "koli 12.30 kg" görevi için 12:30'a alarm kuruluyordu. Ayırt edici sayının
    // kendisi değil, ardından gelen BİRİM — "14.30 toplantı" ile "12.30 kg"
    // aynı şekle sahip.
    it('ardından birim gelen iki haneli sayıyı saat SAYMAZ', () => {
      expect(extractTimesLocal('koli 12.30 kg')).toEqual([]);
      expect(extractTimesLocal('Boy 18.45 cm')).toEqual([]);
      expect(extractTimesLocal('Sıcaklık 21.30 derece')).toEqual([]);
      expect(extractTimesLocal('Mesafe 10.50 km')).toEqual([]);
      expect(extractTimesLocal('Not 18.50 puan')).toEqual([]);
      expect(extractTimesLocal('Bütçe 15.40 milyon')).toEqual([]);
    });

    it('süre birimlerini saat SAYMAZ', () => {
      expect(extractTimesLocal('10.30 dakika koş')).toEqual([]);
      expect(extractTimesLocal('12.15 saat çalış')).toEqual([]);
    });

    it('tanımlayıcı sözcüğünden sonraki sayıyı saat SAYMAZ', () => {
      expect(extractTimesLocal('Sürüm 10.20 çıktı')).toEqual([]);
      expect(extractTimesLocal('Versiyon 14.30 yayınlandı')).toEqual([]);
      expect(extractTimesLocal('Model 12.30')).toEqual([]);
    });

    // Türkçe'de saatten önce isim gelmesi çok yaygın; tanımlayıcı listesi bu
    // yüzden dar tutuldu ve yalnız bağlamsız yazıma uygulanıyor.
    it('saatten önce gelen sıradan isimleri etkilemez', () => {
      expect(extractTimesLocal('Toplantı 18.45')).toEqual([
        { hour: 18, minute: 45, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal('Ders 14.30')).toEqual([
        { hour: 14, minute: 30, label: 'Ders' },
      ]);
      expect(extractTimesLocal('Maç 20.45')).toEqual([
        { hour: 20, minute: 45, label: 'Maç' },
      ]);
    });

    it('açık saat işareti tanımlayıcı korumasını geçersiz kılar', () => {
      // "10.20'de" bulunma hâli eki net bir saat işareti; tanımlayıcıya bakılmaz.
      expect(extractTimesLocal("Sürüm 10.20'de çıkacak")).toEqual([
        { hour: 10, minute: 20, label: 'Çıkacak' },
      ]);
    });

    it('iki nokta ayracı her zaman saattir (bağlam aranmaz)', () => {
      expect(extractTimesLocal('14:30 toplantı')).toEqual([
        { hour: 14, minute: 30, label: 'Toplantı' },
      ]);
      expect(extractTimesLocal('3:45 toplantı')).toEqual([
        { hour: 3, minute: 45, label: 'Toplantı' },
      ]);
    });
  });
});
