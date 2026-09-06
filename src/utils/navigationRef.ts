import { createNavigationContainerRef } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/routes';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function navigate<RouteName extends keyof AppStackParamList>(
    name: RouteName,
    params?: AppStackParamList[RouteName]
) {
    if (navigationRef.isReady()) {
        // @ts-ignore - React Navigation type union complexity workaround
        navigationRef.navigate(name, params);
    }
}
