import React, { createContext, useCallback, useContext, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  }, [fadeAnim]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      setToast({ id: Date.now().toString(), message, type });
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        hideToast();
      }, 3500);
    },
    [fadeAnim, hideToast]
  );

  const showSuccess = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const showError = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const showInfo = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);
  const showWarning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);

  const getIcon = () => {
    if (!toast) return null;
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} color={COLORS.success} />;
      case 'error':
        return <XCircle size={18} color={COLORS.danger} />;
      case 'warning':
        return <AlertCircle size={18} color={COLORS.warning} />;
      default:
        return <Info size={18} color={COLORS.info} />;
    }
  };

  const getBorderColor = () => {
    if (!toast) return COLORS.border;
    switch (toast.type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.danger;
      case 'warning':
        return COLORS.warning;
      default:
        return COLORS.info;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + SPACING.md,
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
              borderColor: getBorderColor(),
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.iconContainer}>{getIcon()}</View>
          <Text style={styles.toastText} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99999,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  toastText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
