import {
  mergeCloudBackup,
  mergePlans,
  mergePomodoroStats,
  mergeRecurringTasks,
  mergeTaskList,
  stampTaskUpdates,
} from '../../src/utils/syncMerge';
import { defaultSettings } from '../../src/utils/defaultSettings';
import type { CloudBackupData } from '../../src/services/supabase';
import type { RecurringTask, Task } from '../../src/types';

const task = (id: string, title: string, extra: Partial<Task> = {}): Task => ({
  id,
  title,
  done: false,
  ...extra,
});

const backup = (overrides: Partial<CloudBackupData> = {}): CloudBackupData => ({
  version: 1,
  plans: {},
  settings: { ...defaultSettings },
  recurringTasks: [],
  user: { username: null, gender: 'male', aboutMe: '' },
  pomodoroStats: {},
  ...overrides,
});

const titles = (tasks: Task[]) => tasks.map(t => t.title);

describe('mergeTaskList — üç yönlü görev birleştirme', () => {
  it('iki cihaz farklı görev eklediyse ikisini de korur', () => {
    const base = [task('1', 'Ortak')];
    const local = [task('1', 'Ortak'), task('2', 'Yerel görev')];
    const remote = [task('1', 'Ortak'), task('3', 'Uzak görev')];

    expect(titles(mergeTaskList(base, local, remote))).toEqual(['Ortak', 'Yerel görev', 'Uzak görev']);
  });

  it('yalnız bir taraf düzenlediyse düzenleyen taraf kazanır', () => {
    const base = [task('1', 'Eski')];
    const local = [task('1', 'Eski')];
    const remote = [task('1', 'Uzakta düzenlendi')];

    expect(titles(mergeTaskList(base, local, remote))).toEqual(['Uzakta düzenlendi']);
    expect(titles(mergeTaskList(base, remote, base))).toEqual(['Uzakta düzenlendi']);
  });

  it('iki taraf da düzenlediyse yeni zaman damgası kazanır', () => {
    const base = [task('1', 'Eski', { updatedAt: '2026-09-01T10:00:00.000Z' })];
    const local = [task('1', 'Yerel sürüm', { updatedAt: '2026-09-05T09:00:00.000Z' })];
    const remote = [task('1', 'Uzak sürüm', { updatedAt: '2026-09-05T11:00:00.000Z' })];

    expect(titles(mergeTaskList(base, local, remote))).toEqual(['Uzak sürüm']);
    expect(titles(mergeTaskList(base, remote, local))).toEqual(['Uzak sürüm']);
  });

  it('damga yoksa iki cihazda da AYNI kazananı seçer (yakınsama)', () => {
    const base = [task('1', 'Eski')];
    const local = [task('1', 'A sürümü')];
    const remote = [task('1', 'B sürümü')];

    const fromLocalDevice = mergeTaskList(base, local, remote);
    const fromRemoteDevice = mergeTaskList(base, remote, local);

    expect(titles(fromLocalDevice)).toEqual(titles(fromRemoteDevice));
  });

  // Silme yalnız KARŞI TARAF dokunmadıysa geçerlidir.
  it('karşı taraf dokunmadıysa silme yayılır', () => {
    const base = [task('1', 'Silinecek'), task('2', 'Kalacak')];
    const local = [task('2', 'Kalacak')];
    const remote = [task('1', 'Silinecek'), task('2', 'Kalacak')];

    expect(titles(mergeTaskList(base, local, remote))).toEqual(['Kalacak']);
  });

  // Çakışma kuralı: silme ile düzenleme karşılaşırsa veriyi koruyan taraf kazanır.
  it('bir taraf silip diğeri düzenlediyse görev korunur', () => {
    const base = [task('1', 'Eski')];
    const local: Task[] = [];
    const remote = [task('1', 'Uzakta düzenlendi')];

    expect(titles(mergeTaskList(base, local, remote))).toEqual(['Uzakta düzenlendi']);
    expect(titles(mergeTaskList(base, remote, local))).toEqual(['Uzakta düzenlendi']);
  });

  // Taban yoksa (ilk eşitleme / veriler sıfırlanmış) hiçbir şey silinmez.
  it('taban yoksa silme çıkarımı yapmaz, birleşim uygular', () => {
    const local = [task('1', 'Yerel')];
    const remote = [task('2', 'Uzak')];

    expect(titles(mergeTaskList(null, local, remote))).toEqual(['Yerel', 'Uzak']);
  });

  it('yalnız zaman damgası farkı değişiklik sayılmaz', () => {
    const base = [task('1', 'Aynı', { updatedAt: '2026-09-01T10:00:00.000Z' })];
    const local = [task('1', 'Aynı', { updatedAt: '2026-09-05T10:00:00.000Z' })];
    const remote = [task('1', 'Aynı', { updatedAt: '2026-09-04T10:00:00.000Z' })];

    expect(mergeTaskList(base, local, remote)).toHaveLength(1);
  });
});

describe('mergePlans — gün düzeyi', () => {
  it('iki cihaz farklı günleri değiştirdiyse ikisi de korunur', () => {
    const base = { '2026-09-01': [task('1', 'Ortak')] };
    const local = { '2026-09-01': [task('1', 'Ortak')], '2026-09-02': [task('2', 'Yerel gün')] };
    const remote = { '2026-09-01': [task('1', 'Ortak')], '2026-09-03': [task('3', 'Uzak gün')] };

    const merged = mergePlans(base, local, remote);

    expect(Object.keys(merged).sort()).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('aynı günde farklı görevler birleşir', () => {
    const base = {};
    const local = { '2026-09-05': [task('1', 'Yerel')] };
    const remote = { '2026-09-05': [task('2', 'Uzak')] };

    expect(titles(mergePlans(base, local, remote)['2026-09-05'])).toEqual(['Yerel', 'Uzak']);
  });

  it('boşalan günü tamamen düşürür', () => {
    const base = { '2026-09-05': [task('1', 'Silinecek')] };
    const local = {};
    const remote = { '2026-09-05': [task('1', 'Silinecek')] };

    expect(mergePlans(base, local, remote)).toEqual({});
  });
});

describe('mergeRecurringTasks', () => {
  const recurring = (id: string, title: string): RecurringTask => ({
    id,
    title,
    priority: 'medium',
    frequency: 'daily',
    isActive: true,
    createdAt: '2026-09-01',
  });

  it('iki taraftaki eklemeleri birleştirir', () => {
    const merged = mergeRecurringTasks([], [recurring('1', 'Spor')], [recurring('2', 'Kitap')]);
    expect(merged.map(r => r.title)).toEqual(['Spor', 'Kitap']);
  });

  it('karşı taraf dokunmadıysa silme yayılır', () => {
    const base = [recurring('1', 'Spor')];
    const merged = mergeRecurringTasks(base, [], base);
    expect(merged).toEqual([]);
  });

  it('silme ile düzenleme çakışırsa kayıt korunur', () => {
    const base = [recurring('1', 'Spor')];
    const merged = mergeRecurringTasks(base, [], [{ ...recurring('1', 'Spor'), isActive: false }]);
    expect(merged).toHaveLength(1);
  });

  // Damga eklendikten sonra rutinler de görevlerle aynı kurala tabi.
  it('iki taraf da değiştirdiyse yeni damga kazanır', () => {
    const base = [{ ...recurring('1', 'Spor'), updatedAt: '2026-09-01T08:00:00.000Z' }];
    const local = [{ ...recurring('1', 'Yerel sürüm'), updatedAt: '2026-09-05T09:00:00.000Z' }];
    const remote = [{ ...recurring('1', 'Uzak sürüm'), updatedAt: '2026-09-05T11:00:00.000Z' }];

    expect(mergeRecurringTasks(base, local, remote)[0].title).toBe('Uzak sürüm');
    expect(mergeRecurringTasks(base, remote, local)[0].title).toBe('Uzak sürüm');
  });

  // Geriye uyum: damgasız (eski) kayıtlarda deterministik kural sürüyor.
  it('damga yoksa iki cihazda da aynı kazananı seçer', () => {
    const base = [recurring('1', 'Spor')];
    const local = [recurring('1', 'A sürümü')];
    const remote = [recurring('1', 'B sürümü')];

    expect(mergeRecurringTasks(base, local, remote)[0].title).toBe(
      mergeRecurringTasks(base, remote, local)[0].title
    );
  });

  it('yalnız damga farkı değişiklik sayılmaz', () => {
    const base = [{ ...recurring('1', 'Spor'), updatedAt: '2026-09-01T08:00:00.000Z' }];
    const local = [{ ...recurring('1', 'Spor'), updatedAt: '2026-09-05T09:00:00.000Z' }];
    const remote = [{ ...recurring('1', 'Spor'), updatedAt: '2026-09-04T09:00:00.000Z' }];

    expect(mergeRecurringTasks(base, local, remote)).toHaveLength(1);
  });
});

describe('mergePomodoroStats', () => {
  it('gün başına büyük sayacı alır', () => {
    expect(mergePomodoroStats({ '2026-09-05': 3, '2026-09-06': 1 }, { '2026-09-05': 5, '2026-09-07': 2 })).toEqual({
      '2026-09-05': 5,
      '2026-09-06': 1,
      '2026-09-07': 2,
    });
  });

  it('eksik taraflarda çökmez', () => {
    expect(mergePomodoroStats(null, null)).toEqual({});
  });
});

describe('mergeCloudBackup', () => {
  it('bulutta satır yoksa yerel veriyi olduğu gibi yazar', () => {
    const local = backup({ plans: { '2026-09-05': [task('1', 'Yerel')] } });

    const result = mergeCloudBackup({ base: null, local, remote: null });

    expect(result.merged).toBe(local);
    expect(result.differsFromLocal).toBe(false);
  });

  it('iki cihazın değişikliklerini tek sonuçta toplar', () => {
    const base = backup({ plans: { '2026-09-01': [task('1', 'Ortak')] } });
    const local = backup({
      plans: { '2026-09-01': [task('1', 'Ortak')], '2026-09-02': [task('2', 'Yerel')] },
      pomodoroStats: { '2026-09-02': 2 },
    });
    const remote = backup({
      plans: { '2026-09-01': [task('1', 'Ortak')], '2026-09-03': [task('3', 'Uzak')] },
      pomodoroStats: { '2026-09-02': 4 },
    });

    const { merged, differsFromLocal } = mergeCloudBackup({ base, local, remote });

    expect(Object.keys(merged.plans).sort()).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(merged.pomodoroStats).toEqual({ '2026-09-02': 4 });
    expect(differsFromLocal).toBe(true);
  });

  it('iki taraf da aynıysa yerele uygulanacak fark yoktur', () => {
    const same = backup({ plans: { '2026-09-05': [task('1', 'Aynı')] } });

    const { differsFromLocal } = mergeCloudBackup({
      base: same,
      local: same,
      remote: JSON.parse(JSON.stringify(same)),
    });

    expect(differsFromLocal).toBe(false);
  });

  // R2-010: aynı içerik farklı damgayla duruyorsa her arka plana geçişte
  // gereksiz bir bulut yazması üretiliyordu.
  it('yalnız damga farkı bulut yazması gerektirmez', () => {
    const local = backup({ plans: { '2026-09-05': [task('1', 'Aynı', { updatedAt: '2026-09-05T10:00:00.000Z' })] } });
    const remote = backup({ plans: { '2026-09-05': [task('1', 'Aynı', { updatedAt: '2026-09-04T10:00:00.000Z' })] } });

    const { differsFromRemote } = mergeCloudBackup({ base: local, local, remote });

    expect(differsFromRemote).toBe(false);
  });

  it('içerik farkı bulut yazması gerektirir', () => {
    const local = backup({ plans: { '2026-09-05': [task('1', 'Yerel')] } });
    const remote = backup({ plans: { '2026-09-05': [task('2', 'Uzak')] } });

    expect(mergeCloudBackup({ base: null, local, remote }).differsFromRemote).toBe(true);
  });

  it('rutinlerde de damga farkı yazma sebebi değildir', () => {
    const recurringTask = {
      id: 'r1',
      title: 'Spor',
      priority: 'medium' as const,
      frequency: 'daily' as const,
      isActive: true,
      createdAt: '2026-09-01',
    };
    const local = backup({ recurringTasks: [{ ...recurringTask, updatedAt: '2026-09-05T10:00:00.000Z' }] });
    const remote = backup({ recurringTasks: [{ ...recurringTask, updatedAt: '2026-09-01T10:00:00.000Z' }] });

    expect(mergeCloudBackup({ base: local, local, remote }).differsFromRemote).toBe(false);
  });

  it('ayarlarda yalnız yerelde değişmemiş alan uzaktan gelir', () => {
    const base = backup({ settings: { ...defaultSettings, weeklyTaskGoal: 0, notificationTime: '09:00' } });
    const local = backup({ settings: { ...defaultSettings, weeklyTaskGoal: 10, notificationTime: '09:00' } });
    const remote = backup({ settings: { ...defaultSettings, weeklyTaskGoal: 3, notificationTime: '21:30' } });

    const { merged } = mergeCloudBackup({ base, local, remote });

    // weeklyTaskGoal yerelde değişti -> yerel kalır; notificationTime değişmedi -> uzak gelir.
    expect(merged.settings.weeklyTaskGoal).toBe(10);
    expect(merged.settings.notificationTime).toBe('21:30');
  });

  it('profil alanlarında da aynı alan-bazlı kural işler', () => {
    const base = backup({ user: { username: 'Efe', gender: 'male', aboutMe: '' } });
    const local = backup({ user: { username: 'Efe', gender: 'male', aboutMe: 'Yerel not' } });
    const remote = backup({ user: { username: 'Efe B.', gender: 'male', aboutMe: '' } });

    const { merged } = mergeCloudBackup({ base, local, remote });

    expect(merged.user?.aboutMe).toBe('Yerel not');
    expect(merged.user?.username).toBe('Efe B.');
  });
});

describe('stampTaskUpdates', () => {
  const now = '2026-09-05T12:00:00.000Z';

  it('yeni görevi damgalar', () => {
    const [stamped] = stampTaskUpdates([], [task('1', 'Yeni')], now);
    expect(stamped.updatedAt).toBe(now);
  });

  it('içeriği değişen görevi yeniden damgalar', () => {
    const previous = [task('1', 'Eski', { updatedAt: '2026-09-01T08:00:00.000Z' })];
    const [stamped] = stampTaskUpdates(previous, [task('1', 'Yeni başlık', { updatedAt: '2026-09-01T08:00:00.000Z' })], now);
    expect(stamped.updatedAt).toBe(now);
  });

  it('dokunulmamış görevin damgasını korur', () => {
    const previous = [task('1', 'Aynı', { updatedAt: '2026-09-01T08:00:00.000Z' })];
    const [stamped] = stampTaskUpdates(previous, [task('1', 'Aynı')], now);
    expect(stamped.updatedAt).toBe('2026-09-01T08:00:00.000Z');
  });

  it('damgasız ve değişmemiş görevi damgalamaz', () => {
    const previous = [task('1', 'Aynı')];
    const [stamped] = stampTaskUpdates(previous, [task('1', 'Aynı')], now);
    expect(stamped.updatedAt).toBeUndefined();
  });
});
