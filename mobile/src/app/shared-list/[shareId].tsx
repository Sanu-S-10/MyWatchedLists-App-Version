import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Film,
  Info,
  List,
  Share2,
  Tv,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { FilmLoading } from '../../components/common/FilmLoading';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';
import { customListService } from '../../services/customListService';
import { useToast } from '../../context/ToastContext';
import { SharedCustomList } from '../../types/customList';

export default function SharedListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const { showSuccess, showError } = useToast();

  const [list, setList] = useState<SharedCustomList | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchList() {
      if (!shareId) {
        setErrorMessage('Missing share code');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await customListService.getSharedCustomList(shareId);
        if (!isMounted) return;
        setList(data);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to fetch shared list:', err);
        setErrorMessage('This shared list is no longer available or the link is invalid.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchList();

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const handleShare = async () => {
    if (!list) return;
    try {
      await Share.share({
        title: list.name,
        message: `Check out "${list.name}" on MyWatchedLists! Includes ${list.itemCount} recommended titles.`,
      });
    } catch (e) {
      // Ignored
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <FilmLoading size="lg" message="Loading shared list..." />
      </View>
    );
  }

  if (errorMessage || !list) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Info size={48} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Unavailable</Text>
        <Text style={styles.errorMessage}>{errorMessage || 'List could not be found'}</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Share2 size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* List Meta Banner */}
      <View style={styles.metaBanner}>
        <View style={styles.listBadge}>
          <List size={16} color={COLORS.primaryLight} />
          <Text style={styles.listBadgeText}>Shared List</Text>
        </View>

        <Text style={styles.listTitle}>{list.name}</Text>
        {list.description ? (
          <Text style={styles.listDescription}>{list.description}</Text>
        ) : null}

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{list.itemCount} Recommended Titles</Text>
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={list.items}
        keyExtractor={(item, index) => `${item.tmdbId}-${index}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + SPACING.xl },
        ]}
        renderItem={({ item }) => {
          const isMovie = item.mediaType === 'movie';
          const releaseYear = item.releaseDate ? item.releaseDate.slice(0, 4) : '';

          return (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() =>
                router.push(
                  `/media/${item.tmdbId}?type=${item.mediaType}` as any
                )
              }
              activeOpacity={0.7}
            >
              {item.posterPath ? (
                <Image
                  source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.posterPath}` }}
                  style={styles.itemPoster}
                />
              ) : (
                <View style={[styles.itemPoster, styles.posterPlaceholder]}>
                  {isMovie ? (
                    <Film size={22} color={COLORS.textMuted} />
                  ) : (
                    <Tv size={22} color={COLORS.textMuted} />
                  )}
                </View>
              )}

              <View style={styles.itemInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Badge
                    label={isMovie ? 'Movie' : 'Series'}
                    variant={isMovie ? 'primary' : 'purple'}
                    size="sm"
                  />
                </View>

                {releaseYear ? (
                  <Text style={styles.itemSub}>{releaseYear}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={<List size={48} color={COLORS.textMuted} />}
            title="List is Empty"
            message="No titles have been added to this custom list yet."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  errorTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  errorMessage: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaBanner: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  listBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  listBadgeText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  listDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  countText: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemPoster: {
    width: 48,
    height: 72,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    marginRight: SPACING.md,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  itemSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
