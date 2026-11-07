import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface StarRatingProps {
  rating: number; // 0 to 5
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRate,
  size = 22,
  readonly = false,
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (value: number) => {
    if (readonly || !onRate) return;
    // Tapping the same star toggles it off to 0
    if (rating === value) {
      onRate(0);
    } else {
      onRate(value);
    }
  };

  return (
    <View style={styles.container}>
      {stars.map((star) => {
        const isFilled = star <= rating;
        return (
          <TouchableOpacity
            key={star}
            disabled={readonly}
            onPress={() => handlePress(star)}
            activeOpacity={0.7}
            style={styles.starTouch}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Star
              size={size}
              color={isFilled ? COLORS.star : COLORS.starEmpty}
              fill={isFilled ? COLORS.star : 'transparent'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  starTouch: {
    padding: 2,
  },
});
