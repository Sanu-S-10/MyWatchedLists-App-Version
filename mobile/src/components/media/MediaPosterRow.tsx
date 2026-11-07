import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { TMDB_IMAGE_BASE_W300 } from '../../config/env';

interface MediaPosterRowProps {
  id: number;
  title: string;
  posterPath?: string | null;
  subtitle?: string;
  rating?: number;
  mediaType?: 'movie' | 'tv' | 'series';
  onPress: () => void;
  width?: number;
}

export const MediaPosterRow: React.FC<MediaPosterRowProps> = ({
  title,
  posterPath,
  subtitle,
  rating,
  onPress,
  width = 120,
}) => {
  const posterUri = posterPath ? `${TMDB_IMAGE_BASE_W300}${posterPath}` : null;

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.posterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterText}>No Poster</Text>
          </View>
        )}

        {rating !== undefined && rating > 0 && (
          <View style={styles.ratingBadge}>
            <Star size={10} color={COLORS.star} fill={COLORS.star} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: SPACING.md,
  },
  posterWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPosterText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: SPACING.xs + 2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
});
