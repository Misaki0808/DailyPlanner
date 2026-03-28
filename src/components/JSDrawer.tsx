import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { useDrawer } from '../context/DrawerContext';
import { useApp } from '../context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { navigationRef } from '../utils/navigationRef';

const DRAWER_WIDTH = 280;

type MenuItemProps = {
    label: string;
    icon: string;
    targetScreen: string;
    onPress: () => void;
    isActive: boolean;
    theme: import('../utils/theme').Theme;
};

function MenuItem({ label, icon, onPress, isActive, theme }: MenuItemProps) {
    return (
        <TouchableOpacity
            style={[
                styles.menuItem,
                isActive && { backgroundColor: theme.accentLight },
            ]}
            onPress={onPress}
        >
            <Text style={styles.menuItemIcon}>{icon}</Text>
            <Text style={[
                styles.menuItemText,
                { color: theme.textSecondary },
                isActive && { color: theme.text, fontWeight: '700' },
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export default function JSDrawer({ children }: { children: React.ReactNode }) {
    const { isDrawerOpen, closeDrawer } = useDrawer();
    const { username, gender, theme } = useApp();
    const { width: screenWidth } = useWindowDimensions();

    // Animasyon değeri: 0 (kapalı) -> 1 (açık)
    const animValue = useRef(new Animated.Value(0)).current;

    // Çekmece açılıp kapanınca animasyonu tetikle
    useEffect(() => {
        Animated.timing(animValue, {
            toValue: isDrawerOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isDrawerOpen]);

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-DRAWER_WIDTH, 0],
    });

    const backdropOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    // Arkaplan (Backdrop) tıklandığında kapanması için bindirilen view
    // pointerEvents, drawer kapalıyken 'none' olmalı ki arkadaki uygulama kullanılabilsin
    const backdropStyle = {
        opacity: backdropOpacity,
        zIndex: isDrawerOpen ? 1 : -1,
    };

    const [activeRouteName, setActiveRouteName] = React.useState('CreatePlan');

    useEffect(() => {
        const unsubscribe = navigationRef.addListener('state', () => {
            const route = navigationRef.getCurrentRoute();
            if (route) {
                setActiveRouteName(route.name);
            }
        });
        return unsubscribe;
    }, []);

    const navigateTo = (screenName: keyof import('../types').RootTabParamList) => {
        if (navigationRef.isReady()) {
            navigationRef.navigate(screenName);
            closeDrawer();
        }
    };

    const getAvatarContent = () => {
        return gender === 'female' ? '👩‍💼' : '👨‍💼';
    };

    return (
        <View style={styles.root}>
            {/* Ana Uygulama İçeriği */}
            <View style={styles.mainContent}>{children}</View>

            {/* Karartma Arkaplanı */}
            <TouchableWithoutFeedback onPress={closeDrawer}>
                <Animated.View
                    style={[styles.backdrop, backdropStyle]}
                    pointerEvents={isDrawerOpen ? 'auto' : 'none'}
                />
            </TouchableWithoutFeedback>

            {/* Kayar Menü */}
            <Animated.View
                style={[
                    styles.drawer,
                    {
                        transform: [{ translateX }],
                        backgroundColor: theme.background,
                    },
                ]}
            >
                <LinearGradient
                    colors={theme.accentGradient}
                    style={styles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={styles.avatarIcon}>{getAvatarContent()}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{username || 'Kullanıcı'}</Text>
                    <Text style={styles.userSubtitle}>DailyPlanner</Text>
                </LinearGradient>

                <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContainer}>
                    <MenuItem
                        label="Plan Oluştur"
                        icon="📝"
                        targetScreen="CreatePlan"
                        isActive={activeRouteName === 'CreatePlan'}
                        onPress={() => navigateTo('CreatePlan')}
                        theme={theme}
                    />
                    <MenuItem
                        label="Planlarım"
                        icon="📅"
                        targetScreen="MultiDayView"
                        isActive={activeRouteName === 'MultiDayView'}
                        onPress={() => navigateTo('MultiDayView')}
                        theme={theme}
                    />
                    <MenuItem
                        label="Aylık Takvim"
                        icon="🗓️"
                        targetScreen="Calendar"
                        isActive={activeRouteName === 'Calendar'}
                        onPress={() => navigateTo('Calendar')}
                        theme={theme}
                    />
                    <MenuItem
                        label="Genel Bakış"
                        icon="🔍"
                        targetScreen="PlanOverview"
                        isActive={activeRouteName === 'PlanOverview'}
                        onPress={() => navigateTo('PlanOverview')}
                        theme={theme}
                    />
                    <MenuItem
                        label="Ayarlar"
                        icon="⚙️"
                        targetScreen="Settings"
                        isActive={activeRouteName === 'Settings'}
                        onPress={() => navigateTo('Settings')}
                        theme={theme}
                    />
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: theme.border }]}>
                    <Text style={[styles.version, { color: theme.textMuted }]}>v1.0.0</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    mainContent: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    drawer: {
        ...StyleSheet.absoluteFillObject,
        width: DRAWER_WIDTH,
        zIndex: 2,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    header: {
        padding: 30,
        paddingTop: 60,
        paddingBottom: 30,
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarIcon: {
        fontSize: 48,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    userSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    menuScroll: {
        flex: 1,
    },
    menuContainer: {
        paddingTop: 20,
        paddingHorizontal: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    menuItemIcon: {
        fontSize: 20,
        marginRight: 16,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    version: {
        fontSize: 12,
    },
});
