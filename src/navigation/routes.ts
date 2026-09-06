import { RootTabParamList } from '../types';

/**
 * Uygulamanın gezinme rotaları.
 *
 * `Archive` ve `MultiDayView`ın tarih parametresi burada tanımlı, çünkü
 * `src/types/index.ts` bu turda başka bir worker'ın alanındaydı; rotaların
 * tek bir yerde toplanması ileride oraya taşınabilir.
 *
 * `MultiDayView` artık opsiyonel bir `date` alıyor: Takvim ve Geçmiş
 * ekranları seçilen güne atlamak için kullanıyor.
 */
export type AppStackParamList = Omit<RootTabParamList, 'MultiDayView'> & {
  MultiDayView: { date?: string } | undefined;
  Archive: undefined;
};

export type AppRouteName = keyof AppStackParamList;
