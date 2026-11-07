import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
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
  Edit2,
  ExternalLink,
  Film,
  Heart,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Tv,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { AddMediaModal } from '../../components/media/AddMediaModal';
import { EditMediaModal } from '../../components/media/EditMediaModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  DEFAULT_FILTERS,
  FilterModal,
  MediaFilters,
} from '../../components/media/FilterModal';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { TMDBMediaItem, WatchItem } from '../../types/media';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.md * 2 - SPACING.sm * 2) / 3;

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; filter?: string; subType?: string }>();
  const { showSuccess, showError } = useToast();
  const { history, fetchHistory, isRefreshing, updateItem, removeItem } = useWatchHistory();
  const { colors } = useTheme();

  const flatListRef = useRef<FlatList>(null);

  // Top Segmented Toggle: Movies vs TV Shows
  const [mediaType, setMediaType] = useState<'movie' | 'series'>(
    params.type === 'series' ? 'series' : 'movie'
  );

  // Sync params when navigating
  useEffect(() => {
    if (params.type === 'series') setMediaType('series');
    else if (params.type === 'movie') setMediaType('movie');
  }, [params.type]);

  // Search keyword in title
  const [searchQuery, setSearchQuery] = useState('');

  // Rich Modal Filters (Genre, Min Rating, Year, Country, Sort By)
  const [filters, setFilters] = useState<MediaFilters>(DEFAULT_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Quick Add Item Modal
  const [selectedAddItem, setSelectedAddItem] = useState<TMDBMediaItem | null>(null);

  // Quick Action Sheet / Edit / Delete States
  const [actionItem, setActionItem] = useState<WatchItem | null>(null);
  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      showSuccess('Removed from library');
      setItemToDelete(null);
    } else {
      showError('Failed to remove item');
    }
  };

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) count += filters.genres.length;
    if (filters.minRating > 0) count += 1;
    if (filters.year.trim().length > 0) count += 1;
    if (filters.country.length > 0) count += 1;
    if (filters.sortBy !== 'createdAtDesc') count += 1;
    return count;
  }, [filters]);

  // Items for the current media type (or subType when specified)
  const currentTypeItems = useMemo(() => {
    if (params.subType) {
      const st = params.subType.toLowerCase();
      return history.filter(
        (item) => item.subType === st || item.genres?.some((g) => g.name.toLowerCase() === st)
      );
    }
    return history.filter((item) => item.mediaType === mediaType);
  }, [history, mediaType, params.subType]);

  // Filtered & Sorted items
  const displayedItems = useMemo(() => {
    let list = [...currentTypeItems];

    // 1. Title search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => i.title && i.title.toLowerCase().includes(q));
    }

    // 2. Rich Genre Filter (must contain all selected genres)
    if (filters.genres.length > 0) {
      list = list.filter((item) =>
        filters.genres.every((genre) =>
          item.genres?.some((g) => g.name.toLowerCase() === genre.toLowerCase())
        )
      );
    }

    // 3. Min Rating Filter
    if (filters.minRating > 0) {
      list = list.filter((item) => item.rating >= filters.minRating);
    }

    // 4. Release Year Filter
    if (filters.year.trim()) {
      list = list.filter((item) => {
        const itemYear = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
        return itemYear === filters.year.trim();
      });
    }

    // 5. Country Filter
    if (filters.country) {
      list = list.filter((item) => item.originCountry === filters.country);
    }

    // 6. Sort By
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
  }, [currentTypeItems, searchQuery, filters]);

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


  // Double click navbar icon listener: refresh page and reset to default
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVBAR_DOUBLE_TAP', (event) => {
      if (event?.tab === 'library') {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setMediaType('movie');
        handleClearAllFilters();
        setIsFilterModalOpen(false);
        setActionItem(null);
        fetchHistory();
      }
    });
    return () => {
      sub.remove();
    };
  }, [fetchHistory]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>My Library</Text>
        <TouchableOpacity
          style={[styles.plusButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/discover')}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.primaryLight || colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Main Segmented Toggle: Movies | TV Shows */}
      <View style={[styles.segmentedContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            mediaType === 'movie' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setMediaType('movie')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: colors.textSecondary },
              mediaType === 'movie' && [styles.segmentTextActive, { color: colors.primaryContrast }],
            ]}
          >
            Movies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            mediaType === 'series' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setMediaType('series')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              { color: colors.textSecondary },
              mediaType === 'series' && [styles.segmentTextActive, { color: colors.primaryContrast }],
            ]}
          >
            TV Shows
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'shows'} in library...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterTriggerButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            activeFilterCount > 0 && [styles.filterTriggerButtonActive, { backgroundColor: colors.primary }],
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal
            size={18}
            color={activeFilterCount > 0 ? colors.primaryContrast : colors.textPrimary}
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
          Total: <Text style={styles.countNumber}>{displayedItems.length}</Text>{' '}
          {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
        </Text>
        {activeFilterCount > 0 && (
          <Text style={styles.filteredNotice}>
            Filtered from {currentTypeItems.length}
          </Text>
        )}
      </View>

      {/* Active Filter Tags Row (Matching Website's Selected Filters Bar) */}
      {(activeFilterCount > 0 || searchQuery.length > 0) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeTagsScroll}
          >
            {/* Search Query Tag */}
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

            {/* Genre Tags */}
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

            {/* Rating Tag */}
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

            {/* Release Year Tag */}
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

            {/* Country Tag */}
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

            {/* Sort Tag */}
            {filters.sortBy !== 'createdAtDesc' && (
              <TouchableOpacity
                style={styles.activeTag}
                onPress={() => removeFilterTag('sort')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTagText}>
                  Sort:{' '}
                  {filters.sortBy === 'ratingDesc'
                    ? 'Rating'
                    : filters.sortBy === 'yearDesc'
                    ? 'Year'
                    : 'A-Z'}
                </Text>
                <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {/* Clear All Button */}
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

      {/* 3-Column Poster Grid */}
      <FlatList
        ref={flatListRef}
        data={displayedItems}
        keyExtractor={(item) => item._id}
        numColumns={3}
        contentContainerStyle={[
          styles.gridContent,
          { paddingBottom: insets.bottom + 104 },
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
            icon={<Film size={48} color={COLORS.textMuted} />}
            title="No Titles Found"
            message={
              activeFilterCount > 0 || searchQuery.length > 0
                ? 'No media matches your selected filters. Try clearing some filters.'
                : `You have no ${mediaType === 'movie' ? 'movies' : 'TV shows'} in this category.`
            }
            actionLabel={
              activeFilterCount > 0 || searchQuery.length > 0
                ? 'Reset Filters'
                : 'Discover Titles'
            }
            onAction={() =>
              activeFilterCount > 0 || searchQuery.length > 0
                ? handleClearAllFilters()
                : router.push('/(tabs)/discover')
            }
          />
        }
      />

      {/* Filter & Sort Bottom Sheet Modal */}
      <FilterModal
        visible={isFilterModalOpen}
        filters={filters}
        items={currentTypeItems}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Quick Add Modal */}
      {selectedAddItem && (
        <AddMediaModal
          visible={!!selectedAddItem}
          item={selectedAddItem}
          onClose={() => setSelectedAddItem(null)}
          onAdded={() => {
            setSelectedAddItem(null);
            fetchHistory();
          }}
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
                      Remove from Library
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
            setEditingItem(null);
            fetchHistory();
          }}
          onDeleted={() => {
            setEditingItem(null);
            fetchHistory();
          }}
        />
      )}

      {/* Confirm Remove Modal */}
      <ConfirmModal
        visible={itemToDelete !== null}
        title="Remove from Library?"
        message={`Are you sure you want to remove "${itemToDelete?.title}" from your library? This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#121620',
    borderRadius: RADIUS.full,
    padding: 3,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  countText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  countNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filteredNotice: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  /* Active Filter Tags Bar */
  activeFiltersContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  activeTagsScroll: {
    paddingHorizontal: SPACING.md,
    gap: 6,
    alignItems: 'center',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2536',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },

  /* Poster Grid */
  gridContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  columnWrapper: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  gridCard: {
    width: COLUMN_WIDTH,
  },
  gridPoster: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: '#121620',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 5,
  },
  gridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  gridYear: {
    fontSize: 11,
    color: '#94A3B8',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.star,
  },

  /* Action Sheet Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#121620',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionThumb: {
    width: 50,
    height: 75,
    borderRadius: RADIUS.sm,
    backgroundColor: '#161B24',
  },
  actionTitleCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionBtnInfo: {
    flex: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionCancelBtn: {
    marginTop: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: '#1E2536',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },
});
