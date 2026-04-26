# DailyPlanner V3 Görev Panosu

## 1. Bağımsız Pomodoro Ekranı 🍅 (Tamamlandı)
- [x] Sol menüye (JSDrawer) Pomodoro sekmesi eklenmesi
- [x] Dairesel SVG tabanlı zamanlayıcı tasarımı (25dk odak, 5dk mola)
- [x] Play, Pause ve mod değiştirme kontrol butonları
- [x] Animasyonlu geri sayım ve bildirim entegrasyonu

---

## 2. Pomodoro UI İyileştirmeleri 🎨

### 2.1 Kontrol Butonları Yenileme
- [x] Emoji butonlar (🔄 ⏸️ ▶️ ⏭️) yerine düzgün SVG/icon bazlı butonlar
- [x] Play/Pause butona basma animasyonu (scale bounce)
- [x] Reset ve Skip butonlarına onay tooltip'i (yanlışlıkla basmayı engelle)
- [x] Butonlar arası hiyerarşi → Play büyük + belirgin, diğerleri küçük + subtle

### 2.2 Dairesel Progress Ring Geliştirme
- [x] Progress ring'e animated glow efekti (aktifken neon parlama)
- [x] Süre azaldıkça renk geçişi (yeşil → sarı → kırmızı, son 30 saniye)
- [x] Ring dolum animasyonu başlarken smooth transition (spring animation)

### 2.3 Oturum Göstergesi (Session Dots)
- [x] Alt kısımdaki "Bugün tamamlanan: X oturum" yerine görsel dot göstergesi
- [x] 4 adet dot: tamamlanan dolu, aktif nabız animasyonlu, bekleyen boş
- [x] 4. oturum sonrası "🌿 Uzun mola hak ettin!" animasyonlu banner

### 2.4 Mod Seçici & Ekran Geçişleri
- [x] Aktif mod butonunun altına sliding indicator bar (tab bar tarzı kayar çubuk)
- [x] Her mod için farklı ekran gradient'i (Odak: koyu mor, Kısa Mola: yeşilimsi, Uzun Mola: mavimsi)
- [x] Mod geçişlerinde smooth gradient animasyonu
- [x] Aktif mod butonuna subtle pulse/nefes animasyonu

---

## 3. Pomodoro Yeni Özellikler 🚀

### 3.1 Görev Bağlama (Task Linking) — Opsiyonel
- [x] Timer üstünde küçük dokunulabilir chip: varsayılan "Serbest Odak 🎯"
- [x] Chip'e tıklayınca bottom sheet açılır, bugünün görevleri listelenir
- [x] Görevler iş/proje kategorisi en üstte olacak şekilde sıralanır
- [x] Seçilen görev chip'te görünür, yanında ❌ ile kaldırılabilir
- [x] Hiç seçmezsen Pomodoro normal çalışır — popup/zorlama yok
- [x] Oturum bitince bağlı görevin "pomodoro sayısı" artsın

### 3.2 İstatistik Kalıcılığı (AsyncStorage)
- [x] completedSessions'ı AsyncStorage'a kaydet (tarih bazlı)
- [x] Günlük/haftalık/aylık oturum sayısı geçmişi
- [x] Basit çubuk grafik veya streak (art arda gün) göstergesi

### 3.3 Özelleştirilebilir Süreler
- [x] Pomodoro ekranı veya Ayarlar'dan süre ayarlama
- [x] Odak: 15 / 25 / 30 / 45 / 60 dk seçenekleri
- [x] Kısa Mola: 3 / 5 / 10 dk
- [x] Uzun Mola: 10 / 15 / 20 / 30 dk

### 3.4 Ortam Sesleri (Ambient Sounds)
- [x] expo-av ile arka plan ses oynatma (Expo Go'da çalışır)
- [x] Ses seçenekleri: 🌧️ Yağmur, 🌊 Deniz, 🔥 Şömine, 🌲 Orman, 📖 Lo-fi
- [x] **Varsayılan: sessiz** — kullanıcı isterse aktif eder
- [x] Ses toggle butonu timer yanında (hoparlör ikonu)
- [x] Ses seviyesi ayarı (slider)
- [x] Mola modunda ses otomatik duraklar veya devam eder (kullanıcı tercihi)

### 3.5 Pomodoro Bildirim Sesi — Opsiyonel
- [x] Süre bitince kısa "ding" sesi (expo-av)
- [x] **Varsayılan: KAPALI** — ayarlardan açılabilir
- [x] Açıkken bile sadece titreşim+ses, kapalıyken sadece titreşim

### 3.6 Arka Plan Zamanlayıcısı (AppState & Local Notifications)
- [x] Uygulama arka plana atıldığında (AppState) timestamp kaydet
- [x] Uygulama öne geldiğinde geçen süreyi hesapla ve düş
- [x] Zamanlayıcı başlatıldığında `expo-notifications` ile bitiş anına bildirim kur (ekran kilitliyken çalması için)
- [x] Timer durdurulur/sıfırlanırsa bildirimi iptal et

---

## 4. Ana Ekran Widget 📱

### 4.1 Araştırma & Altyapı (Development Build Gerekli)
- [x] `react-native-android-widget` paketini araştır ve kur
- [ ] Kilit ekranı / bildirim çubuğu canlı sayaç için Foreground Service paketi (`notifee` veya benzeri) araştır
- [x] Widget ve Foreground Service için Expo config plugin yapısını oluştur
- [x] Widget ↔ App arası veri paylaşımı mekanizması (AsyncStorage + requestWidgetUpdate)

### 4.2 Widget Arayüzü
- [x] Günün özeti: tarih, toplam görev sayısı, tamamlanan sayısı
- [x] İlk 3-4 görevin başlığını göster (öncelik sırasına göre)
- [x] Mini progress bar (tamamlanma yüzdesi)
- [x] Widget'a tıklayınca uygulamayı aç

### 4.3 Veri Senkronizasyonu
- [x] Görev tamamlandığında widget'ı güncelle
- [x] Gece yarısı otomatik yeni güne geç (Android native widget updatePeriodMillis ile çözüldü)
- [x] Background task ile periyodik güncelleme (app.json updatePeriodMillis = 1800000)

> ⚠️ **Not:** Widget özelliği Development Build gerektirir — Expo Go'da test edilemez.

---

## 5. Ek Özellikler 💡

| # | Özellik | Aciliyet | Durum |
|---|---------|----------|-------|
| 1 | Pomodoro UI Overhaul (bölüm 2) | 🔴 10/10 | ✅ Onaylandı |
| 2 | İstatistik Kalıcılığı (3.2) | 🔴 9/10 | ✅ Onaylandı |
| 3 | Görev Bağlama (3.1) | 🟠 8/10 | ✅ Onaylandı |
| 4 | Özelleştirilebilir Süreler (3.3) | 🟠 7/10 | ✅ Onaylandı |
| 5 | Tam Ekran Mod Gradient'leri (2.4) | 🟡 6/10 | ✅ Onaylandı |
| 6 | Widget (bölüm 4) | 🟡 5/10 | ✅ Onaylandı |
| 7 | Ortam Sesleri (3.4) | 🟡 5/10 | ✅ Onaylandı |
| 8 | Haftalık Pomodoro Streak | 🔵 4/10 | ✅ Onaylandı |
| 9 | Bildirim Sesi (3.5) | 🔵 3/10 | ✅ Onaylandı (varsayılan kapalı) |
| 10 | Pomodoro Özel Tema Paleti | 🔵 2/10 | ✅ Onaylandı |
