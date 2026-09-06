import {
  describeJoinError,
  HOUSEHOLD_MEMBER_LIMIT,
  INVITE_CODE_TTL_HOURS,
  isInviteCodeExpired,
  isMissingDbObjectError,
  joinHousehold,
  refreshInviteCode,
} from '../../src/services/pairing';
import { getCurrentUser, supabase } from '../../src/services/supabase';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// pairing.ts bu modülden yalnız istemciyi ve getCurrentUser'ı kullanıyor;
// böylece gerçek Supabase istemcisi hiç oluşturulmuyor.
jest.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: jest.fn(), from: jest.fn() },
  getCurrentUser: jest.fn(),
}));

type QueryResult = { data: unknown; error: unknown };

const client = supabase as unknown as { rpc: jest.Mock; from: jest.Mock };
const getCurrentUserMock = getCurrentUser as jest.Mock;

const tableResults: Record<string, QueryResult> = {};
const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];
/** Sıradaki update çağrılarına özel sonuçlar (ör. "kolon yok" hatası). */
const updateResults: QueryResult[] = [];

/**
 * Supabase sorgu zincirinin küçük taklidi: her metot kendini döndürür, zincir
 * await edilince tablo için ayarlanan sonucu verir. maybeSingle/single dizi
 * sonucunu ilk kayda indirger (PostgREST davranışı).
 */
/** Zincirin geri kalanını yok sayıp verilen sonucu döndüren küçük sorgu. */
const makeResolvedQuery = (result: QueryResult) => {
  const query: Record<string, unknown> = {
    eq: jest.fn(() => query),
    select: jest.fn(() => query),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

const makeQuery = (table: string) => {
  const result = tableResults[table] ?? { data: null, error: null };
  const collapse = (): QueryResult =>
    Array.isArray(result.data) ? { ...result, data: result.data[0] ?? null } : result;

  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    insert: jest.fn(() => query),
    delete: jest.fn(() => query),
    update: jest.fn((payload: Record<string, unknown>) => {
      updateCalls.push({ table, payload });
      const override = updateResults.shift();
      return override ? makeResolvedQuery(override) : query;
    }),
    maybeSingle: jest.fn(async () => collapse()),
    single: jest.fn(async () => collapse()),
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
};

const household = (overrides: Record<string, unknown> = {}) => ({
  id: 'h1',
  invite_code: 'ABC123',
  created_by: 'u1',
  created_at: '2026-09-01T10:00:00.000Z',
  invite_code_expires_at: '2026-09-02T10:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  updateCalls.length = 0;
  updateResults.length = 0;
  tableResults.households = { data: household(), error: null };
  tableResults.household_members = {
    data: [{ household_id: 'h1', user_id: 'u1', joined_at: '2026-09-01T10:00:00.000Z' }],
    error: null,
  };
  tableResults.profiles = { data: null, error: null };

  client.from.mockReset().mockImplementation((table: string) => makeQuery(table));
  // İki RPC farklı satır döndürüyor: join_household household_id, rotate_invite_code
  // ise yenilenen hanenin id'sini veriyor.
  client.rpc.mockReset().mockImplementation(async (fn: string) =>
    fn === 'rotate_invite_code'
      ? { data: [{ id: 'h1', invite_code: 'XYZ789', invite_code_expires_at: '2026-09-06T12:00:00.000Z' }], error: null }
      : { data: [{ household_id: 'h1' }], error: null }
  );
  getCurrentUserMock.mockReset().mockResolvedValue({ id: 'u1' });
});

describe('davet kodu geçerlilik süresi (R-010)', () => {
  const now = new Date('2026-09-05T12:00:00.000Z');

  // 0002 migration'ı uygulanmadan önce kolon şemada yok: kod süresiz sayılmalı,
  // yoksa migration'sız kurulumlarda eşleştirme tamamen kilitlenirdi.
  it('alan yoksa kodu süresiz sayar', () => {
    expect(isInviteCodeExpired(undefined, now)).toBe(false);
    expect(isInviteCodeExpired(null, now)).toBe(false);
  });

  it('geçmiş tarihi süresi dolmuş sayar', () => {
    expect(isInviteCodeExpired('2026-09-05T11:59:59.000Z', now)).toBe(true);
  });

  it('gelecek tarihi geçerli sayar', () => {
    expect(isInviteCodeExpired('2026-09-05T12:00:01.000Z', now)).toBe(false);
  });

  it('tam sınırda süresi dolmuş sayar', () => {
    expect(isInviteCodeExpired('2026-09-05T12:00:00.000Z', now)).toBe(true);
  });

  it('bozuk tarihte kodu geçerli bırakır', () => {
    expect(isInviteCodeExpired('bozuk-tarih', now)).toBe(false);
  });
});

describe('üye limiti ve süre sabitleri (R-010)', () => {
  // SQL tarafındaki public.household_member_limit() / public.invite_code_ttl()
  // ile aynı olmalı; biri değişirse bu test uyarır.
  it('istemci sabitleri 0002 migration ile aynı değerde', () => {
    expect(HOUSEHOLD_MEMBER_LIMIT).toBe(2);
    expect(INVITE_CODE_TTL_HOURS).toBe(24);
  });
});

describe('eksik veritabanı nesnesi tespiti', () => {
  it('şema önbelleği ve PostgreSQL kodlarını tanır', () => {
    expect(isMissingDbObjectError({ code: 'PGRST202' })).toBe(true);
    expect(isMissingDbObjectError({ code: 'PGRST204' })).toBe(true);
    expect(isMissingDbObjectError({ code: '42883' })).toBe(true);
    expect(isMissingDbObjectError({ code: '42703' })).toBe(true);
  });

  it('diğer hataları eksik nesne saymaz', () => {
    expect(isMissingDbObjectError({ code: '23505' })).toBe(false);
    expect(isMissingDbObjectError(null)).toBe(false);
    expect(isMissingDbObjectError(new Error('boom'))).toBe(false);
  });
});

describe('katılma hatası mesajları', () => {
  it('süresi dolmuş kodu açıklar', () => {
    expect(describeJoinError({ code: '22023', message: 'invite_code_expired' })).toMatch(/süresi dolmuş/);
  });

  it('dolu haneyi limitle birlikte açıklar', () => {
    expect(describeJoinError({ code: '23514', message: 'household_full' })).toMatch(
      new RegExp(`en fazla ${HOUSEHOLD_MEMBER_LIMIT} kişi`)
    );
  });

  it('geçersiz kodu açıklar', () => {
    expect(describeJoinError({ code: '22023', message: 'invalid_invite_code' })).toMatch(/geçersiz/);
  });

  it('bilinmeyen hatada genel mesaja düşer', () => {
    expect(describeJoinError({ message: 'network error' })).toMatch(/Eşleştirme başarısız/);
    expect(describeJoinError(null)).toMatch(/Eşleştirme başarısız/);
  });
});

describe('joinHousehold', () => {
  it('RPC hatasını kullanıcıya gösterilebilir mesaja çevirir', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'invite_code_expired' } });

    await expect(joinHousehold('ABC123')).rejects.toThrow(/süresi dolmuş/);
  });

  it('dolu hane reddini iletir', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'household_full' } });

    await expect(joinHousehold('ABC123')).rejects.toThrow(/dolu/);
  });

  it('başarılı katılımda haneyi döndürür', async () => {
    const joined = await joinHousehold('abc123');

    expect(client.rpc).toHaveBeenCalledWith('join_household', { p_invite_code: 'ABC123' });
    expect(joined?.id).toBe('h1');
  });
});

describe('refreshInviteCode (R-010 / R-011)', () => {
  it('kurucu olmayan kullanıcıyı reddeder', async () => {
    tableResults.households = { data: household({ created_by: 'u2' }), error: null };

    await expect(refreshInviteCode()).rejects.toThrow(/kuran kişi/);
    expect(client.rpc).not.toHaveBeenCalledWith('rotate_invite_code', expect.anything());
  });

  it('kurucu için 6 karakterlik yeni kodu RPC ile yeniler', async () => {
    const updated = await refreshInviteCode();

    expect(client.rpc).toHaveBeenCalledWith('rotate_invite_code', {
      p_invite_code: expect.stringMatching(/^[A-Z0-9]{6}$/),
    });
    expect(updated?.id).toBe('h1');
    expect(updateCalls).toHaveLength(0);
  });

  // 0002 uygulanmamış projelerde RPC yok; kod yenileme eski şemadaki doğrudan
  // UPDATE ile çalışmaya devam etmeli (süre alanına dokunmadan).
  it('RPC yoksa doğrudan UPDATE yoluna düşer ve süreyi de tazeler', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'function not found' } });

    const updated = await refreshInviteCode();

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe('households');
    // R2-002: yalnız kod yazılsaydı yeni kod eski (geçmiş) süreyi devralırdı.
    expect(Object.keys(updateCalls[0].payload).sort()).toEqual(['invite_code', 'invite_code_expires_at']);
    expect(new Date(String(updateCalls[0].payload.invite_code_expires_at)).getTime()).toBeGreaterThan(Date.now());
    expect(updated?.id).toBe('h1');
  });

  // 0002 uygulanmamış şemada süre kolonu yok; kod yenileme yine de çalışmalı.
  it('süre kolonu yoksa yalnız kodu yazar', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
    updateResults.push({ data: null, error: { code: 'PGRST204', message: 'column not found' } });

    const updated = await refreshInviteCode();

    expect(updateCalls).toHaveLength(2);
    expect(Object.keys(updateCalls[1].payload)).toEqual(['invite_code']);
    expect(updated?.id).toBe('h1');
  });

  // R2-001 regresyonu: RPC hedef haneyi çağıranın üyeliğinden çözmezse başka bir
  // haneyi yenileyip "hazır" diyebiliyordu; ekranda süresi dolmuş kod kalıyordu.
  it('RPC başka bir hane döndürürse başarı göstermez', async () => {
    client.rpc.mockResolvedValue({ data: [{ id: 'h2', invite_code: 'QWE456' }], error: null });

    await expect(refreshInviteCode()).rejects.toThrow(/beklenen ev grubunu döndürmedi/);
    expect(updateCalls).toHaveLength(0);
  });

  it('RPC hiç satır döndürmezse başarı göstermez', async () => {
    client.rpc.mockResolvedValue({ data: [], error: null });

    await expect(refreshInviteCode()).rejects.toThrow(/beklenen ev grubunu döndürmedi/);
  });

  it('beklenmeyen RPC hatasını yutmaz', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });

    await expect(refreshInviteCode()).rejects.toMatchObject({ code: '42501' });
    expect(updateCalls).toHaveLength(0);
  });
});
