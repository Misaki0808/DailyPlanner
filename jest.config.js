/**
 * TZ BURADA, config dosyasının EN ÜSTÜNDE ayarlanmalı.
 *
 * Node/V8 saat dilimini süreç başlarken bir kez okuyup önbelleğe alır.
 * Bu atama daha önce `setupFiles` içindeydi (jest.setup.js); orası test
 * worker'ı ayağa kalktıktan SONRA çalıştığı için `process.env.TZ` değişse
 * bile geçerli dilim değişmiyordu. Geliştirici makinesinde ortam zaten
 * Europe/Istanbul olduğu için sorun görünmüyor, CI (UTC) ise
 * yerel-tarih testlerinde kırmızıya düşüyordu.
 *
 * Bu dosya jest tarafından ANA süreçte, worker'lar fork edilmeden önce
 * değerlendirilir; dolayısıyla worker'lar doğru dilimle başlar.
 * `npm test`, `npx jest` ve CI için aynı biçimde çalışır.
 */
process.env.TZ = 'Europe/Istanbul';

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
};
