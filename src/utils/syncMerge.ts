import type { CloudBackupData } from '../services/supabase';
import type { Plans, RecurringTask, Task } from '../types';

/**
 * ÜÇ YÖNLÜ BULUT BİRLEŞTİRME
 *
 * Bulut yedeği hane başına TEK satır olduğu için iki cihaz sırayla yazdığında
 * son yazan kazanıyor ve diğerinin değişiklikleri sessizce kayboluyordu. Burada
 * git benzeri üç yönlü birleştirme yapılır:
 *
 *   taban (base)  : bu cihazın en son eşitlediği anlık görüntü
 *   yerel (local) : cihazdaki güncel veri
 *   uzak (remote) : buluttaki güncel satır
 *
 * Taban, "bir kaydın YOKLUĞU silme mi yoksa hiç var olmama mı" sorusunu
 * ayırt etmenin tek yolu. Taban yoksa (ilk eşitleme, veriler sıfırlanmış)
 * hiçbir şeyi silmeyen birleşim uygulanır: veri kaybı riski sıfırdır.
 *
 * Modül saf tutulur; ağ ve depolama çağrısı içermez (bkz. useCloudSync).
 */

/** Anahtar sırasından bağımsız karşılaştırma için kararlı serileştirme. */
export const stableStringify = (value: unknown): string => {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
};

const isSame = (left: unknown, right: unknown) => stableStringify(left) === stableStringify(right);

/**
 * Zaman damgası ayırt etmediğinde kullanılır. Kural keyfi ama İKİ CİHAZDA DA
 * aynı sonucu verir; böylece cihazlar birbirinin seçimini geri almaz.
 */
const pickDeterministic = <T>(local: T, remote: T): T =>
  stableStringify(local) >= stableStringify(remote) ? local : remote;

const withoutStamp = ({ updatedAt: _updatedAt, ...rest }: Task) => rest;

/** Görev içeriği aynı mı? Yalnız zaman damgası farkı "değişiklik" sayılmaz. */
const sameTaskContent = (left: Task, right: Task) => isSame(withoutStamp(left), withoutStamp(right));

/** İki taraf da aynı görevi değiştirdiyse: yeni zaman damgası kazanır. */
const pickNewerTask = (local: Task, remote: Task): Task => {
  const localStamp = local.updatedAt;
  const remoteStamp = remote.updatedAt;

  if (localStamp && remoteStamp && localStamp !== remoteStamp) {
    return localStamp > remoteStamp ? local : remote;
  }
  // Tek tarafta damga varsa o taraf damgalamayı bilen sürümde düzenlenmiştir.
  if (localStamp && !remoteStamp) return local;
  if (!localStamp && remoteStamp) return remote;

  return pickDeterministic(local, remote);
};

type Identified = { id: string };

const indexById = <T extends Identified>(items?: T[] | null): Map<string, T> =>
  new Map((items ?? []).map(item => [item.id, item]));

/**
 * Kimlik taşıyan listelerin üç yönlü birleştirmesi.
 *
 * Çakışma kuralları:
 * - İki tarafta da var ve aynı            -> olduğu gibi kalır.
 * - Yalnız bir taraf değiştirmiş          -> değiştiren taraf kazanır.
 * - İkisi de değiştirmiş                  -> resolveConflict karar verir.
 * - Bir tarafta yok, diğeri tabanla aynı  -> SİLİNMİŞ sayılır ve düşer.
 * - Bir tarafta yok, diğeri değişmiş      -> KORUNUR: silme ile düzenleme
 *   çakışırsa veriyi koruyan taraf kazanır (silmek her zaman yeniden
 *   yapılabilir, kaybolan düzenleme geri getirilemez).
 *
 * Sıralama: yerel sıra korunur, yalnız uzakta olanlar sona eklenir. Görev
 * sırası kullanıcı tarafından sürüklenerek değiştirilebildiği için cihazlar
 * arasında sıranın birebir yakınsaması hedeflenmez.
 */
const mergeById = <T extends Identified>(
  base: T[] | undefined | null,
  local: T[] | undefined | null,
  remote: T[] | undefined | null,
  resolveConflict: (localItem: T, remoteItem: T) => T,
  isUnchanged: (left: T, right: T) => boolean,
): T[] => {
  const baseMap = indexById(base);
  const localMap = indexById(local);
  const remoteMap = indexById(remote);

  const resolve = (id: string): T | null => {
    const baseItem = baseMap.get(id);
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);

    if (localItem && remoteItem) {
      if (isUnchanged(localItem, remoteItem)) return localItem;
      if (baseItem && isUnchanged(baseItem, localItem)) return remoteItem;
      if (baseItem && isUnchanged(baseItem, remoteItem)) return localItem;
      return resolveConflict(localItem, remoteItem);
    }

    if (localItem) return baseItem && isUnchanged(baseItem, localItem) ? null : localItem;
    if (remoteItem) return baseItem && isUnchanged(baseItem, remoteItem) ? null : remoteItem;
    return null;
  };

  const merged: T[] = [];
  for (const item of local ?? []) {
    const resolved = resolve(item.id);
    if (resolved) merged.push(resolved);
  }
  for (const item of remote ?? []) {
    if (localMap.has(item.id)) continue;
    const resolved = resolve(item.id);
    if (resolved) merged.push(resolved);
  }

  return merged;
};

/** Bir günün görev listesini birleştirir. */
export const mergeTaskList = (
  base: Task[] | undefined | null,
  local: Task[] | undefined | null,
  remote: Task[] | undefined | null,
): Task[] => mergeById(base, local, remote, pickNewerTask, sameTaskContent);

/** Planlar tarih anahtarlı olduğu için birleştirme gün bazında yürür. */
export const mergePlans = (
  base: Plans | undefined | null,
  local: Plans | undefined | null,
  remote: Plans | undefined | null,
): Plans => {
  const dates = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
    ...Object.keys(base ?? {}),
  ]);

  const merged: Plans = {};
  for (const date of dates) {
    const tasks = mergeTaskList(base?.[date], local?.[date], remote?.[date]);
    // Boş günler tutulmaz: deletePlan da anahtarı tamamen siliyor.
    if (tasks.length > 0) merged[date] = tasks;
  }

  return merged;
};

/**
 * Tekrarlayan görevlerde zaman damgası yok (recurringStore bu task'ın kapsamı
 * dışında), bu yüzden iki taraf da değiştirdiyse deterministik kural işler.
 */
export const mergeRecurringTasks = (
  base: RecurringTask[] | undefined | null,
  local: RecurringTask[] | undefined | null,
  remote: RecurringTask[] | undefined | null,
): RecurringTask[] => mergeById(base, local, remote, pickDeterministic, isSame);

/**
 * Pomodoro sayaçları yalnız artar; gün başına büyük olan alınır. Taban
 * gerekmez: hiçbir senaryoda sayaç geri gitmemeli.
 */
export const mergePomodoroStats = (
  local?: Record<string, number> | null,
  remote?: Record<string, number> | null,
): Record<string, number> => {
  const merged: Record<string, number> = { ...(local ?? {}) };
  for (const [date, count] of Object.entries(remote ?? {})) {
    merged[date] = Math.max(merged[date] ?? 0, count ?? 0);
  }
  return merged;
};

/**
 * Ayarlar ve profil gibi düz nesneler alan alan birleşir: yerelde tabandan beri
 * değişmemiş alan uzaktan gelen değeri alır, değişmiş alan yerelde kalır.
 * Cihazda elle girilen bir tercihin sessizce geri alınmaması için yerel önceliklidir.
 */
const mergeRecordFields = <T extends object>(
  base: Partial<T> | undefined | null,
  local: T | undefined,
  remote: Partial<T> | undefined | null,
): T | undefined => {
  if (!remote) return local;
  if (!local) return remote as T;

  const baseRecord = (base ?? {}) as Record<string, unknown>;
  const localRecord = local as unknown as Record<string, unknown>;
  const remoteRecord = remote as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...localRecord };

  for (const key of new Set([...Object.keys(localRecord), ...Object.keys(remoteRecord)])) {
    const remoteValue = remoteRecord[key];
    if (remoteValue === undefined) continue;

    const localValue = localRecord[key];
    if (localValue === undefined) {
      merged[key] = remoteValue;
      continue;
    }

    merged[key] = isSame(localValue, baseRecord[key]) ? remoteValue : localValue;
  }

  return merged as T;
};

export type CloudMergeInput = {
  /** En son eşitlenen anlık görüntü; yoksa silme tespiti yapılmaz. */
  base?: Partial<CloudBackupData> | null;
  local: CloudBackupData;
  remote?: Partial<CloudBackupData> | null;
};

export type CloudMergeResult = {
  merged: CloudBackupData;
  /** Buluttaki satırdan farklı mı? (yazmaya değer mi) */
  differsFromRemote: boolean;
  /** Cihazdaki veriden farklı mı? (yerele uygulamaya değer mi) */
  differsFromLocal: boolean;
};

export const mergeCloudBackup = ({ base, local, remote }: CloudMergeInput): CloudMergeResult => {
  // Bulutta satır yoksa birleştirilecek bir şey de yok.
  if (!remote) {
    return { merged: local, differsFromRemote: true, differsFromLocal: false };
  }

  const merged: CloudBackupData = {
    version: 1,
    plans: mergePlans(base?.plans, local.plans, remote.plans),
    settings: mergeRecordFields(base?.settings, local.settings, remote.settings) ?? local.settings,
    recurringTasks: mergeRecurringTasks(base?.recurringTasks, local.recurringTasks, remote.recurringTasks),
    user: mergeRecordFields(base?.user, local.user, remote.user),
    pomodoroStats: mergePomodoroStats(local.pomodoroStats, remote.pomodoroStats),
  };

  return {
    merged,
    differsFromRemote: !isSame(merged, remote),
    differsFromLocal: !isSame(merged, local),
  };
};

/**
 * Değişen görevleri zaman damgalar. Damga yalnız İÇERİĞİ değişen (veya yeni)
 * görevlere yazılır; dokunulmamış görevler eski damgasını korur, böylece bir
 * günün tamamını yeniden yazan akışlar (yapay zeka, sesli giriş) her görevi
 * "az önce düzenlendi" göstermez.
 */
export const stampTaskUpdates = (
  previous: Task[] | undefined | null,
  next: Task[],
  nowIso: string = new Date().toISOString(),
): Task[] => {
  const previousMap = indexById(previous);

  return next.map(task => {
    const before = previousMap.get(task.id);
    if (before && sameTaskContent(before, task)) {
      return before.updatedAt ? { ...task, updatedAt: before.updatedAt } : task;
    }
    return { ...task, updatedAt: nowIso };
  });
};
