export const strings = {
  tr: {
    planOverview: 'Genel Bakış',
    myPlans: 'Planlarım',
    createPlan: 'Plan Oluştur',
    pomodoro: 'Pomodoro',
    settings: 'Ayarlar',
    noPlanForToday: 'Bu gün için plan yok',
    noPlanForTodayDesc: '"Plan Oluştur" sekmesinden yeni plan ekleyebilirsiniz',
    completed: 'Tamamlandı',
    tasks: 'Görev',
    subtasks: 'Alt Görevler',
    editTask: 'Görevi Düzenle',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    add: 'Ekle',
    newSubtask: 'Yeni alt görev...',
    success: 'Başarılı',
    error: 'Hata',
    warning: 'Uyarı',
  },
  en: {
    planOverview: 'Overview',
    myPlans: 'My Plans',
    createPlan: 'Create Plan',
    pomodoro: 'Pomodoro',
    settings: 'Settings',
    noPlanForToday: 'No plans for today',
    noPlanForTodayDesc: 'You can add new plans from the "Create Plan" tab',
    completed: 'Completed',
    tasks: 'Tasks',
    subtasks: 'Subtasks',
    editTask: 'Edit Task',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    add: 'Add',
    newSubtask: 'New subtask...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
  }
};

// In a real application, you would determine this dynamically
// or using a Context/State. For now, we export a fixed currentLocale.
export const currentLocale: 'tr' | 'en' = 'tr';

export const t = (key: keyof typeof strings.tr) => {
  return strings[currentLocale][key];
};
