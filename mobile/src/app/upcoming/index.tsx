import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Film,
  Globe,
  RotateCcw,
  SlidersHorizontal,
  Tv,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { tmdbService } from '../../services/tmdbService';
import { TMDBMediaItem } from '../../types/media';
import { TMDB_IMAGE_BASE_W500 } from '../../config/env';
import { FilmLoading } from '../../components/common/FilmLoading';
import { EmptyState } from '../../components/common/EmptyState';
import {
  GenreOption,
  LanguageOption,
  UPCOMING_GENRES,
  UPCOMING_LANGUAGES,
  formatReleaseDate,
} from '../../constants/upcoming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - CARD_GAP) / 2;
const POSTER_HEIGHT = CARD_WIDTH * 1.5;

type MediaTypeTab = 'movies' | 'series';

export default function UpcomingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Tab: Movies or Series
  const [activeTab, setActiveTab] = useState<MediaTypeTab>('movies');

  // Filter States (preserved across tab switches)
  const [selectedGenre, setSelectedGenre] = useState<GenreOption>(UPCOMING_GENRES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(UPCOMING_LANGUAGES[0]);

  // Filter Modals
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  // Content & Pagination
  const [items, setItems] = useState<TMDBMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch upcoming data based on tab, genre, and language
  const fetchUpcoming = useCallback(
    async (pageToLoad: number, append = false) => {
      try {
        if (!append) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const genreId = selectedGenre.id > 0 ? selectedGenre.id : undefined;
        const language = selectedLanguage.code ? selectedLanguage.code : undefined;

        let res: { results: TMDBMediaItem[]; totalPages: number };

        if (activeTab === 'movies') {
          res = await tmdbService.getUpcomingMovies(pageToLoad, { genreId, language });
        } else {
          res = await tmdbService.getUpcomingSeries(pageToLoad, { genreId, language });
        }

        // Sort chronologically ascending by release date
        const sorted = [...(res.results || [])].sort((a, b) => {
          const dateA = a.release_date || a.first_air_date;
          const dateB = b.release_date || b.first_air_date;
          if (!dateA && !dateB) return 0;
          if (dateA && !dateB) return -1;
          if (!dateA && dateB) return 1;
          return dateA!.localeCompare(dateB!);
        });

        if (append) {
          setItems((prev) => {
            const seen = new Set(prev.map((it) => it.id));
            const newUnique = sorted.filter((it) => !seen.has(it.id));
            return [...prev, ...newUnique];
          });
        } else {
          setItems(sorted);
        }

        setPage(pageToLoad);
        setTotalPages(res.totalPages || 1);
      } catch (err) {
        console.warn('Failed to fetch upcoming titles', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [activeTab, selectedGenre, selectedLanguage]
  );

  // Initial and reactive load on tab / filter change
  useEffect(() => {
    fetchUpcoming(1, false);
  }, [fetchUpcoming]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUpcoming(1, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && page < totalPages) {
      fetchUpcoming(page + 1, true);
    }
  };

  const hasActiveFilters = selectedGenre.id > 0 || selectedLanguage.code.length > 0;

  const handleResetFilters = () => {
    setSelectedGenre(UPCOMING_GENRES[0]);
    setSelectedLanguage(UPCOMING_LANGUAGES[0]);
  };

  // Helper to calculate days until release
  const getDaysUntil = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const now = new Date();
        const diffMs = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          if (diffDays === 1) return 'Tomorrow';
          if (diffDays <= 30) return `In ${diffDays} days`;
          const months = Math.floor(diffDays / 30);
          return `In ~${months} mo`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const renderCard = ({ item }: { item: TMDBMediaItem }) => {
    const rawDate = item.release_date || item.first_air_date;
    const formattedDate = formatReleaseDate(rawDate);
    const daysUntil = getDaysUntil(rawDate);
    const isMovie = activeTab === 'movies';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() =>
          router.push(
            `/media/${item.id}?type=${isMovie ? 'movie' : 'series'}` as any
          )
        }
        activeOpacity={0.8}
      >
        {/* Poster Image */}
        <View style={styles.posterWrapper}>
          {item.poster_path ? (
            <Image
              source={{ uri: `${TMDB_IMAGE_BASE_W500}${item.poster_path}` }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.posterPlaceholder,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {isMovie ? (
                <Film size={32} color={colors.textMuted} />
              ) : (
                <Tv size={32} color={colors.textMuted} />
              )}
            </View>
          )}

          {/* Days until badge */}
          {daysUntil && (
            <View
              style={[
                styles.countdownBadge,
                {
                  backgroundColor: colors.card + 'E6',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.countdownText, { color: colors.primary }]}>
                {daysUntil}
              </Text>
            </View>
          )}
        </View>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title || item.name}
          </Text>

          {/* Releasing date under name where year is usually shown */}
          <View style={styles.dateRow}>
            <Calendar size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.cardReleaseDate,
                { color: colors.primary, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {formattedDate}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Upcoming Releases
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Chronologically sorted by release date
          </Text>
        </View>

        <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.countBadgeText, { color: colors.primary }]}>
            {items.length}
          </Text>
        </View>
      </View>

      {/* Selectable Movies & Series Pill Buttons */}
      <View style={[styles.pillsContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.pillsSwitchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Movies Pill Button */}
          <TouchableOpacity
            style={[
              styles.pillButton,
              activeTab === 'movies'
                ? [styles.pillButtonActive, { backgroundColor: colors.primary }]
                : null,
            ]}
            onPress={() => setActiveTab('movies')}
            activeOpacity={0.8}
          >
            <Film
              size={16}
              color={activeTab === 'movies' ? colors.primaryContrast : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.pillButtonText,
                {
                  color:
                    activeTab === 'movies' ? colors.primaryContrast : colors.textSecondary,
                  fontWeight: activeTab === 'movies' ? '700' : '500',
                },
              ]}
            >
              Movies
            </Text>
          </TouchableOpacity>

          {/* Series Pill Button */}
          <TouchableOpacity
            style={[
              styles.pillButton,
              activeTab === 'series'
                ? [styles.pillButtonActive, { backgroundColor: colors.primary }]
                : null,
            ]}
            onPress={() => setActiveTab('series')}
            activeOpacity={0.8}
          >
            <Tv
              size={16}
              color={activeTab === 'series' ? colors.primaryContrast : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.pillButtonText,
                {
                  color:
                    activeTab === 'series' ? colors.primaryContrast : colors.textSecondary,
                  fontWeight: activeTab === 'series' ? '700' : '500',
                },
              ]}
            >
              Series
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Row: Genre & Language */}
      <View style={[styles.filtersRow, { borderBottomColor: colors.border }]}>
        {/* Genre Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            {
              backgroundColor:
                selectedGenre.id > 0 ? colors.primary + '1F' : colors.card,
              borderColor:
                selectedGenre.id > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setIsGenreModalOpen(true)}
          activeOpacity={0.75}
        >
          <SlidersHorizontal
            size={13}
            color={selectedGenre.id > 0 ? colors.primary : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.filterPillText,
              {
                color:
                  selectedGenre.id > 0 ? colors.primary : colors.textSecondary,
                fontWeight: selectedGenre.id > 0 ? '700' : '500',
              },
            ]}
          >
            {selectedGenre.name}
          </Text>
          <ChevronDown
            size={13}
            color={selectedGenre.id > 0 ? colors.primary : colors.textMuted}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* Language Filter Button */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            {
              backgroundColor:
                selectedLanguage.code.length > 0 ? colors.primary + '1F' : colors.card,
              borderColor:
                selectedLanguage.code.length > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setIsLangModalOpen(true)}
          activeOpacity={0.75}
        >
          <Globe
            size={13}
            color={selectedLanguage.code.length > 0 ? colors.primary : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.filterPillText,
              {
                color:
                  selectedLanguage.code.length > 0 ? colors.primary : colors.textSecondary,
                fontWeight: selectedLanguage.code.length > 0 ? '700' : '500',
              },
            ]}
          >
            {selectedLanguage.name}
          </Text>
          <ChevronDown
            size={13}
            color={selectedLanguage.code.length > 0 ? colors.primary : colors.textMuted}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        {/* Clear Filters Reset Button */}
        {hasActiveFilters && (
          <TouchableOpacity
            style={[
              styles.resetFilterBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleResetFilters}
            activeOpacity={0.7}
          >
            <RotateCcw size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.resetFilterText, { color: colors.textSecondary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <FilmLoading
            size="lg"
            message={`Loading upcoming ${activeTab === 'movies' ? 'movies' : 'series'}...`}
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title={`No Upcoming ${activeTab === 'movies' ? 'Movies' : 'Series'}`}
            description="No upcoming releases match your selected genre or language filters."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        </View>
      ) : (
        <FlatList
          key="upcoming-grid-2"
          data={items}
          renderItem={renderCard}
          keyExtractor={(item, idx) => `${activeTab}-${item.id}-${idx}`}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <FilmLoading size="sm" />
              </View>
            ) : undefined
          }
        />
      )}

      {/* Genre Picker Modal */}
      <Modal
        visible={isGenreModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGenreModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsGenreModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Filter by Genre
              </Text>
              <TouchableOpacity
                onPress={() => setIsGenreModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalOptionsScroll} showsVerticalScrollIndicator={false}>
              {UPCOMING_GENRES.map((g) => {
                const isSelected = selectedGenre.id === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.modalOptionRow,
                      {
                        backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      setSelectedGenre(g);
                      setIsGenreModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {g.name}
                    </Text>
                    {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={isLangModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsLangModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Filter by Language
              </Text>
              <TouchableOpacity
                onPress={() => setIsLangModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalOptionsScroll} showsVerticalScrollIndicator={false}>
              {UPCOMING_LANGUAGES.map((l) => {
                const isSelected = selectedLanguage.code === l.code;
                return (
                  <TouchableOpacity
                    key={l.code || 'all'}
                    style={[
                      styles.modalOptionRow,
                      {
                        backgroundColor: isSelected ? colors.primary + '18' : 'transparent',
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      setSelectedLanguage(l);
                      setIsLangModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {l.name}
                    </Text>
                    {isSelected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillsContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  pillsSwitchBox: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    padding: 4,
  },
  pillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  pillButtonActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pillButtonText: {
    fontSize: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  listContent: {
    padding: SPACING.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterWrapper: {
    width: '100%',
    height: POSTER_HEIGHT,
    backgroundColor: '#121212',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  countdownBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardDetails: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardReleaseDate: {
    fontSize: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    maxHeight: '65%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalOptionsScroll: {
    paddingHorizontal: SPACING.md,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
  },
});
