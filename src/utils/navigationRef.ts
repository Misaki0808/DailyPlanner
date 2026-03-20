import { createNavigationContainerRef } from '@react-navigation/native';
import { RootTabParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigate<RouteName extends keyof RootTabParamList>(
    name: RouteName,
    params?: RootTabParamList[RouteName]
) {
    if (navigationRef.isReady()) {
        // @ts-ignore - React Navigation type union complexity workaround
        navigationRef.navigate(name, params);
    }
}
