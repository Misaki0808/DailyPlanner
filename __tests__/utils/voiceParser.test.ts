import { correctTranscriptLocal } from '../../src/utils/voiceParser';

describe('correctTranscriptLocal', () => {
  it('replaces known Turkish speech-recognition technical terms', () => {
    expect(correctTranscriptLocal('Başkent Evlatlarım databeys bağlantısını kontrol et')).toBe(
      'backend developer database bağlantısını kontrol et'
    );
    expect(correctTranscriptLocal('hey ay ile ey pi ay dokümantasyonu yaz')).toBe(
      'AI ile API dokümantasyonu yaz'
    );
  });

  it('uses simple fuzzy matching for close technical variants', () => {
    expect(correctTranscriptLocal('backennt frondand promp hazırla')).toBe(
      'backend frontend prompt hazırla'
    );
    expect(correctTranscriptLocal('freymvörk ripozitori dıploy akışını yaz')).toBe(
      'framework repository deploy akışını yaz'
    );
  });

  it('does not alter normal Turkish words', () => {
    const text = 'Bugün okulda yemek yiyeceğim ve akşam spor yapacağım';
    expect(correctTranscriptLocal(text)).toBe(text);
  });

  describe('yanlış düzeltmelere karşı koruma', () => {
    // Regresyon: "baskent" ile "backent" arasındaki Levenshtein uzaklığı 1
    // olduğu için gerçek bir Türkçe sözcük olan "başkent" bulanık eşleşmeyle
    // "backend"e çevriliyordu. Kullanıcının söylemediği bir metin üretmek,
    // düzeltmeyi kaçırmaktan daha kötü.
    it('gerçek bir sözcük olan "başkent"i bozmaz', () => {
      expect(correctTranscriptLocal('başkent gezisi')).toBe('başkent gezisi');
      expect(correctTranscriptLocal('Başkent Üniversitesi')).toBe('Başkent Üniversitesi');
    });

    it('korumaya rağmen gerçek yanlış duymayı düzeltmeye devam eder', () => {
      expect(correctTranscriptLocal('başkent evlatlarım olacağım')).toBe(
        'backend developer olacağım'
      );
      expect(correctTranscriptLocal('backent çalış')).toBe('backend çalış');
    });

    // Regresyon: 'deploy et' variant listesindeydi, yani DOĞRU Türkçe ifade
    // "deploy" ile değiştirilip "et" fiili siliniyordu.
    it('"deploy et" ifadesindeki fiili silmez', () => {
      expect(correctTranscriptLocal('deploy et')).toBe('deploy et');
      expect(correctTranscriptLocal('yarın deploy et')).toBe('yarın deploy et');
    });

    // Regresyon: koruma listesi ham hâlleriyle yazıldığı, karşılaştırma ise
    // normalize edilmiş biçimle yapıldığı için Türkçe'ye özgü harf içeren
    // kelimeler ("akşam", "bugün", "iş", "toplantı", "yarın") hiç korunmuyordu.
    it('Türkçe harf içeren korumalı kelimeler gerçekten korunuyor', () => {
      for (const word of ['akşam', 'bugün', 'iş', 'toplantı', 'yarın']) {
        expect(correctTranscriptLocal(word)).toBe(word);
      }
    });

    it('boş ve yalnız boşluktan oluşan metni olduğu gibi döndürür', () => {
      expect(correctTranscriptLocal('')).toBe('');
      expect(correctTranscriptLocal('   ')).toBe('   ');
    });
  });
});

