const makeGeminiResponse = (text: string) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text }] } }],
  }),
});

describe('convertParagraphToTasks local fallback', () => {
  const originalApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const fetchMock = jest.fn();
  let timeoutSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    global.fetch = fetchMock;
    fetchMock.mockRejectedValue(new Error('network down'));
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      callback();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalApiKey;
  });

  it('returns simple local tasks when AI fetch fails after retries', async () => {
    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('Backend çalış.\nMarket alışverişi yap. Spor yap.');

    expect(fetchMock).toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(result).toEqual([
      { title: 'Backend çalış', category: 'diger' },
      { title: 'Market alışverişi yap', category: 'diger' },
      { title: 'Spor yap', category: 'diger' },
    ]);
  });

  it('AI beklenen alanları içermeyen bir dizi döndürdüğünde yerel ayrıştırmaya düşer', async () => {
    // Model şemayı yok sayıp "title" yerine başka bir alan döndürüyor:
    // dizi geçerli olduğu için eski kod boş liste dönüp paragrafı sessizce kaybediyordu.
    fetchMock.mockResolvedValue(
      makeGeminiResponse('[{"gorev":"Backend çalış"},{"gorev":"Spor yap"}]')
    );

    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('Backend çalış. Spor yap.');

    expect(result.usedFallback).toBe(true);
    expect(result).toEqual([
      { title: 'Backend çalış', category: 'diger' },
      { title: 'Spor yap', category: 'diger' },
    ]);
  });

  it('numaralı listeyi madde madde ayrıştırır', async () => {
    // Regresyon: numaralı liste işaretleri bölmeden ÖNCE atılmıyordu, bu yüzden
    // "1." içindeki nokta cümle sonu sanılıp satır ikiye ayrılıyor ve
    // ["1","Rapor yaz","2","Toplantı","3","Spor"] gibi anlamsız görevler çıkıyordu.
    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('1. Rapor yaz\n2. Toplantı\n3. Spor');

    expect(result.map((t: { title: string }) => t.title)).toEqual([
      'Rapor yaz', 'Toplantı', 'Spor',
    ]);
  });

  it('ondalık sayıyı iki göreve bölmez', async () => {
    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('Ahmet ile görüş ve 2.5 saat çalış');

    expect(result.map((t: { title: string }) => t.title)).toEqual([
      'Ahmet ile görüş ve 2.5 saat çalış',
    ]);
  });

  it('başta kalan bağlaçları görev başlığına yapıştırmaz', async () => {
    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('Ödevimi bitireceğim ve sonra dinleneceğim');

    expect(result.map((t: { title: string }) => t.title)).toEqual([
      'Ödevimi bitireceğim', 'dinleneceğim',
    ]);
  });

  it('tire ve yıldız işaretli listeyi ayrıştırır', async () => {
    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('- Süt al\n- Ekmek al\n* Yumurta al');

    expect(result.map((t: { title: string }) => t.title)).toEqual([
      'Süt al', 'Ekmek al', 'Yumurta al',
    ]);
  });

  it('AI boş başlıklar döndürdüğünde de yerel ayrıştırmaya düşer', async () => {
    fetchMock.mockResolvedValue(
      makeGeminiResponse('[{"title":"   ","category":"is"},{"title":"","category":"okul"}]')
    );

    const { convertParagraphToTasks } = require('../../src/utils/aiService');

    const result = await convertParagraphToTasks('Rapor yaz. Sunum hazırla.');

    expect(result.usedFallback).toBe(true);
    expect(result).toEqual([
      { title: 'Rapor yaz', category: 'diger' },
      { title: 'Sunum hazırla', category: 'diger' },
    ]);
  });
});

