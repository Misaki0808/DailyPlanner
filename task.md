# DailyPlanner İyileştirme Görevleri

## 1. Mimari / Kod Kalitesi
- [x] **SettingsScreen bölünmesi** — 1257 → ~100 satır. [ProfileSection](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/settings/ProfileSection.tsx#21-135), [StatsSection](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/settings/StatsSection.tsx#21-173), [RecurringTasksSection](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/settings/RecurringTasksSection.tsx#27-273), [PreferencesSection](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/settings/PreferencesSection.tsx#24-211) oluşturuldu ✅
- [x] **MultiDayViewScreen bölünmesi** — 1087 → ~350 satır. [DateNavigation](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/planner/DateNavigation.tsx#16-49), [FlexibleTaskPool](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/planner/FlexibleTaskPool.tsx#22-68), [ActionButtonsBar](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/planner/ActionButtonsBar.tsx#24-153), [DayStatsBar](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/components/planner/DayStatsBar.tsx#17-46) oluşturuldu ✅
- [x] **Ortak stiller** — [sharedStyles.ts](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/utils/sharedStyles.ts) oluşturuldu (`glassCard`, `glassCardPadded`, `sectionTitle`, `label`, `glassCardNoBorder`, `taskCard`). 9 dosya güncellendi, ~120 satır tekrar kaldırıldı ✅
- [x] **Tema tutarlılığı** — [theme.ts](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/utils/theme.ts) genişletildi (13 gradient, 15+ renk token). 5 dosya güncellendi, [PlanOverviewScreen](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/screens/PlanOverviewScreen.tsx#7-121) artık dark mode destekliyor ✅
- [x] **`any` tiplerini düzelt** — 5 `as any` kullanımı kaldırıldı (RecurringTask tipi, Web Speech API tipleri, outlineStyle). Kodda sıfır `as any` kaldı ✅

## 2. Veri Yönetimi
- [x] **Storage optimizasyonu** — [updateTask](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/utils/storage.ts#81-103) çift okuma sorununu düzeltildi, [refreshPlans](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/hooks/usePlans.ts#8-16) gereksiz çağrıları temizlendi ✅
- [x] **AppContext bölünmesi** — Context [usePlans](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/hooks/usePlans.ts#5-55), [useSettings](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/hooks/useSettings.ts#5-26), [useUser](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/hooks/useUser.ts#5-31), [useRecurringTasks](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/hooks/useRecurringTasks.ts#6-104) custom hook'larına bölündü. Context 280 → ~90 satıra düştü ✅
- [x] **Eski plan temizliği** — 90 günden eski planları otomatik temizle fonksiyonu eklendi ve startup aşamasına bağlandı ✅

## 3. UX / Kullanıcı Deneyimi
- [x] **Navigation tip tanımları** — [RootTabParamList](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/types/index.ts#48-54)'i tamamlandı, tüm navigasyon (`createStackNavigator`, [navigate](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/utils/navigationRef.ts#6-15)) type-safe hale getirildi ✅
- [x] **Bildirim ayarı** — Devre dışıysa bildirim saati ayarı gizlenip yerine durumu açıklayan metin gösterildi ✅
- [x] **PlanOverview responsive** — Merkez ve çevresel nodların boyutları `Math.min` ile sınırlandırıldı, çakışma önlendi ✅
- [x] **Dark mode tutarlılığı** — Tüm ekranlarda dark mode desteği sağlandı ve Light Mode için çok daha soft, profesyonel pastel tonlar tanımlandı ✅

## 4. Yeni Özellikler
- [x] Görev düzenleme (başlık edit, kategori, not)
- [ ] Görev sıralama (drag & drop veya yukarı/aşağı butonlar)
- [x] Arama / filtreleme (büyük-küçük harf duyarsız, kategori seçimi)
- [x] Görev kategorileri (AI ile oto-atama, manuel düzenleme)
- [x] Onboarding ekranı (isim alma ve gender seçimi animasyonlu ekran)
- [ ] Haftalık/aylık takvim görünümü
- [x] Veri yedekleme / dışa aktarma (JSON/CSV İndir, Dashboard Resmi Paylaş)
- [ ] Widget desteği

## 5. Teknik Borç
- [ ] Error boundary ekle
- [ ] [generateId()](file:///Users/efe_baydemir/Okul/MobileAPP%20Development%20Final%20Project/Daily%20Planner%20Antigravity/DailyPlanner/src/utils/dateUtils.ts#71-77) → uuid v4'e geçiş
- [ ] Unused imports temizliği
- [ ] ESLint / Prettier konfigürasyonu
- [ ] Unit test ekleme
- [ ] API key backend proxy
