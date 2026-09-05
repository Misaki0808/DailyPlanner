import Toast from 'react-native-toast-message';

/**
 * Kalıcılık katmanı (storage.*) hataları yakalayıp `false` döndürür.
 * Store'lar ise iyimser davranıp önce belleği güncelliyor. Bu ikisi bir araya
 * gelince yazma başarısız olduğunda kullanıcı veriyi arayüzde kaydedilmiş
 * görüyor, ancak uygulamayı kapatıp açtığında veri kaybolmuş oluyordu.
 *
 * Başarısızlık en azından görünür olmalı ki kullanıcı işlemi tekrarlayabilsin.
 */
export const reportPersistFailure = (what: string) => {
  console.error(`Cihaza kaydedilemedi: ${what}`);
  Toast.show({
    type: 'error',
    text1: 'Kaydedilemedi',
    text2: `${what} cihaza kaydedilemedi. Cihaz depolama alanını kontrol edin.`,
  });
};

/**
 * storage.* çağrısını sarar; `false` dönerse kullanıcıya bildirir.
 * Dönen değer, çağıranın gerekirse ek işlem yapabilmesi için korunur.
 */
export const persistOrNotify = async (what: string, write: Promise<boolean>): Promise<boolean> => {
  const ok = await write;
  if (!ok) reportPersistFailure(what);
  return ok;
};
