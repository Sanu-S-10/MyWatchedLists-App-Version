import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  Clock,
  Film,
  Heart,
  Layers,
  List,
  Plus,
  Share2,
  Tv,
  Zap,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { CreateListModal } from '../../components/lists/CreateListModal';
import { EmptyState } from '../../components/common/EmptyState';
import { customListService } from '../../services/customListService';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomList } from '../../types/customList';
import { WatchItem, isMediaWatched, isMediaWatchLater } from '../../types/media';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

const { width } = Dimensions.get('window');

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history, stats } = useWatchHistory();
  const { showSuccess, showError } = useToast();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<'hub' | 'custom'>('hub');
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const loadCustomLists = async () => {
    try {
      const data = await customListService.getCustomLists();
      setCustomLists(data);
    } catch (e) {
      console.warn('Could not load custom lists', e);
    }
  };

  useEffect(() => {
    loadCustomLists();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomLists();
    setRefreshing(false);
  };

  // Double click navbar icon listener: refresh page and reset to default
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVBAR_DOUBLE_TAP', (event) => {
      if (event?.tab === 'lists') {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setActiveTab('hub');
        setIsCreateModalOpen(false);
        setEditingList(null);
        handleRefresh();
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  const handleShareList = async (list: CustomList) => {
    try {
      const shareUrl = list.shareId
        ? `https://mywatchedlists.app/shared-list/${list.shareId}`
        : '';
      await Share.share({
        message: shareUrl
          ? `Check out my "${list.name}" list on MyWatchedLists: ${shareUrl}`
          : `Check out my "${list.name}" list on MyWatchedLists!`,
      });
    } catch (e: any) {
      showError('Failed to share list');
    }
  };

  // Accurate Counts for Categories (watched titles only in watched categories)
  const watchedItems = history.filter(isMediaWatched);
  const watchLaterItems = history.filter(isMediaWatchLater);

  const allWatchedCount = watchedItems.length;
  const moviesCount = watchedItems.filter((i) => i.mediaType === 'movie').length;
  const seriesCount = watchedItems.filter((i) => i.mediaType === 'series').length;
  const isAnimeItem = (i: WatchItem) => {
    if (i.subType === 'anime') return true;
    if (i.subType) return false;
    return (
      (i.originCountry === 'JP' || (i as any).original_language === 'ja') &&
      i.genres?.some((g: any) => g.id === 16 || g.name?.toLowerCase() === 'animation')
    );
  };

  const isAnimationItem = (i: WatchItem) => {
    if (i.subType === 'animation') return true;
    if (i.subType) return false;
    return (
      i.originCountry !== 'JP' &&
      (i as any).original_language !== 'ja' &&
      i.genres?.some((g: any) => g.id === 16 || g.name?.toLowerCase() === 'animation')
    );
  };

  const isDocumentaryItem = (i: WatchItem) => {
    if (i.subType === 'documentary') return true;
    if (i.subType) return false;
    return i.genres?.some((g: any) => g.id === 99 || g.name?.toLowerCase() === 'documentary');
  };

  const animeCount = watchedItems.filter(isAnimeItem).length;
  const animationCount = watchedItems.filter(isAnimationItem).length;
  const documentaryCount = watchedItems.filter(isDocumentaryItem).length;
  const favoritesCount = history.filter((i) => i.isFavorite).length || stats.favoriteCount;
  const watchLaterCount = watchLaterItems.length;

  // Category items matching previous presets
  const categoriesList = [
    {
      id: 'favorites',
      name: 'Favourites',
      count: favoritesCount,
      icon: Heart,
      colorBg: 'rgba(239, 68, 68, 0.15)',
      colorIcon: '#EF4444',
      route: '/category/favorites',
    },
    {
      id: 'watch_later',
      name: 'Watch Later',
      count: watchLaterCount,
      icon: Clock,
      colorBg: 'rgba(16, 185, 129, 0.15)',
      colorIcon: '#10B981',
      route: '/category/watch_later',
    },
    {
      id: 'all_watched',
      name: 'All Watched',
      count: allWatchedCount,
      icon: CheckCircle,
      colorBg: 'rgba(34, 197, 94, 0.15)',
      colorIcon: '#22C55E',
      route: '/category/all_watched',
    },
    {
      id: 'my_movies',
      name: 'My Movies',
      count: moviesCount,
      icon: Film,
      colorBg: 'rgba(59, 130, 246, 0.15)',
      colorIcon: '#3B82F6',
      route: '/category/my_movies',
    },
    {
      id: 'my_series',
      name: 'My Series',
      count: seriesCount,
      icon: Tv,
      colorBg: 'rgba(139, 92, 246, 0.15)',
      colorIcon: '#8B5CF6',
      route: '/category/my_series',
    },
    {
      id: 'my_anime',
      name: 'My Anime',
      count: animeCount,
      icon: Zap,
      colorBg: 'rgba(245, 158, 11, 0.15)',
      colorIcon: '#F59E0B',
      route: '/category/my_anime',
    },
    {
      id: 'my_animation',
      name: 'My Animation',
      count: animationCount,
      icon: Clapperboard,
      colorBg: 'rgba(6, 182, 212, 0.15)',
      colorIcon: '#06B6D4',
      route: '/category/my_animation',
    },
    {
      id: 'my_documentary',
      name: 'My Documentary',
      count: documentaryCount,
      icon: BookOpen,
      colorBg: 'rgba(249, 115, 22, 0.15)',
      colorIcon: '#F97316',
      route: '/category/my_documentary',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {activeTab === 'hub' ? 'Categories' : 'My Lists'}
        </Text>
        <TouchableOpacity
          style={[styles.plusButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setIsCreateModalOpen(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.primaryLight || colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Pill Toggle: Categories | My Lists (Shared removed) */}
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'hub' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('hub')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              activeTab === 'hub' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'custom' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab('custom')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              activeTab === 'custom' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            My Lists
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Content */}
      {activeTab === 'hub' ? (
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 104 },
          ]}
        >
          {categoriesList.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(cat.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: cat.colorBg }]}>
                  <IconComponent size={20} color={cat.colorIcon} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{cat.name}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{cat.count} items</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted || COLORS.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={customLists}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 104 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const firstPoster = item.items?.[0]?.posterPath;
            return (
              <TouchableOpacity
                style={styles.customListCard}
                onPress={() => {
                  if (item.shareId) {
                    router.push(`/shared-list/${item.shareId}` as any);
                  } else {
                    setEditingList(item);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.customListThumb}>
                  {firstPoster ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${firstPoster}` }}
                      style={styles.thumbImg}
                    />
                  ) : (
                    <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                      <Film size={20} color={COLORS.textMuted} />
                    </View>
                  )}
                </View>

                <View style={styles.customListInfo}>
                  <Text style={styles.customListName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.customListCount}>
                    {item.items?.length || 0} items
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleShareList(item)}
                    style={styles.cardActionBtn}
                  >
                    <Share2 size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <ChevronRight size={18} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<List size={48} color={COLORS.textMuted} />}
              title="No Custom Lists Yet"
              message="Create curated collections of your favorite movies and series."
              actionLabel="Create First List"
              onAction={() => setIsCreateModalOpen(true)}
            />
          }
          ListFooterComponent={
            customLists.length > 0 ? (
              <TouchableOpacity
                style={styles.createListFooterBtn}
                onPress={() => {
                  setEditingList(null);
                  setIsCreateModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.createListFooterText}>Create New List</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}

      {/* Down-side Floating Plus Button for creating a custom list */}
      {activeTab === 'custom' && (
        <TouchableOpacity
          style={[
            styles.floatingAddBtn,
            {
              bottom: insets.bottom + 88,
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
          onPress={() => {
            setEditingList(null);
            setIsCreateModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Plus size={26} color={colors.primaryContrast} strokeWidth={2.8} />
        </TouchableOpacity>
      )}

      {/* Create / Edit List Modal */}
      {(isCreateModalOpen || editingList) && (
        <CreateListModal
          visible={isCreateModalOpen || !!editingList}
          listToEdit={editingList}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingList(null);
          }}
          onSaved={() => {
            setIsCreateModalOpen(false);
            setEditingList(null);
            loadCustomLists();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2536',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm + 2,
  },

  /* Category Card matching previous design */
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* Custom List Card */
  customListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  customListThumb: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#161B24',
    marginRight: SPACING.md,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  customListInfo: {
    flex: 1,
  },
  customListName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customListCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardActionBtn: {
    padding: 8,
  },
  createListFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    marginTop: SPACING.md,
    gap: 8,
  },
  createListFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
