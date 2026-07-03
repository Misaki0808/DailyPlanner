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
});

