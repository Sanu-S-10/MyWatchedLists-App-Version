import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Badge } from '../common/Badge';
import { WatchItem } from '../../types/media';
import { TMDB_IMAGE_BASE_W300 } from '../../config/env';

interface MediaCardProps {
  item: WatchItem;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewMode?: 'grid' | 'list';
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPress,
  viewMode = 'grid',
}) => {
  const posterUri = item.posterPath
    ? `${TMDB_IMAGE_BASE_W300}${item.posterPath}`
    : null;

  const year = item.releaseDate ? item.releaseDate.substring(0, 4) : 'N/A';

  const getSubtypeLabel = () => {
    if (item.subType === 'anime') return 'Anime';
    if (item.subType === 'animation') return 'Animation';
    if (item.subType === 'documentary') return 'Doc';
    return item.mediaType === 'movie' ? 'Movie' : 'Series';
  };

  const getBadgeVariant = () => {
    if (item.subType === 'anime') return 'anime';
    if (item.subType === 'animation') return 'animation';
    if (item.subType === 'documentary') return 'documentary';
    return item.mediaType === 'movie' ? 'movie' : 'series';
  };

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        style={styles.listContainer}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={styles.listPosterWrap}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.listPoster} />
          ) : (
            <View style={styles.noPosterList}>
              <Text style={styles.noPosterText}>No Poster</Text>
            </View>
          )}
        </View>

        <View style={styles.listContent}>
          <View style={styles.listTopRow}>
            <Badge label={getSubtypeLabel()} variant={getBadgeVariant()} />
            {item.isFavorite && (
              <Heart size={15} color={COLORS.danger} fill={COLORS.danger} />
            )}
          </View>

          <Text style={styles.listTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.listMetaRow}>
            <Text style={styles.metaYear}>{year}</Text>
            {item.rating > 0 && (
              <View style={styles.ratingRow}>
                <Star size={13} color={COLORS.star} fill={COLORS.star} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
            {item.mediaType === 'series' && item.episodes !== undefined && item.episodes > 0 && (
              <Text style={styles.episodeMeta}>{item.episodes} ep watched</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid Mode (Default)
  return (
    <TouchableOpacity
      style={styles.gridContainer}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.gridPosterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.gridPoster} resizeMode="cover" />
        ) : (
          <View style={styles.noPosterGrid}>
            <Text style={styles.noPosterText}>No Poster</Text>
          </View>
        )}

        <View style={styles.badgeOverlay}>
          <Badge label={getSubtypeLabel()} variant={getBadgeVariant()} />
        </View>

        {item.isFavorite && (
          <View style={styles.favoriteBadge}>
            <Heart size={14} color="#FFFFFF" fill={COLORS.danger} />
          </View>
        )}

        {item.rating > 0 && (
          <View style={styles.gridRatingBadge}>
            <Star size={12} color={COLORS.star} fill={COLORS.star} />
            <Text style={styles.gridRatingText}>{item.rating}</Text>
          </View>
        )}
      </View>

      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.gridYear}>{year}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Grid
  gridContainer: {
    width: '48%',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridPosterWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  gridPoster: {
    width: '100%',
    height: '100%',
  },
  noPosterGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  noPosterText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  badgeOverlay: {
    position: 'absolute',
    top: SPACING.xs + 2,
    left: SPACING.xs + 2,
  },
  favoriteBadge: {
    position: 'absolute',
    top: SPACING.xs + 2,
    right: SPACING.xs + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: RADIUS.full,
  },
  gridRatingBadge: {
    position: 'absolute',
    bottom: SPACING.xs + 2,
    right: SPACING.xs + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  gridRatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  gridInfo: {
    padding: SPACING.sm,
  },
  gridTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  gridYear: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  // List
  listContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  listPosterWrap: {
    width: 60,
    height: 90,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  listPoster: {
    width: '100%',
    height: '100%',
  },
  noPosterList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  listTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  metaYear: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: COLORS.star,
    fontSize: 12,
    fontWeight: '600',
  },
  episodeMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
