/**
 * TZ BURADA, config dosyasının EN ÜSTÜNDE ayarlanmalı.
 *
 * Jest her test dosyasını kendi test ortamı (jest-environment) bağlamında
 * çalıştırır ve bu bağlamı `setupFiles` çalışmadan ÖNCE kurar. Ortam
 * kurulurken bağlamın Date/Intl yerelleştirmesi o anki saat dilimine
 * bağlanır; `setupFiles` içinde `process.env.TZ` değiştirmek artık geç
 * kalır — env değişkeni değişir ama bağlamın geçerli dilimi değişmez.
 * (Ölçüm: TZ=UTC ortamda `process.env.TZ` "Europe/Istanbul" görünürken
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` hâlâ "UTC" dönüyordu.)
 *
 * Bu dosya ise jest tarafından ANA süreçte, test ortamları kurulmadan ve
 * worker'lar fork edilmeden önce değerlendirilir; dolayısıyla ortamlar
 * doğru dilimle kurulur. `npm test`, `npx jest` ve CI için aynı biçimde
 * çalışır.
 *
 * Not: bu jest'e özgü bir sıralama sorunudur. Node'un genelinde
 * `process.env.TZ` çalışma anında değiştirilebilir; buradaki kısıt,
 * atamanın test ortamı bağlamı kurulduktan sonra yapılmasından kaynaklanır.
 */
process.env.TZ = 'Europe/Istanbul';

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
};
