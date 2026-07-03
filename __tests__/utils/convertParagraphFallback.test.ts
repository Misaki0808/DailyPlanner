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
});

