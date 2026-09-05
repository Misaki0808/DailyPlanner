/**
 * Saat dilimi güvenlik kontrolü.
 *
 * Testlerin bir kısmı UTC ile yerel günün AYRIŞTIĞI anları doğruluyor
 * (planlar yerel tarihe göre anahtarlanıyor). Bu ancak sabit, UTC olmayan
 * bir dilimde anlamlı; dilim jest.config.js'in en üstünde ayarlanıyor.
 *
 * Burada sessizce geçmek yerine yüksek sesle patlıyoruz: daha önce bu
 * dosya TZ'yi kendisi atıyordu ama atama çok geç olduğu için hiçbir
 * etkisi yoktu. Geliştirici makinesinde ortam zaten doğru dilimde olduğu
 * için sorun fark edilmiyor, CI'da 7 test düşüyordu.
 */
const EXPECTED_TIMEZONE = 'Europe/Istanbul';
const actualTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

if (actualTimeZone !== EXPECTED_TIMEZONE) {
  throw new Error(
    `Testler ${EXPECTED_TIMEZONE} saat dilimini varsayıyor ama geçerli dilim "${actualTimeZone}". ` +
    'TZ, jest.config.js dosyasının en üstünde ayarlanmalı; setupFiles içinde ayarlamak GEÇ kalır ' +
    '(Node saat dilimini süreç başında önbelleğe alır).'
  );
}
