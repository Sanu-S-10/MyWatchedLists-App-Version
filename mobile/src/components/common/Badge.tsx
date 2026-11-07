import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

export type BadgeVariant =
  | 'movie'
  | 'series'
  | 'anime'
  | 'animation'
  | 'documentary'
  | 'rating'
  | 'new_season'
  | 'primary'
  | 'purple'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'default';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'movie':
      case 'primary':
        return styles.primary;
      case 'series':
      case 'purple':
        return styles.purple;
      case 'anime':
        return styles.anime;
      case 'animation':
        return styles.animation;
      case 'documentary':
        return styles.documentary;
      case 'rating':
        return styles.rating;
      case 'new_season':
      case 'danger':
        return styles.danger;
      case 'info':
        return styles.info;
      case 'warning':
        return styles.warning;
      case 'success':
        return styles.success;
      default:
        return styles.defaultBadge;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'movie':
      case 'primary':
        return styles.primaryText;
      case 'series':
      case 'purple':
        return styles.purpleText;
      case 'anime':
        return styles.animeText;
      case 'animation':
        return styles.animationText;
      case 'documentary':
        return styles.documentaryText;
      case 'rating':
        return styles.ratingText;
      case 'new_season':
      case 'danger':
        return styles.dangerText;
      case 'info':
        return styles.infoText;
      case 'warning':
        return styles.warningText;
      case 'success':
        return styles.successText;
      default:
        return styles.defaultText;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.size_sm,
        getBadgeStyle(),
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' && styles.text_sm,
          getTextStyle(),
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.xs + 2,
    alignSelf: 'flex-start',
  },
  size_sm: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  text_sm: {
    fontSize: 9.5,
  },
  defaultBadge: {
    backgroundColor: COLORS.surface,
  },
  defaultText: {
    color: COLORS.textSecondary,
  },
  primary: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  primaryText: {
    color: '#60A5FA',
  },
  purple: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  purpleText: {
    color: '#C084FC',
  },
  anime: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  animeText: {
    color: '#F472B6',
  },
  animation: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  animationText: {
    color: '#FBBF24',
  },
  documentary: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  documentaryText: {
    color: '#34D399',
  },
  rating: {
    backgroundColor: 'rgba(245, 197, 24, 0.2)',
  },
  ratingText: {
    color: COLORS.star,
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerText: {
    color: '#F87171',
  },
  info: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  infoText: {
    color: '#38BDF8',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    color: '#FBBF24',
  },
  success: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: {
    color: '#34D399',
  },
});
