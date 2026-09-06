import { Task } from '../../src/types';

/**
 * AI vekili (Supabase Edge Function) testleri.
 *
 * Amaç iki yönlü: vekil tanımlıyken istemcideki Gemini anahtarının HİÇ
 * kullanılmadığını, vekil yokken/erişilemezken de eski doğrudan yolun
 * bozulmadan çalıştığını kilitlemek.
 */

const geminiResponse = (text: string) => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text }] } }],
  }),
});

const errorResponse = (status: number) => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ error: { message: 'hata', status } }),
});

const PROXY_URL = 'https://proje.supabase.co/functions/v1/gemini-proxy';

describe('AI vekili', () => {
  const originalEnv = { ...process.env };
  const fetchMock = jest.fn();
  let warnSpy: jest.SpyInstance;

  const loadService = (env: Record<string, string | undefined>) => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    delete process.env.EXPO_PUBLIC_AI_PROXY_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    Object.entries(env).forEach(([key, value]) => {
      if (value === undefined) return;
      process.env[key] = value;
    });
    return require('../../src/utils/aiService');
  };

  const fetchUrls = () => fetchMock.mock.calls.map(call => String(call[0]));

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('vekil tanımlıyken istekler vekile gider, istemci anahtarı hiç kullanılmaz', async () => {
    fetchMock.mockResolvedValue(geminiResponse('Haftan gayet iyi geçti! 🎉'));
    const { generateWeeklySummary } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar',
    });

    const summary = await generateWeeklySummary('Efe', []);

    expect(summary).toContain('Haftan');
    expect(fetchUrls()).toEqual([PROXY_URL]);
    // Anahtar ne adreste ne başlıkta geçmeli.
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('gizli-anahtar');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer anon-key');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('gemini-2.5-flash');
  });

  it('yalnız proje adresi verildiyse fonksiyon yolunu ekler', async () => {
    fetchMock.mockResolvedValue(geminiResponse('özet'));
    const { generateWeeklySummary } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: 'https://proje.supabase.co/',
    });

    await generateWeeklySummary('Efe', []);

    expect(fetchUrls()).toEqual([PROXY_URL]);
  });

  // Vekil dağıtılmamış (404) ya da anahtarı tanımlanmamış (503): kullanıcı
  // dağıtımı yapana kadar uygulama bozulmamalı.
  it('vekil hazır değilse eldeki anahtarla doğrudan yola düşer', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(geminiResponse('doğrudan yanıt'));
    const { generateWeeklySummary } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
      EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar',
    });

    const summary = await generateWeeklySummary('Efe', []);

    expect(summary).toBe('doğrudan yanıt');
    expect(fetchUrls()[0]).toBe(PROXY_URL);
    expect(fetchUrls()[1]).toContain('generativelanguage.googleapis.com');
  });

  // Vekil erişilemez: bir kez yeniden denenir (anahtar varken hızlı düşülür),
  // sonra doğrudan yola geçilir.
  it('vekile ulaşılamazsa da doğrudan yola düşer', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(geminiResponse('doğrudan yanıt'));
    const { generateWeeklySummary } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
      EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar',
    });

    await expect(generateWeeklySummary('Efe', [])).resolves.toBe('doğrudan yanıt');
    expect(fetchUrls()).toEqual([PROXY_URL, PROXY_URL, expect.stringContaining('generativelanguage.googleapis.com')]);
  });

  // Anahtar yoksa düşecek yer de yok: hata mevcut akışlara yansımalı.
  it('anahtar yokken vekil hatası mevcut hata akışına yansır', async () => {
    fetchMock.mockResolvedValue(errorResponse(404));
    const { generateWeeklySummary, convertParagraphToTasks } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
    });

    await expect(generateWeeklySummary('Efe', [])).rejects.toThrow(/Analiz oluşturulurken/);
    expect(fetchUrls()).toEqual([PROXY_URL]);

    // Paragraf akışı hata durumunda yerel ayrıştırmaya düşer (mevcut davranış).
    fetchMock.mockClear();
    const tasks = await convertParagraphToTasks('Spor yap. Kitap oku.');
    expect(tasks.map((t: { title: string }) => t.title)).toEqual(['Spor yap', 'Kitap oku']);
  });

  // 429 "vekil hazır değil" DEĞİLDİR: kota hatası doğrudan yola düşmeyi
  // tetiklememeli, mevcut yeniden deneme mantığı işlemeli.
  it('kota hatasında doğrudan yola düşmez, vekilde yeniden dener', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(geminiResponse('ikinci denemede geldi'));
    const { generateWeeklySummary } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
      EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar',
    });

    const summary = await generateWeeklySummary('Efe', []);

    expect(summary).toBe('ikinci denemede geldi');
    expect(fetchUrls()).toEqual([PROXY_URL, PROXY_URL]);
  });

  it('vekil tanımlıysa istemci anahtarı olmasa da AI açık sayılır', () => {
    const { checkApiKey } = loadService({ EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL });
    expect(checkApiKey()).toBe(true);

    const withoutProxy = loadService({});
    expect(withoutProxy.checkApiKey()).toBe(false);
  });

  // Regresyon: vekil tanımsızken hiçbir şey değişmemeli.
  it('vekil tanımsızken istek doğrudan Gemini adresine gider', async () => {
    fetchMock.mockResolvedValue(geminiResponse('doğrudan'));
    const { generateWeeklySummary } = loadService({ EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar' });

    await generateWeeklySummary('Efe', []);

    expect(fetchUrls()).toHaveLength(1);
    expect(fetchUrls()[0]).toContain('generativelanguage.googleapis.com');
    expect(fetchUrls()[0]).toContain('key=gizli-anahtar');
  });

  it('plan düzenleme de vekil üzerinden çalışır', async () => {
    fetchMock.mockResolvedValue(
      geminiResponse('[{"id":"1","title":"Güncellendi","priority":"high","done":false}]')
    );
    const { modifyPlanWithAI } = loadService({
      EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL,
      EXPO_PUBLIC_GEMINI_API_KEY: 'gizli-anahtar',
    });

    const tasks: Task[] = [{ id: '1', title: 'Eski', done: false, priority: 'low' }];
    const updated = await modifyPlanWithAI(tasks, 'başlığı güncelle');

    expect(updated[0].title).toBe('Güncellendi');
    expect(fetchUrls()).toEqual([PROXY_URL]);
  });

  it('paragraf dönüştürme de vekil üzerinden çalışır', async () => {
    fetchMock.mockResolvedValue(
      geminiResponse('[{"title":"Spor yap","category":"spor"},{"title":"Rapor yaz","category":"is"}]')
    );
    const { convertParagraphToTasks } = loadService({ EXPO_PUBLIC_AI_PROXY_URL: PROXY_URL });

    const tasks = await convertParagraphToTasks('Spor yapıp rapor yazacağım');

    expect(tasks.map((t: { title: string }) => t.title)).toEqual(['Spor yap', 'Rapor yaz']);
    expect(fetchUrls()).toEqual([PROXY_URL]);
  });
});
