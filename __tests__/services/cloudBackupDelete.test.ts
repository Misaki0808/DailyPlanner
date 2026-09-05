type QueryResult = { data: unknown; error: unknown };

const mockFrom = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom, auth: { getSession: jest.fn() } })),
}));

/** Zincirin her adımı kendini döndürür; await edilince verilen sonucu verir. */
const chain = (result: QueryResult) => {
  const query: Record<string, unknown> = {
    delete: jest.fn(() => query),
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
};

const okResult: QueryResult = { data: null, error: null };

/**
 * supabase.ts istemciyi modül yüklenirken ortam değişkenlerinden kuruyor;
 * bu yüzden servis her testte ortam ayarlandıktan sonra yeniden require edilir
 * (aiService testindeki desen).
 */
const loadService = (configured = true) => {
  if (configured) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  } else {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }

  return require('../../src/services/supabase');
};

describe('supabaseService.deleteBackup (R-009)', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.resetModules();
    mockFrom.mockReset();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  // Silinen satır .select() ile geri döndüyse silme gerçekten olmuştur.
  it('silinen satır döndüyse deleted verir', async () => {
    mockFrom.mockImplementationOnce(() => chain({ data: [{ household_id: 'h1' }], error: null }));

    const { supabaseService } = loadService();

    await expect(supabaseService.deleteBackup('h1')).resolves.toBe('deleted');
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('plan_backups');
  });

  // 0002 migration'ı uygulanmadan DELETE politikası yok: istek hata vermez,
  // sessizce 0 satır etkiler ama satır hâlâ okunabilir.
  it('satır silinmeyip hâlâ okunabiliyorsa policy-missing verir', async () => {
    mockFrom
      .mockImplementationOnce(() => chain({ data: [], error: null }))
      .mockImplementationOnce(() => chain({ data: { household_id: 'h1' }, error: null }));

    const { supabaseService } = loadService();

    await expect(supabaseService.deleteBackup('h1')).resolves.toBe('policy-missing');
  });

  // R2-005: satırı GÖREMEMEK silmiş olmakla aynı şey değil.
  it('silinen satır yok ve satır da görünmüyorsa not-found verir', async () => {
    mockFrom
      .mockImplementationOnce(() => chain({ data: [], error: null }))
      .mockImplementationOnce(() => chain(okResult));

    const { supabaseService } = loadService();

    await expect(supabaseService.deleteBackup('h1')).resolves.toBe('not-found');
  });

  it('silme hatasını yutmaz', async () => {
    mockFrom.mockImplementationOnce(() =>
      chain({ data: null, error: { code: '42501', message: 'permission denied' } })
    );

    const { supabaseService } = loadService();

    await expect(supabaseService.deleteBackup('h1')).rejects.toMatchObject({ code: '42501' });
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('doğrulama sorgusu hata verirse yutmaz', async () => {
    mockFrom
      .mockImplementationOnce(() => chain({ data: [], error: null }))
      .mockImplementationOnce(() => chain({ data: null, error: { code: '42501', message: 'permission denied' } }));

    const { supabaseService } = loadService();

    await expect(supabaseService.deleteBackup('h1')).rejects.toMatchObject({ code: '42501' });
  });

  it('Supabase yapılandırılmamışsa istek atmadan not-found döner', async () => {
    const { supabaseService } = loadService(false);

    await expect(supabaseService.deleteBackup('h1')).resolves.toBe('not-found');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
