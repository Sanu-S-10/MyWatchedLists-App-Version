import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { FilmReelSpinner } from './FilmLoading';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  fullWidth = false,
  style,
  disabled,
  ...rest
}) => {
  const { colors } = useTheme();
  const effectiveLeftIcon = leftIcon || icon;

  const getContainerStyle = () => {
    const base: any[] = [styles.button, styles[`size_${size}`]];
    if (fullWidth) base.push(styles.fullWidth);

    switch (variant) {
      case 'primary':
        base.push([
          styles.primaryButton,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]);
        break;
      case 'secondary':
        base.push([
          styles.secondaryButton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]);
        break;
      case 'danger':
        base.push(styles.dangerButton);
        break;
      case 'outline':
        base.push([
          styles.outlineButton,
          {
            borderColor: colors.primary,
          },
        ]);
        break;
      case 'ghost':
        base.push(styles.ghostButton);
        break;
    }

    if (disabled || isLoading) {
      base.push(styles.disabledButton);
    }

    return base;
  };

  const getTextStyle = () => {
    const base: any[] = [styles.text, styles[`textSize_${size}`]];

    switch (variant) {
      case 'primary':
        base.push({ color: colors.primaryContrast });
        break;
      case 'secondary':
        base.push({ color: colors.textPrimary });
        break;
      case 'danger':
        base.push(styles.dangerText);
        break;
      case 'outline':
        base.push({ color: colors.primary });
        break;
      case 'ghost':
        base.push({ color: colors.textSecondary });
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      disabled={disabled || isLoading}
      activeOpacity={0.75}
      {...rest}
    >
      {isLoading ? (
        <FilmReelSpinner
          size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18}
          color={
            variant === 'primary'
              ? colors.primaryContrast
              : variant === 'secondary' || variant === 'ghost'
              ? colors.textPrimary
              : '#FFFFFF'
          }
        />
      ) : (
        <View style={styles.contentRow}>
          {effectiveLeftIcon && <View style={styles.leftIcon}>{effectiveLeftIcon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  rightIcon: {
    marginLeft: SPACING.sm,
  },
  // Sizes
  size_sm: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
  },
  size_md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  size_lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
  },
  // Variants
  primaryButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Typography
  text: {
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: COLORS.textPrimary,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: COLORS.primary,
  },
  ghostText: {
    color: COLORS.textSecondary,
  },
});
