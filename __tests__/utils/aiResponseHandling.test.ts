/**
 * Model çıktısı GÜVENİLMEZ girdidir: eksik alan, markdown çiti, yanlış tip ya
 * da aralık dışı değer gelebilir. Bu testler uygulamanın gerçekten kullandığı
 * AI yollarının bu çıktıyı nasıl ele aldığını sabitler.
 */
const makeGeminiResponse = (text: string) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text }] } }],
  }),
});

const errorResponse = (status: number) => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ error: { message: 'hata' } }),
});

describe('AI yanıt işleme', () => {
  const originalKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const fetchMock = jest.fn();
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let timeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    global.fetch = fetchMock;
    fetchMock.mockReset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Yeniden deneme beklemelerini anında geçir
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((cb: () => void) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    timeoutSpy.mockRestore();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalKey;
  });

  describe('checkApiKey', () => {
    it('anahtar varken true, yokken false döner', () => {
      const withKey = require('../../src/utils/aiService');
      expect(withKey.checkApiKey()).toBe(true);

      jest.resetModules();
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const withoutKey = require('../../src/utils/aiService');
      expect(withoutKey.checkApiKey()).toBe(false);
    });
  });

  describe('generateWeeklySummary', () => {
    it('markdown olmayan düz metni olduğu gibi döndürür', async () => {
      fetchMock.mockResolvedValue(makeGeminiResponse('  Harika bir hafta geçirdin! 🎉  '));
      const { generateWeeklySummary } = require('../../src/utils/aiService');

      const summary = await generateWeeklySummary('Efe', [
        { date: '2026-09-05', tasks: [{ id: '1', title: 'Spor', done: true, priority: 'low' }] },
      ]);

      expect(summary).toBe('Harika bir hafta geçirdin! 🎉');
    });

    it('görevi olmayan günleri de özete dahil eder (çökmez)', async () => {
      fetchMock.mockResolvedValue(makeGeminiResponse('Özet'));
      const { generateWeeklySummary } = require('../../src/utils/aiService');

      await expect(
        generateWeeklySummary('', [{ date: '2026-09-05', tasks: [] }])
      ).resolves.toBe('Özet');
    });

    it('model boş yanıt verirse anlaşılır bir hata fırlatır', async () => {
      fetchMock.mockResolvedValue(makeGeminiResponse(''));
      const { generateWeeklySummary } = require('../../src/utils/aiService');

      await expect(generateWeeklySummary('Efe', [])).rejects.toThrow(
        'Analiz oluşturulurken bir hata meydana geldi.'
      );
    });

    it('API anahtarı yoksa isteği hiç göndermez', async () => {
      jest.resetModules();
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      const { generateWeeklySummary } = require('../../src/utils/aiService');

      await expect(generateWeeklySummary('Efe', [])).rejects.toThrow(/API key/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('modifyPlanWithAI', () => {
    const currentTasks = [
      { id: '1', title: 'Eski', done: false, priority: 'low' as const, category: 'okul', note: 'notum' },
    ];

    it('kategori ve not gibi AI’ın bilmediği alanları korur', async () => {
      fetchMock.mockResolvedValue(
        makeGeminiResponse('[{"id":"1","title":"Yeni","priority":"high","done":true}]')
      );
      const { modifyPlanWithAI } = require('../../src/utils/aiService');

      const result = await modifyPlanWithAI(currentTasks, 'güncelle');

      expect(result[0]).toEqual({
        id: '1', title: 'Yeni', done: true, priority: 'high', category: 'okul', note: 'notum',
      });
    });

    it('boş başlık gelirse eski başlığı korur', async () => {
      fetchMock.mockResolvedValue(
        makeGeminiResponse('[{"id":"1","title":"   ","priority":"low","done":false}]')
      );
      const { modifyPlanWithAI } = require('../../src/utils/aiService');

      const result = await modifyPlanWithAI(currentTasks, 'güncelle');

      expect(result[0].title).toBe('Eski');
    });

    it('model dizi yerine nesne döndürürse hata fırlatır', async () => {
      fetchMock.mockResolvedValue(makeGeminiResponse('{"id":"1"}'));
      const { modifyPlanWithAI } = require('../../src/utils/aiService');

      await expect(modifyPlanWithAI(currentTasks, 'güncelle')).rejects.toThrow(
        'Plan düzenlenirken bir hata oluştu'
      );
    });

    it('bozuk JSON gelirse hata fırlatır', async () => {
      fetchMock.mockResolvedValue(makeGeminiResponse('{bozuk'));
      const { modifyPlanWithAI } = require('../../src/utils/aiService');

      await expect(modifyPlanWithAI(currentTasks, 'güncelle')).rejects.toThrow();
    });
  });

  describe('fetchWithRetry davranışı', () => {
    it('kalıcı hatada (401) yeniden DENEMEZ', async () => {
      fetchMock.mockResolvedValue(errorResponse(401));
      const { convertParagraphToTasks } = require('../../src/utils/aiService');

      await convertParagraphToTasks('Rapor yaz. Spor yap.');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('geçici hatada (503) yeniden dener', async () => {
      fetchMock.mockResolvedValue(errorResponse(503));
      const { convertParagraphToTasks } = require('../../src/utils/aiService');

      await convertParagraphToTasks('Rapor yaz. Spor yap.');

      expect(fetchMock).toHaveBeenCalledTimes(4); // ilk deneme + 3 tekrar
    });

    it('hız sınırında (429) yeniden dener', async () => {
      fetchMock.mockResolvedValue(errorResponse(429));
      const { convertParagraphToTasks } = require('../../src/utils/aiService');

      await convertParagraphToTasks('Rapor yaz. Spor yap.');

      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });
});
