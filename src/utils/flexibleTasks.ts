import { Plans, RecurringTask, Task } from '../types';
import { getWeekDates } from './weekUtils';

/**
 * Esnek ("flexible") tekrarlayan görevler.
 *
 * ÜRÜN KURALI: esnek görev belirli bir güne BAĞLANMAZ. Kullanıcı haftalık bir
 * hedef koyar ("Haftada 3 defa") ve hangi günlerde yapacağını kendisi seçer;
 * görev, Planlarım ekranındaki "ESNEK GÖREV HAVUZU" kartından elle o güne
 * eklenir. Bu yüzden `syncRecurringForToday` esnek görevleri bilerek
 * eklemez — otomatik eklemek, hedefi kullanıcı seçmeden doldurur ve havuzdaki
 * ekleme düğmesini anlamsız kılardı.
 */

/**
 * Haftalık hedefi eksik ya da geçersiz kaydedilmiş görevler için taban değer.
 *
 * `flexibleTarget` tipte opsiyonel; eski sürümlerden ya da bulut yedeğinden
 * hedefsiz bir kayıt gelebiliyor. Böyle bir görev eskiden havuz filtresine
 * takılıp hiç görünmüyor, otomatik de eklenmediği için uygulamada TAMAMEN
 * kayboluyordu (Ayarlar'da duruyor ama hiçbir işe yaramıyordu).
 */
export const DEFAULT_FLEXIBLE_TARGET = 1;

export const getFlexibleWeeklyTarget = (task: RecurringTask): number => {
  const target = Math.floor(task.flexibleTarget ?? DEFAULT_FLEXIBLE_TARGET);
  return Number.isFinite(target) && target > 0 ? target : DEFAULT_FLEXIBLE_TARGET;
};

export interface FlexibleTaskProgress extends RecurringTask {
  /** Bu hafta kaç günde yapıldı */
  currentCount: number;
  /** Haftalık hedef (eksikse tabana düşer) */
  target: number;
  /** Seçili güne bu hafta zaten eklenmiş mi */
  isAddedToSelectedDay: boolean;
}

/** Türkçe büyük/küçük harf ve baştaki/sondaki boşluk farklarını yok sayar. */
export const normalizeTaskTitle = (value: string): string =>
  value.trim().toLocaleLowerCase('tr-TR');

/**
 * Seçili günün içinde bulunduğu hafta (Pzt-Paz) için esnek görev ilerlemesi.
 *
 * Bir gün "yapıldı" sayılır: görev o güne havuzdan eklenmişse (`recurringTaskId`
 * eşleşir) ya da kullanıcı aynı başlığı elle yazmışsa (başlık eşleşir).
 * Hedefi dolmuş görevler listeden düşer; seçili güne eklenmişse, kullanıcı
 * eklediğini görebilsin diye listede kalır.
 */
export const buildFlexibleTaskProgress = (
  recurringTasks: RecurringTask[],
  plans: Plans,
  selectedDate: string
): FlexibleTaskProgress[] => {
  const flexibleTasks = recurringTasks.filter(
    task => task.isActive && task.frequency === 'flexible'
  );
  if (flexibleTasks.length === 0) return [];

  const weekDates = getWeekDates(selectedDate);

  return flexibleTasks
    .map(task => {
      const normalizedTitle = normalizeTaskTitle(task.title);
      let currentCount = 0;
      let isAddedToSelectedDay = false;

      for (const date of weekDates) {
        const dayTasks: Task[] = plans[date] || [];
        const matches = dayTasks.some(dayTask => {
          const recurringTaskId = (dayTask as Task & { recurringTaskId?: string }).recurringTaskId;
          if (recurringTaskId) return recurringTaskId === task.id;
          return normalizeTaskTitle(dayTask.title) === normalizedTitle;
        });

        if (matches) {
          currentCount++;
          if (date === selectedDate) isAddedToSelectedDay = true;
        }
      }

      return { ...task, currentCount, target: getFlexibleWeeklyTarget(task), isAddedToSelectedDay };
    })
    .filter(task => task.currentCount < task.target || task.isAddedToSelectedDay);
};
