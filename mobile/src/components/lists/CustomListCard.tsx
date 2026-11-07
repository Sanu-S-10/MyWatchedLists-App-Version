import React from 'react';
import {
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Edit2, Share2, Trash2 } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { CustomList } from '../../types/customList';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

interface CustomListCardProps {
  list: CustomList;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const CustomListCard: React.FC<CustomListCardProps> = ({
  list,
  onPress,
  onEdit,
  onDelete,
}) => {
  const items = list.items || [];
  const previewItems = items.slice(0, 4);

  const handleShare = async () => {
    try {
      const shareUrl = `https://my-watched-lists.vercel.app/shared-list/${list.shareId}`;
      await Share.share({
        title: list.name,
        message: `Check out my list "${list.name}" on MyWatchedLists: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {}
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={styles.listName} numberOfLines={1}>
            {list.name}
          </Text>
          {list.description ? (
            <Text style={styles.listDesc} numberOfLines={2}>
              {list.description}
            </Text>
          ) : null}
          <Text style={styles.itemCountText}>
            {list.itemCount || items.length} {items.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Share2 size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit2 size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Poster collage preview */}
      {previewItems.length > 0 ? (
        <View style={styles.posterRow}>
          {previewItems.map((item, index) => {
            const posterUri = item.posterPath
              ? `${TMDB_IMAGE_BASE_W185}${item.posterPath}`
              : null;
            return (
              <View key={item.tmdbId || index} style={styles.previewPosterWrap}>
                {posterUri ? (
                  <Image source={{ uri: posterUri }} style={styles.previewPoster} />
                ) : (
                  <View style={styles.noPreviewPoster}>
                    <Text style={styles.noPosterText} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyListWrap}>
          <Text style={styles.emptyListText}>No titles added yet</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  titleCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  listName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  listDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  itemCountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtn: {
    padding: SPACING.xs + 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
  },
  posterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  previewPosterWrap: {
    flex: 1,
    aspectRatio: 2 / 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  previewPoster: {
    width: '100%',
    height: '100%',
  },
  noPreviewPoster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  noPosterText: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  emptyListWrap: {
    paddingVertical: SPACING.sm,
  },
  emptyListText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
