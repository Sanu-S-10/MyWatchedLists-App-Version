import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film,
  Search,
  Star,
  Tv,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { EmptyState } from '../../components/common/EmptyState';
import { tmdbService } from '../../services/tmdbService';
import { TMDBMediaItem } from '../../types/media';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';
import { useTheme } from '../../context/ThemeContext';
import { FilmLoading } from '../../components/common/FilmLoading';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.md * 2 - SPACING.sm * 2) / 3;

type SearchFilterType = 'all' | 'movie' | 'tv' | 'person';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [query, setQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<SearchFilterType>('all');
  const [searchResults, setSearchResults] = useState<TMDBMediaItem[]>([]);
  const [personResults, setPersonResults] = useState<any[]>([]);

  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Double click navbar icon listener: reset search and filter to default
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVBAR_DOUBLE_TAP', (event) => {
      if (event?.tab === 'discover') {
        setQuery('');
        setFilterType('all');
        setSearchResults([]);
        setPersonResults([]);
        setIsSearching(false);
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  // Debounced Search (handles movie/tv and person)
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setPersonResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (filterType === 'person') {
          const results = await tmdbService.searchPerson(query.trim());
          setPersonResults(results);
        } else {
          const [mediaResults, peopleResults] = await Promise.all([
            tmdbService.searchMulti(query.trim()),
            filterType === 'all' ? tmdbService.searchPerson(query.trim()) : Promise.resolve([]),
          ]);
          setSearchResults(mediaResults);
          setPersonResults(peopleResults.slice(0, 4));
        }
      } catch (e) {
        console.warn('Search error', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, filterType]);

  // Filter media search results
  const filteredMediaResults = searchResults.filter((item) => {
    if (filterType === 'all') return true;
    return item.media_type === filterType;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top Header: Title */}
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Search</Text>
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={
            filterType === 'person'
              ? 'Search actors, directors, writers...'
              : 'Search movies, TV shows...'
          }
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills: All | Movies | TV Shows | People */}
      <View style={styles.filterPillsRow}>
        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            filterType === 'all' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setFilterType('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              filterType === 'all' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            filterType === 'movie' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setFilterType('movie')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              filterType === 'movie' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            Movies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            filterType === 'tv' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setFilterType('tv')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              filterType === 'tv' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            TV Shows
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            { backgroundColor: colors.card, borderColor: colors.border },
            filterType === 'person' && [
              styles.pillActive,
              { backgroundColor: colors.primary, borderColor: colors.primary },
            ],
          ]}
          onPress={() => setFilterType('person')}
          activeOpacity={0.7}
        >
          <Users
            size={14}
            color={filterType === 'person' ? colors.primaryContrast : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.pillText,
              { color: colors.textSecondary },
              filterType === 'person' && [
                styles.pillTextActive,
                { color: colors.primaryContrast },
              ],
            ]}
          >
            People
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content: Either Search Results or Discovery Rows */}
      {isSearching ? (
        <View style={styles.centered}>
          <FilmLoading
            size="md"
            message={filterType === 'person' ? 'Searching people...' : 'Searching movies & series...'}
          />
        </View>
      ) : query.trim().length > 0 ? (
        /* ======================================================== */
        /* SEARCH RESULTS VIEW                                     */
        /* ======================================================== */
        filterType === 'person' ? (
          /* Person Search Results List */
          <FlatList
            key="discover-person-list"
            data={personResults}
            keyExtractor={(item) => `person-${item.id}`}
            contentContainerStyle={[
              styles.personListContent,
              { paddingBottom: insets.bottom + 104 },
            ]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const knownWorks = (item.known_for || [])
                .map((k: any) => k.title || k.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(', ');

              return (
                <TouchableOpacity
                  style={styles.personCard}
                  onPress={() => router.push(`/person/${item.id}` as any)}
                  activeOpacity={0.7}
                >
                  {item.profile_path ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.profile_path}` }}
                      style={styles.personAvatar}
                    />
                  ) : (
                    <View style={[styles.personAvatar, styles.avatarPlaceholder]}>
                      <User size={24} color="#64748B" />
                    </View>
                  )}

                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personDepartment}>
                      {item.known_for_department || 'Artist'}
                    </Text>
                    {knownWorks ? (
                      <Text style={styles.personKnownWorks} numberOfLines={1}>
                        Known for: {knownWorks}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon={<User size={48} color={COLORS.textMuted} />}
                title="No People Found"
                message={`No actors or directors found matching "${query}".`}
              />
            }
          />
        ) : (
          /* Media Grid Results */
          <FlatList
            key="discover-media-grid"
            data={filteredMediaResults}
            keyExtractor={(item) => `${item.media_type}-${item.id}`}
            numColumns={3}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: insets.bottom + 104 },
            ]}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const title = item.title || item.name;
              const year = (item.release_date || item.first_air_date || '').slice(0, 4);

              return (
                <TouchableOpacity
                  style={styles.gridCard}
                  onPress={() =>
                    router.push(
                      `/media/${item.id}?type=${item.media_type || (title ? 'movie' : 'tv')}` as any
                    )
                  }
                  activeOpacity={0.8}
                >
                  {item.poster_path ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                      style={styles.gridPoster}
                    />
                  ) : (
                    <View style={[styles.gridPoster, styles.posterPlaceholder]}>
                      {item.media_type === 'movie' ? (
                        <Film size={28} color={COLORS.textMuted} />
                      ) : (
                        <Tv size={28} color={COLORS.textMuted} />
                      )}
                    </View>
                  )}

                  <Text style={styles.gridTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <View style={styles.gridMetaRow}>
                    <Text style={styles.gridYear}>{year || '—'}</Text>
                    {item.vote_average ? (
                      <View style={styles.starRow}>
                        <Star size={10} color={COLORS.star} fill={COLORS.star} />
                        <Text style={styles.ratingText}>
                          {item.vote_average.toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <EmptyState
                icon={<Film size={48} color={COLORS.textMuted} />}
                title="No Results Found"
                message={`We couldn't find any titles matching "${query}".`}
              />
            }
          />
        )
      ) : (
        /* ======================================================== */
        /* EMPTY SEARCH PROMPT BOX (Matching User Mockup)           */
        /* ======================================================== */
        <View style={styles.emptyPromptWrapper}>
          <View
            style={[
              styles.promptCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.promptEmoji}>🍿</Text>
            <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
              What will you watch next?
            </Text>
            <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
              Use the search bar above to find your favorite media and track your progress.
            </Text>
          </View>
        </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  searchingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  gridContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
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

  /* Person Results */
  personListContent: {
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  personAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#161B24',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
    marginLeft: 14,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  personDepartment: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  personKnownWorks: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 3,
  },

  /* Clean Empty Search Prompt Box */
  emptyPromptWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 80,
  },
  promptCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.2,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  promptEmoji: {
    fontSize: 54,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  promptSub: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
});
