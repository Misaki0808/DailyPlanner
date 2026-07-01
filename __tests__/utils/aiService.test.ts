import { Task } from '../../src/types';

const makeGeminiResponse = (text: string) => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  }),
});

describe('modifyPlanWithAI', () => {
  const originalEnv = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const fetchMock = jest.fn();
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
    global.fetch = fetchMock;
    fetchMock.mockReset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalEnv;
  });

  it('cleans markdown JSON and validates priority/done fields', async () => {
    fetchMock.mockResolvedValue(makeGeminiResponse(`\`\`\`json
[
  { "id": "1", "title": " Güncellenmiş görev ", "priority": "urgent", "done": "yes" },
  { "id": "2", "title": "Tamamlanan görev", "priority": "high", "done": true }
]
\`\`\``));

    const currentTasks: Task[] = [
      { id: '1', title: 'Eski görev', done: false, priority: 'low', category: 'okul' },
      { id: '2', title: 'İkinci görev', done: false, priority: 'medium', category: 'is' },
      { id: '3', title: 'Silinecek görev', done: false, priority: 'high', category: 'diger' },
    ];

    const { modifyPlanWithAI } = require('../../src/utils/aiService');
    const result = await modifyPlanWithAI(currentTasks, 'Planı güncelle');

    expect(result).toEqual([
      { id: '1', title: 'Güncellenmiş görev', done: false, priority: 'low', category: 'okul' },
      { id: '2', title: 'Tamamlanan görev', done: true, priority: 'high', category: 'is' },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      'AI geçersiz priority döndürdü, güvenli varsayılan kullanılıyor:',
      'urgent'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'AI geçersiz done döndürdü, mevcut durum korunuyor:',
      'yes'
    );
  });
});
