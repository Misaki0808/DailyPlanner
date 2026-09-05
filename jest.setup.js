// Testler saat diliminden bağımsız olmalı. Uygulama planları YEREL tarihe göre
// anahtarlar (getToday/formatDate), bu yüzden UTC'den farklı sabit bir dilim
// seçiyoruz: UTC ile yerel günün ayrıştığı saatler (00:00-03:00) böylece
// deterministik olarak test edilebiliyor.
process.env.TZ = 'Europe/Istanbul';
