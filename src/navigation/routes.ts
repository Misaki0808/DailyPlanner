/**
 * Uygulamanın gezinme rotalarının TEK doğruluk kaynağı.
 *
 * Rotalar bir dönem hem `types/index.ts`'teki `RootTabParamList`'te hem
 * burada tanımlıydı ve ikisi ayrışmıştı: oradaki tanım `MultiDayView`ı
 * parametresiz gösteriyor ve `Archive` rotasını hiç bilmiyordu, yani onu
 * okuyan yanlış bilgi alıyordu. Artık gerçek tanımlar yalnız burada.
 */
export type AppStackParamList = {
  CreatePlan: undefined;
  /** Takvim ve Geçmiş ekranları seçilen güne atlamak için `date` geçiyor. */
  MultiDayView: { date?: string } | undefined;
  PlanOverview: undefined;
  Pomodoro: undefined;
  CalendarGrid: undefined;
  Archive: undefined;
  Settings: undefined;
};

export type AppRouteName = keyof AppStackParamList;

/**
 * Parametre GEREKTİRMEYEN rotalar. Drawer yalnız bunlara gidebilir; böylece
 * parametre bekleyen bir rotaya yanlışlıkla parametresiz gitmek derleme
 * hatası olur.
 */
export type ParamlessRouteName = {
  [K in AppRouteName]: undefined extends AppStackParamList[K] ? K : never;
}[AppRouteName];

/**
 * `useNavigation()` ve `useRoute()` çağrılarının jenerik verilmeden
 * tiplenmesini sağlar (React Navigation'ın önerdiği yol). Bu bildirim
 * olmadan her çağrı `any`ye düşüyor ve rota adı/parametresi denetlenmiyordu.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Boş gövde ZORUNLU: React Navigation bu arayüzü bildirim birleştirmesiyle
    // (declaration merging) genişletiyor; `type` diğer adı ya da gövdeye üye
    // eklemek birleştirmeyi bozar.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends AppStackParamList {}
  }
}
