import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  Clapperboard,
  Clock,
  Edit2,
  ExternalLink,
  Film,
  Grid3x3,
  Heart,
  Layers,
  List as ListIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Tv,
  X,
  Zap,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import {
  DEFAULT_FILTERS,
  FilterModal,
  MediaFilters,
} from '../../components/media/FilterModal';
import { EditMediaModal } from '../../components/media/EditMediaModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import { WatchItem, isMediaWatched, isMediaWatchLater } from '../../types/media';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - SPACING.md * 2 - SPACING.sm * 2) / 3;

interface CategoryMeta {
  title: string;
  icon: any;
  colorBg: string;
  colorIcon: string;
}

const BASE_CATEGORIES: Record<string, CategoryMeta> = {
  watch_later: {
    title: 'Watch Later',
    icon: Clock,
    colorBg: 'rgba(16, 185, 129, 0.15)',
    colorIcon: '#10B981',
  },
  watchlist: {
    title: 'Watch Later',
    icon: Clock,
    colorBg: 'rgba(16, 185, 129, 0.15)',
    colorIcon: '#10B981',
  },
  favorites: {
    title: 'My Favourites',
    icon: Heart,
    colorBg: 'rgba(239, 68, 68, 0.15)',
    colorIcon: '#EF4444',
  },
  all_watched: {
    title: 'All Watched Media',
    icon: CheckCircle,
    colorBg: 'rgba(34, 197, 94, 0.15)',
    colorIcon: '#22C55E',
  },
  my_movies: {
    title: 'My Movies',
    icon: Film,
    colorBg: 'rgba(59, 130, 246, 0.15)',
    colorIcon: '#3B82F6',
  },
  my_series: {
    title: 'My Series',
    icon: Tv,
    colorBg: 'rgba(139, 92, 246, 0.15)',
    colorIcon: '#8B5CF6',
  },
  my_anime: {
    title: 'My Anime',
    icon: Zap,
    colorBg: 'rgba(245, 158, 11, 0.15)',
    colorIcon: '#F59E0B',
  },
  my_animation: {
    title: 'My Animation',
    icon: Clapperboard,
    colorBg: 'rgba(6, 182, 212, 0.15)',
    colorIcon: '#06B6D4',
  },
  my_documentary: {
    title: 'My Documentary',
    icon: BookOpen,
    colorBg: 'rgba(249, 115, 22, 0.15)',
    colorIcon: '#F97316',
  },
};

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  ...BASE_CATEGORIES,
  all: BASE_CATEGORIES.all_watched,
  movies: BASE_CATEGORIES.my_movies,
  series: BASE_CATEGORIES.my_series,
  anime: BASE_CATEGORIES.my_anime,
  animation: BASE_CATEGORIES.my_animation,
  documentary: BASE_CATEGORIES.my_documentary,
  watchlater: BASE_CATEGORIES.watch_later,
};

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const normalizedType = (type || 'all_watched').toLowerCase();

  const { history, fetchHistory, isRefreshing, updateItem, removeItem } = useWatchHistory();
  const { showSuccess, showError } = useToast();

  const categoryMeta = CATEGORY_MAP[normalizedType] || {
    title: 'Collection',
    icon: Layers,
    colorBg: 'rgba(229, 9, 20, 0.15)',
    colorIcon: '#E50914',
  };
  const IconComponent = categoryMeta.icon;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MediaFilters>(DEFAULT_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Action Sheet
  const [actionItem, setActionItem] = useState<WatchItem | null>(null);
  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) count += filters.genres.length;
    if (filters.minRating > 0) count += 1;
    if (filters.year.trim().length > 0) count += 1;
    if (filters.country.length > 0) count += 1;
    if (filters.sortBy !== 'createdAtDesc') count += 1;
    return count;
  }, [filters]);

  // Base Category filtering (matches frontend ContentList.jsx)
  const baseCategoryItems = useMemo(() => {
    let items = [...history];

    switch (normalizedType) {
      case 'watchlist':
      case 'watch_later':
      case 'watchlater':
        return items.filter(isMediaWatchLater);
      case 'favorites':
        return items.filter((i) => i.isFavorite);
      case 'my_movies':
      case 'movies':
        return items.filter((i) => i.mediaType === 'movie' && isMediaWatched(i));
      case 'my_series':
      case 'series':
        return items.filter((i) => i.mediaType === 'series' && isMediaWatched(i));
      case 'my_anime':
      case 'anime':
        return items.filter((i) => {
          if (!isMediaWatched(i)) return false;
          if (i.subType === 'anime') return true;
          if (i.subType) return false;
          return (
            (i.originCountry === 'JP' || (i as any).original_language === 'ja') &&
            i.genres?.some((g) => g.id === 16 || g.name?.toLowerCase() === 'animation')
          );
        });
      case 'my_animation':
      case 'animation':
        return items.filter((i) => {
          if (!isMediaWatched(i)) return false;
          if (i.subType === 'animation') return true;
          if (i.subType) return false;
          return (
            i.originCountry !== 'JP' &&
            (i as any).original_language !== 'ja' &&
            i.genres?.some((g) => g.id === 16 || g.name?.toLowerCase() === 'animation')
          );
        });
      case 'my_documentary':
      case 'documentary':
        return items.filter((i) => {
          if (!isMediaWatched(i)) return false;
          if (i.subType === 'documentary') return true;
          if (i.subType) return false;
          return i.genres?.some((g) => g.id === 99 || g.name?.toLowerCase() === 'documentary');
        });
      case 'all_watched':
      case 'all':
      default:
        return items.filter(isMediaWatched);
    }
  }, [history, normalizedType]);

  // Filtered & Sorted items
  const displayedItems = useMemo(() => {
    let list = [...baseCategoryItems];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => i.title && i.title.toLowerCase().includes(q));
    }

    // Genre filter
    if (filters.genres.length > 0) {
      list = list.filter((item) =>
        filters.genres.every((genre) =>
          item.genres?.some((g) => g.name.toLowerCase() === genre.toLowerCase())
        )
      );
    }

    // Min rating
    if (filters.minRating > 0) {
      list = list.filter((item) => item.rating >= filters.minRating);
    }

    // Release year
    if (filters.year.trim()) {
      list = list.filter((item) => {
        const itemYear = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
        return itemYear === filters.year.trim();
      });
    }

    // Country
    if (filters.country) {
      list = list.filter((item) => item.originCountry === filters.country);
    }

    // Sort By
    list.sort((a, b) => {
      switch (filters.sortBy) {
        case 'ratingDesc':
          return (b.rating || 0) - (a.rating || 0);
        case 'yearDesc':
          const yrA = a.releaseDate ? parseInt(a.releaseDate.substring(0, 4)) : 0;
          const yrB = b.releaseDate ? parseInt(b.releaseDate.substring(0, 4)) : 0;
          return yrB - yrA;
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'createdAtDesc':
        default: {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA && timeB && timeA !== timeB) {
            return timeB - timeA;
          }
          const wA = a.watchDate ? new Date(a.watchDate).getTime() : (a.lastWatchedDate ? new Date(a.lastWatchedDate).getTime() : 0);
          const wB = b.watchDate ? new Date(b.watchDate).getTime() : (b.lastWatchedDate ? new Date(b.lastWatchedDate).getTime() : 0);
          if (wA !== wB) {
            return wB - wA;
          }
          if (a._id && b._id) {
            return b._id.localeCompare(a._id);
          }
          return 0;
        }
      }
    });

    return list;
  }, [baseCategoryItems, searchQuery, filters]);

  // Remove individual active filter tag
  const removeFilterTag = (type: 'genre' | 'rating' | 'year' | 'country' | 'sort', val?: string) => {
    setFilters((prev) => {
      switch (type) {
        case 'genre':
          return { ...prev, genres: prev.genres.filter((g) => g !== val) };
        case 'rating':
          return { ...prev, minRating: 0 };
        case 'year':
          return { ...prev, year: '' };
        case 'country':
          return { ...prev, country: '' };
        case 'sort':
          return { ...prev, sortBy: 'createdAtDesc' };
        default:
          return prev;
      }
    });
  };

  const handleClearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  // Quick Action: Toggle Favourite
  const handleToggleFavorite = async (item: WatchItem) => {
    setActionItem(null);
    const newFav = !item.isFavorite;
    const res = await updateItem(item._id, { isFavorite: newFav });
    if (res.success) {
      showSuccess(newFav ? 'Marked as Favourite ❤️' : 'Removed from Favourites');
    } else {
      showError('Failed to update favourite');
    }
  };

  // Quick Action: Delete Item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const res = await removeItem(itemToDelete._id);
    setIsDeleting(false);
    if (res.success) {
      showSuccess('Removed from watched history');
      setItemToDelete(null);
    } else {
      showError('Failed to remove item');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header Row: Back button, Title & Total Badge, View Mode Toggle */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.titleIconBadge, { backgroundColor: categoryMeta.colorBg }]}>
              <IconComponent size={16} color={categoryMeta.colorIcon} />
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {categoryMeta.title}
            </Text>
          </View>
        </View>

        {/* View Mode Toggle: Grid | List */}
        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <Grid3x3 size={16} color={viewMode === 'grid' ? '#FFFFFF' : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <ListIcon size={16} color={viewMode === 'list' ? '#FFFFFF' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar + Filter Trigger */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${categoryMeta.title}...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterTriggerButton,
            activeFilterCount > 0 && styles.filterTriggerButtonActive,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal
            size={18}
            color={activeFilterCount > 0 ? '#FFFFFF' : '#CBD5E1'}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Total Number Count Row */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          Total: <Text style={styles.countNumber}>{displayedItems.length}</Text> items
        </Text>
        {activeFilterCount > 0 && (
          <Text style={styles.filteredNotice}>
            Filtered from {baseCategoryItems.length}
          </Text>
        )}
      </View>

      {/* Active Filter Tags Row */}
      {(activeFilterCount > 0 || searchQuery.length > 0) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeTagsScroll}
          >
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.activeTag}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>"{searchQuery}"</Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {filters.genres.map((g) => (
              <TouchableOpacity
                key={g}
                style={styles.activeTag}
                onPress={() => removeFilterTag('genre', g)}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>{g}</Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}

            {filters.minRating > 0 && (
              <TouchableOpacity
                style={styles.activeTag}
                onPress={() => removeFilterTag('rating')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>⭐ {filters.minRating}+</Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {filters.year.trim().length > 0 && (
              <TouchableOpacity
                style={styles.activeTag}
                onPress={() => removeFilterTag('year')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>Year: {filters.year}</Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {filters.country.length > 0 && (
              <TouchableOpacity
                style={styles.activeTag}
                onPress={() => removeFilterTag('country')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>Country: {filters.country}</Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={handleClearAllFilters}
              activeOpacity={0.7}
            >
              <RotateCcw size={12} color={COLORS.danger} />
              <Text style={styles.clearAllBtnText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Main Content: Grid View or List View */}
      {viewMode === 'grid' ? (
        <FlatList
          key="category-grid-view"
          data={displayedItems}
          keyExtractor={(item) => item._id}
          numColumns={3}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + SPACING.xxl },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchHistory(true)}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const year = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
            return (
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() =>
                  router.push(`/media/${item.tmdbId}?type=${item.mediaType}` as any)
                }
                onLongPress={() => setActionItem(item)}
                delayLongPress={280}
                activeOpacity={0.8}
              >
                {item.posterPath ? (
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.posterPath}` }}
                    style={styles.gridPoster}
                  />
                ) : (
                  <View style={[styles.gridPoster, styles.posterPlaceholder]}>
                    {item.mediaType === 'movie' ? (
                      <Film size={26} color={COLORS.textMuted} />
                    ) : (
                      <Tv size={26} color={COLORS.textMuted} />
                    )}
                  </View>
                )}

                <Text style={styles.gridTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.gridMetaRow}>
                  <Text style={styles.gridYear}>{year || '—'}</Text>
                  {item.rating > 0 ? (
                    <View style={styles.starRow}>
                      <Star size={10} color={COLORS.star} fill={COLORS.star} />
                      <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<IconComponent size={48} color={COLORS.textMuted} />}
              title="No Titles Found"
              message={
                activeFilterCount > 0 || searchQuery.length > 0
                  ? 'No titles match your filter criteria in this category.'
                  : `Your ${categoryMeta.title} collection is currently empty.`
              }
            />
          }
        />
      ) : (
        /* List Mode View (matching website's List View) */
        <FlatList
          key="category-list-view"
          data={displayedItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + SPACING.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchHistory(true)}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => {
            const year = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
            return (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() =>
                  router.push(`/media/${item.tmdbId}?type=${item.mediaType}` as any)
                }
                onLongPress={() => setActionItem(item)}
                delayLongPress={280}
                activeOpacity={0.8}
              >
                {item.posterPath ? (
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.posterPath}` }}
                    style={styles.listPoster}
                  />
                ) : (
                  <View style={[styles.listPoster, styles.posterPlaceholder]}>
                    <Film size={22} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.listItemInfo}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.listMetaRow}>
                    <Text style={styles.listMetaText}>
                      {item.mediaType === 'movie' ? 'Movie' : 'TV Series'} • {year || '—'}
                    </Text>
                    {item.rating > 0 && (
                      <View style={styles.starRow}>
                        <Star size={11} color={COLORS.star} fill={COLORS.star} />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                      </View>
                    )}
                  </View>
                  {item.genres && item.genres.length > 0 && (
                    <Text style={styles.listGenresText} numberOfLines={1}>
                      {item.genres.slice(0, 3).map((g) => g.name).join(' • ')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<IconComponent size={48} color={COLORS.textMuted} />}
              title="No Titles Found"
              message={`Your ${categoryMeta.title} collection is currently empty.`}
            />
          }
        />
      )}

      {/* Long Press Quick Action Sheet / Modal */}
      <Modal
        visible={actionItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionItem(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActionItem(null)}
        >
          <View style={styles.actionSheet}>
            {actionItem && (
              <>
                <View style={styles.actionHeader}>
                  {actionItem.posterPath ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${actionItem.posterPath}` }}
                      style={styles.actionThumb}
                    />
                  ) : (
                    <View style={[styles.actionThumb, styles.posterPlaceholder]}>
                      <Film size={20} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={styles.actionTitleCol}>
                    <Text style={styles.actionTitle} numberOfLines={1}>
                      {actionItem.title}
                    </Text>
                    <Text style={styles.actionSubText}>
                      {actionItem.mediaType === 'movie' ? 'Movie' : 'TV Series'} •{' '}
                      {actionItem.releaseDate ? actionItem.releaseDate.slice(0, 4) : 'Watched'}
                    </Text>
                    {actionItem.rating > 0 && (
                      <View style={[styles.starRow, { marginTop: 4 }]}>
                        <Star size={12} color={COLORS.star} fill={COLORS.star} />
                        <Text style={[styles.ratingText, { fontSize: 13 }]}>
                          {actionItem.rating} / 5
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actionDivider} />

                {/* Action 1: Edit Activity / Rating */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(null);
                    setEditingItem(it);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Edit2 size={18} color="#3B82F6" />
                  </View>
                  <View style={styles.actionBtnInfo}>
                    <Text style={styles.actionBtnText}>Edit Activity & Rating</Text>
                    <Text style={styles.actionBtnSubText}>Change rating, notes, episodes</Text>
                  </View>
                </TouchableOpacity>

                {/* Action 2: Toggle Favourite */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleFavorite(actionItem)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Heart
                      size={18}
                      color={COLORS.danger}
                      fill={actionItem.isFavorite ? COLORS.danger : 'none'}
                    />
                  </View>
                  <View style={styles.actionBtnInfo}>
                    <Text style={styles.actionBtnText}>
                      {actionItem.isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                    </Text>
                    <Text style={styles.actionBtnSubText}>
                      {actionItem.isFavorite ? 'Currently in your favourites' : 'Pin to your favourite list'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Action 3: View Full Details */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(null);
                    router.push(`/media/${it.tmdbId}?type=${it.mediaType}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                    <ExternalLink size={18} color="#94A3B8" />
                  </View>
                  <View style={styles.actionBtnInfo}>
                    <Text style={styles.actionBtnText}>View Full Details</Text>
                    <Text style={styles.actionBtnSubText}>Cast, crew, production & trailer</Text>
                  </View>
                </TouchableOpacity>

                {/* Action 4: Delete */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(null);
                    setItemToDelete(it);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
                    <Trash2 size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.actionBtnInfo}>
                    <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>
                      Remove from Watched
                    </Text>
                    <Text style={styles.actionBtnSubText}>Delete from your watched history</Text>
                  </View>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.actionCancelBtn}
                  onPress={() => setActionItem(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Media Modal */}
      {editingItem && (
        <EditMediaModal
          visible={editingItem !== null}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdated={() => {
            fetchHistory();
            setEditingItem(null);
          }}
          onDeleted={() => {
            fetchHistory();
            setEditingItem(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <ConfirmModal
          visible={itemToDelete !== null}
          title="Remove from Watched List?"
          message={`Are you sure you want to remove "${itemToDelete.title}"? Your rating and notes will be deleted.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          isDanger={true}
          isLoading={isDeleting}
          onConfirm={handleDeleteItem}
          onCancel={() => setItemToDelete(null)}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalOpen}
        filters={filters}
        items={baseCategoryItems}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
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
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161B24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },

  /* Search & Filter Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
    height: '100%',
  },
  filterTriggerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#121620',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  filterTriggerButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },

  /* Total Count Row */
  countRow: {
    paddingHorizontal: SPACING.md,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  countNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filteredNotice: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },

  /* Active Tags Bar */
  activeFiltersContainer: {
    marginTop: 6,
    marginBottom: 4,
  },
  activeTagsScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
    alignItems: 'center',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2536',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
    gap: 4,
  },
  clearAllBtnText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
  },

  /* Grid Layout */
  gridContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  columnWrapper: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
  },
  gridPoster: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH * 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gridYear: {
    fontSize: 11,
    color: '#94A3B8',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.star,
  },

  /* List Layout */
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  listPoster: {
    width: 52,
    height: 76,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  listMetaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  listGenresText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  /* Action Sheet Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#121620',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionThumb: {
    width: 48,
    height: 72,
    borderRadius: RADIUS.sm,
    backgroundColor: '#161B24',
  },
  actionTitleCol: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionBtnInfo: {
    flex: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionCancelBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#161B24',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
  },
});
