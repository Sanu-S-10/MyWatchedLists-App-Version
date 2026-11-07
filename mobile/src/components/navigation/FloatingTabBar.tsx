import React, { useRef } from 'react';
import {
  DeviceEventEmitter,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bookmark,
  Home,
  List,
  Search,
  User,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS } from '../../constants/theme';

export interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation?: any;
  navigateToTab?: (routeKey: string) => void;
  [key: string]: any;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = React.memo(({
  state,
  descriptors,
  navigation,
  navigateToTab,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const lastTapRef = useRef<{ time: number; key: string }>({ time: 0, key: '' });

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) + 4 : 14,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const now = Date.now();
            const isDoubleTap =
              lastTapRef.current.key === route.key &&
              now - lastTapRef.current.time < 500;
            lastTapRef.current = { time: now, key: route.key };

            if (isDoubleTap) {
              if (!isFocused) {
                if (navigation?.navigate) {
                  navigation.navigate(route.name);
                } else if (navigateToTab) {
                  navigateToTab(route.key);
                } else {
                  router.navigate(route.name === 'index' ? '/(tabs)' : (`/(tabs)/${route.name}` as any));
                }
              }
              DeviceEventEmitter.emit('NAVBAR_DOUBLE_TAP', {
                tab: route.name,
              });
              return;
            }

            if (navigation?.emit) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (navigation.navigate) {
                  navigation.navigate(route.name);
                } else if (navigateToTab) {
                  navigateToTab(route.key);
                } else {
                  router.navigate(route.name === 'index' ? '/(tabs)' : (`/(tabs)/${route.name}` as any));
                }
              }
            } else if (!isFocused) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else {
                router.navigate(route.name === 'index' ? '/(tabs)' : (`/(tabs)/${route.name}` as any));
              }
            }
          };

          const onLongPress = () => {
            if (navigation?.emit) {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            }
          };

          // Center Button: "Lists" (Elevated Floating Circle)
          const isCenter = route.name === 'lists';

          const getIcon = () => {
            const iconSize = isCenter ? 22 : 21;
            const strokeWidth = isFocused ? 2.5 : 2;
            const iconColor = isCenter
              ? isFocused
                ? colors.primaryContrast
                : colors.textMuted
              : isFocused
              ? colors.primary
              : colors.textMuted;

            switch (route.name) {
              case 'index':
                return <Home size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
              case 'discover':
                return <Search size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
              case 'lists':
                return <List size={iconSize} color={iconColor} strokeWidth={isFocused ? 2.6 : 2} />;
              case 'library':
                return <Bookmark size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
              case 'profile':
                return <User size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
              default:
                return <Home size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
            }
          };

          const getLabel = () => {
            if (options.title) return options.title;
            switch (route.name) {
              case 'index':
                return 'Home';
              case 'discover':
                return 'Search';
              case 'lists':
                return 'Lists';
              case 'library':
                return 'Library';
              case 'profile':
                return 'Profile';
              default:
                return route.name;
            }
          };

          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerContainer} pointerEvents="box-none">
                {/* Visual arch behind the center button for smooth detached curve */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.centerBackdropArch,
                    {
                      backgroundColor: colors.card,
                      borderColor: isFocused ? colors.primary + '55' : colors.border,
                    },
                  ]}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  activeOpacity={0.8}
                  hitSlop={{ top: 14, bottom: 8, left: 12, right: 12 }}
                  style={styles.centerTouchable}
                >
                  <View
                    style={[
                      styles.centerCircle,
                      isFocused
                        ? {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                            shadowColor: colors.primary,
                            shadowOpacity: 0.5,
                            shadowRadius: 10,
                            elevation: 8,
                          }
                        : {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1.2,
                            shadowOpacity: 0,
                            elevation: 0,
                          },
                    ]}
                  >
                    {getIcon()}
                  </View>
                  <Text
                    style={[
                      styles.centerLabel,
                      {
                        color: isFocused ? colors.primary : colors.textMuted,
                        fontWeight: isFocused ? '700' : '500',
                      },
                    ]}
                  >
                    {getLabel()}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>{getIcon()}</View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.primary : colors.textMuted,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {getLabel()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '100%',
    height: 64,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 64,
  },
  centerBackdropArch: {
    position: 'absolute',
    top: -12,
    width: 60,
    height: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
    borderBottomWidth: 0,
    zIndex: 1,
  },
  centerTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    zIndex: 2,
  },
  centerCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
  },
  centerLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
  },
});
