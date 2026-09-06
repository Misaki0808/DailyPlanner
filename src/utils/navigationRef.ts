import { createNavigationContainerRef } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/routes';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/**
 * Bileşen dışından gezinme.
 *
 * Dışa dönük imza TAM TİPLİ: rota adı `AppStackParamList`in bir anahtarı
 * olmak zorunda ve parametre o rotanın beklediği türde. Parametresiz
 * rotalarda ikinci argüman opsiyonel, parametre bekleyenlerde zorunlu.
 *
 * İçerideki `as never`, React Navigation'ın kendi belgelerinde önerdiği
 * yol: `navigate` aşırı yüklemesi rota adı bir DEĞİŞKEN olduğunda birleşim
 * tipini çözemiyor. Kaçış tek satıra hapsedildi; çağrı yerleri denetleniyor.
 * (Önceden burada `@ts-ignore` vardı ve tüm çağrıyı denetimsiz bırakıyordu.)
 */
export function navigate<RouteName extends AppRouteName>(
    name: RouteName,
    ...args: undefined extends AppStackParamList[RouteName]
        ? [params?: AppStackParamList[RouteName]]
        : [params: AppStackParamList[RouteName]]
) {
    if (navigationRef.isReady()) {
        // Tek satırlık, imzası açıkça yazılmış yerel dönüşüm.
        const navigateUnsafely = navigationRef.navigate as (
            routeName: string,
            routeParams?: object
        ) => void;
        navigateUnsafely(name, args[0]);
    }
}

type AppRouteName = keyof AppStackParamList;
