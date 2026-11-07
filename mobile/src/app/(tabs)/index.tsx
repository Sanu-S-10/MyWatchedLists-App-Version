import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  Edit2,
  ExternalLink,
  Film,
  Heart,
  Search,
  Star,
  Trash2,
  Tv,
  User,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { tmdbService } from '../../services/tmdbService';
import { TMDBMediaItem, WatchItem } from '../../types/media';
import {
  TMDB_IMAGE_BASE_BACKDROP,
  TMDB_IMAGE_BASE_W185,
  TMDB_IMAGE_BASE_W500,
} from '../../config/env';
import { EditMediaModal } from '../../components/media/EditMediaModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { FilmLoading } from '../../components/common/FilmLoading';
import { formatReleaseDate } from '../../constants/upcoming';

const { width } = Dimensions.get('window');
const BATMAN_AVATAR = require('../../../assets/images/batman-avatar.jpg');
const HERO_CARD_WIDTH = width - SPACING.md * 2;
const CARD_WIDTH = 115;
const CARD_HEIGHT = 168;

const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Doc',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'Politics',
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { history, fetchHistory, isRefreshing, updateItem, removeItem } = useWatchHistory();
  const { colors } = useTheme();
  const scrollViewRef = useRef<any>(null);

  // Featured Carousel State
  const [featuredList, setFeaturedList] = useState<TMDBMediaItem[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);
  const featuredScrollRef = useRef<any>(null);
  const featuredIndexRef = useRef<number>(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isUserInteracting = useRef<boolean>(false);

  const startProgressAnimation = useCallback(() => {
    progressAnim.stopAnimation();
    if (featuredList.length <= 1 || isUserInteracting.current) return;

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isUserInteracting.current) {
        const nextIdx = (featuredIndexRef.current + 1) % featuredList.length;
        featuredIndexRef.current = nextIdx;
        setFeaturedIndex(nextIdx);
        featuredScrollRef.current?.scrollTo({
          x: nextIdx * HERO_CARD_WIDTH,
          animated: true,
        });
      }
    });
  }, [featuredList.length, progressAnim]);

  useEffect(() => {
    startProgressAnimation();
    return () => {
      progressAnim.stopAnimation();
    };
  }, [featuredIndex, startProgressAnimation]);

  // Trending Today Collections
  const [trendingMovies, setTrendingMovies] = useState<TMDBMediaItem[]>([]);
  const [trendingShows, setTrendingShows] = useState<TMDBMediaItem[]>([]);
  const [upcomingList, setUpcomingList] = useState<TMDBMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(true);

  // Quick Action Sheet / Edit / Delete States
  const [actionItem, setActionItem] = useState<WatchItem | null>(null);
  const [editingItem, setEditingItem] = useState<WatchItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMedia = async () => {
    try {
      setLoadingMedia(true);
      const [trendAllRes, trendMovRes, trendTvRes, upcomingRes] = await Promise.allSettled([
        tmdbService.getTrending('all', 'day'),
        tmdbService.getTrending('movie', 'day'),
        tmdbService.getTrending('tv', 'day'),
        tmdbService.getUpcomingCombined(20),
      ]);

      if (trendAllRes.status === 'fulfilled' && trendAllRes.value?.length) {
        setFeaturedList(trendAllRes.value.slice(0, 5));
      }
      if (trendMovRes.status === 'fulfilled' && trendMovRes.value?.length) {
        setTrendingMovies(trendMovRes.value.slice(0, 18));
      }
      if (trendTvRes.status === 'fulfilled' && trendTvRes.value?.length) {
        setTrendingShows(trendTvRes.value.slice(0, 18));
      }
      if (upcomingRes.status === 'fulfilled' && upcomingRes.value?.length) {
        setUpcomingList(upcomingRes.value);
      }
    } catch {
      // Gracefully silent on transient network fluctuation
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);


  const handleRefresh = async () => {
    await Promise.all([fetchHistory(true), loadMedia()]);
  };

  // Double click navbar icon listener: refresh page and reset to default
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVBAR_DOUBLE_TAP', (event) => {
      if (event?.tab === 'index') {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setActionItem(null);
        setEditingItem(null);
        setItemToDelete(null);
        handleRefresh();
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getGreetingTagline = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Start your day with something great to watch';
    if (hour < 18) return 'Ready for an afternoon movie or series?';
    return "Ready for tonight's movie or show?";
  };

  const getFeaturedMeta = (item: TMDBMediaItem) => {
    const year = (item.release_date || item.first_air_date || '').substring(0, 4) || '2024';
    const genre =
      item.genre_ids && item.genre_ids.length > 0 && GENRE_MAP[item.genre_ids[0]]
        ? GENRE_MAP[item.genre_ids[0]]
        : item.media_type === 'movie'
        ? 'Movie'
        : 'TV Series';
    const rating = item.vote_average ? `${item.vote_average.toFixed(1)} ★` : 'Trending';
    return `${year} • ${genre} • ${rating}`;
  };

  const recentlyWatched = useMemo(() => {
    const list = [...history];
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      const wA = a.watchDate ? new Date(a.watchDate).getTime() : (a.lastWatchedDate ? new Date(a.lastWatchedDate).getTime() : 0);
      const wB = b.watchDate ? new Date(b.watchDate).getTime() : (b.lastWatchedDate ? new Date(b.lastWatchedDate).getTime() : 0);
      if (wA !== wB) return wB - wA;
      if (a._id && b._id) return b._id.localeCompare(a._id);
      return 0;
    });
    return list.slice(0, 20);
  }, [history]);
  const username = user?.username || 'Alex';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 104 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Header: Greeting + Avatar */}
        <View style={styles.topHeader}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingSub}>{getGreeting()}</Text>
            <Text style={[styles.greetingName, { color: colors.textPrimary }]}>
              {username} <Text style={styles.waveEmoji}>👋</Text>
            </Text>
            <Text style={[styles.greetingTagline, { color: colors.textSecondary }]}>
              {getGreetingTagline()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Image
                source={BATMAN_AVATAR}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar Pill */}
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/discover')}
          activeOpacity={0.8}
        >
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
            Search movies, TV shows, actors...
          </Text>
        </TouchableOpacity>

        {/* ======================================================= */}
        {/* HERO BANNER: "NOW FEATURED" CAROUSEL CARD              */}
        {/* ======================================================= */}
        {featuredList.length > 0 ? (
          <View style={styles.heroSection}>
            <ScrollView
              ref={featuredScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={() => {
                isUserInteracting.current = true;
                progressAnim.stopAnimation();
              }}
              onScrollEndDrag={(e) => {
                if (!e.nativeEvent.velocity || e.nativeEvent.velocity.x === 0) {
                  const newIdx = Math.round(e.nativeEvent.contentOffset.x / HERO_CARD_WIDTH);
                  const clamped = Math.max(0, Math.min(newIdx, featuredList.length - 1));
                  isUserInteracting.current = false;
                  featuredIndexRef.current = clamped;
                  setFeaturedIndex(clamped);
                  startProgressAnimation();
                }
              }}
              onMomentumScrollEnd={(e) => {
                const newIdx = Math.round(e.nativeEvent.contentOffset.x / HERO_CARD_WIDTH);
                const clamped = Math.max(0, Math.min(newIdx, featuredList.length - 1));
                isUserInteracting.current = false;
                featuredIndexRef.current = clamped;
                setFeaturedIndex(clamped);
                startProgressAnimation();
              }}
              style={styles.heroScrollView}
            >
              {featuredList.map((item) => {
                const backdropUrl = item.backdrop_path
                  ? `${TMDB_IMAGE_BASE_BACKDROP}${item.backdrop_path}`
                  : item.poster_path
                  ? `${TMDB_IMAGE_BASE_W500}${item.poster_path}`
                  : null;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.92}
                    onPress={() =>
                      router.push(`/media/${item.id}?type=${item.media_type || 'movie'}` as any)
                    }
                    style={[
                      styles.heroCard,
                      {
                        width: HERO_CARD_WIDTH,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {backdropUrl && (
                      <Image
                        source={{ uri: backdropUrl }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    )}

                    <LinearGradient
                      colors={[
                        'rgba(0,0,0,0.15)',
                        'rgba(0,0,0,0.6)',
                        colors.background || '#060A0E',
                      ]}
                      style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.heroContent}>
                      <Text style={styles.featuredBadge}>NOW FEATURED</Text>
                      <Text style={styles.heroTitle} numberOfLines={1}>
                        {item.title || item.name}
                      </Text>
                      <Text style={styles.heroMeta}>{getFeaturedMeta(item)}</Text>
                      <Text style={styles.heroOverview} numberOfLines={2}>
                        {item.overview ||
                          'Paul Atreides unites with allies while seeking revenge against enemies.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Pagination Dots with animated loading progress (small to big) */}
            {featuredList.length > 1 && (
              <View style={styles.paginationDotsRow}>
                {featuredList.map((_, i) => {
                  const isActive = i === featuredIndex;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (i === featuredIndexRef.current) return;
                        progressAnim.stopAnimation();
                        featuredIndexRef.current = i;
                        setFeaturedIndex(i);
                        featuredScrollRef.current?.scrollTo({
                          x: i * HERO_CARD_WIDTH,
                          animated: true,
                        });
                        startProgressAnimation();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      {isActive ? (
                        <Animated.View
                          style={[
                            styles.paginationDot,
                            {
                              width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [6, 22],
                              }),
                              backgroundColor: colors.primary || '#EF4444',
                            },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.paginationDot,
                            styles.paginationDotInactive,
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : loadingMedia ? (
          <View style={[styles.heroSection, { height: 180, justifyContent: 'center', alignItems: 'center' }]}>
            <FilmLoading size="md" message="Rolling cinema features..." />
          </View>
        ) : null}

        {/* ======================================================= */}
        {/* SECTION 1: RECENTLY WATCHED                            */}
        {/* ======================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recently Watched
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/category/all_watched' as any)}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>View All</Text>
              <ChevronRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {recentlyWatched.length > 0 ? (
              recentlyWatched.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.mediaCard}
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
                      style={[styles.mediaPoster, { borderColor: colors.border }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.mediaPoster,
                        styles.posterPlaceholder,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Film size={26} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={[styles.mediaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.mediaYear, { color: colors.textMuted }]}>
                    {item.releaseDate ? item.releaseDate.substring(0, 4) : 'Watched'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View
                style={[
                  styles.emptyPromptCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.emptyPromptTitle, { color: colors.textPrimary }]}>
                  No Watched Titles Yet
                </Text>
                <Text style={[styles.emptyPromptSubtitle, { color: colors.textMuted }]}>
                  Explore trending movies & TV shows below and mark your first watch!
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ======================================================= */}
        {/* SECTION 2: TRENDING TODAY MOVIES                       */}
        {/* ======================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Trending Movies Today
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discover' as any)}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>View All</Text>
              <ChevronRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {trendingMovies.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaCard}
                onPress={() => router.push(`/media/${item.id}?type=movie` as any)}
                activeOpacity={0.8}
              >
                {item.poster_path ? (
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                    style={[styles.mediaPoster, { borderColor: colors.border }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.mediaPoster,
                      styles.posterPlaceholder,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Film size={26} color={colors.textMuted} />
                  </View>
                )}
                <Text style={[styles.mediaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.mediaYear, { color: colors.textMuted }]}>
                  {item.release_date ? item.release_date.substring(0, 4) : '2024'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ======================================================= */}
        {/* SECTION 3: TRENDING SHOWS TODAY                        */}
        {/* ======================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Trending Shows Today
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/discover' as any)}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>View All</Text>
              <ChevronRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {trendingShows.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaCard}
                onPress={() => router.push(`/media/${item.id}?type=tv` as any)}
                activeOpacity={0.8}
              >
                {item.poster_path ? (
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                    style={[styles.mediaPoster, { borderColor: colors.border }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.mediaPoster,
                      styles.posterPlaceholder,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Tv size={26} color={colors.textMuted} />
                  </View>
                )}
                <Text style={[styles.mediaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name || item.title}
                </Text>
                <Text style={[styles.mediaYear, { color: colors.textMuted }]}>
                  {item.first_air_date ? item.first_air_date.substring(0, 4) : '2024'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ======================================================= */}
        {/* SECTION 4: UPCOMING MOVIES & SERIES                    */}
        {/* ======================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Upcoming Movies & Series
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/upcoming' as any)}
              activeOpacity={0.7}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>View All</Text>
              <ChevronRight size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {upcomingList.length > 0 ? (
              upcomingList.map((item) => {
                const dateStr = formatReleaseDate(item.release_date || item.first_air_date);
                const isMovie = item.media_type === 'movie';

                return (
                  <TouchableOpacity
                    key={`upcoming-${item.id}-${item.media_type}`}
                    style={styles.mediaCard}
                    onPress={() =>
                      router.push(
                        `/media/${item.id}?type=${item.media_type || 'movie'}` as any
                      )
                    }
                    activeOpacity={0.8}
                  >
                    {item.poster_path ? (
                      <Image
                        source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                        style={[styles.mediaPoster, { borderColor: colors.border }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.mediaPoster,
                          styles.posterPlaceholder,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                      >
                        {isMovie ? (
                          <Film size={26} color={colors.textMuted} />
                        ) : (
                          <Tv size={26} color={colors.textMuted} />
                        )}
                      </View>
                    )}

                    {/* Media Type Badge in Corner */}
                    <View
                      style={[
                        styles.upcomingTypeBadge,
                        { backgroundColor: colors.card + 'E6', borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.upcomingTypeBadgeText, { color: colors.textSecondary }]}>
                        {isMovie ? 'Movie' : 'Series'}
                      </Text>
                    </View>

                    <Text style={[styles.mediaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                    {/* Releasing date under name where year is usually shown */}
                    <Text
                      style={[
                        styles.mediaYear,
                        { color: colors.primary, fontWeight: '700', fontSize: 11 },
                      ]}
                      numberOfLines={1}
                    >
                      {dateStr}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : loadingMedia ? (
              <View
                style={[
                  styles.emptyPromptCard,
                  { backgroundColor: colors.card, borderColor: colors.border, height: CARD_HEIGHT },
                ]}
              >
                <FilmLoading size="sm" message="Loading upcoming releases..." />
              </View>
            ) : (
              <View
                style={[
                  styles.emptyPromptCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.emptyPromptTitle, { color: colors.textPrimary }]}>
                  No Upcoming Releases Found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Quick Action Sheet Modal on Long Press */}
      <Modal
        visible={!!actionItem}
        transparent
        animationType="slide"
        onRequestClose={() => setActionItem(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActionItem(null)}
        >
          <View
            style={[
              styles.actionSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {actionItem && (
              <>
                <View style={styles.actionHeader}>
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE_W185}${actionItem.posterPath}` }}
                    style={styles.actionThumb}
                  />
                  <View style={styles.actionTitleCol}>
                    <Text
                      style={[styles.actionTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {actionItem.title}
                    </Text>
                    <Text style={[styles.actionSubText, { color: colors.textMuted }]}>
                      {actionItem.mediaType === 'movie' ? 'Movie' : 'TV Series'} •{' '}
                      {actionItem.releaseDate ? actionItem.releaseDate.substring(0, 4) : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionDivider} />

                {/* View Details */}
                <TouchableOpacity
                  style={styles.actionOptionRow}
                  onPress={() => {
                    const item = actionItem;
                    setActionItem(null);
                    router.push(`/media/${item.tmdbId}?type=${item.mediaType}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={18} color={colors.textPrimary} />
                  <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>
                    View Media Details
                  </Text>
                </TouchableOpacity>

                {/* Toggle Favourite */}
                <TouchableOpacity
                  style={styles.actionOptionRow}
                  onPress={() => handleToggleFavorite(actionItem)}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={18}
                    color={actionItem.isFavorite ? colors.danger : colors.textPrimary}
                    fill={actionItem.isFavorite ? colors.danger : 'transparent'}
                  />
                  <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>
                    {actionItem.isFavorite ? 'Remove from Favourites' : 'Mark as Favourite'}
                  </Text>
                </TouchableOpacity>

                {/* Edit Item */}
                <TouchableOpacity
                  style={styles.actionOptionRow}
                  onPress={() => {
                    const item = actionItem;
                    setActionItem(null);
                    setEditingItem(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit2 size={18} color={colors.textPrimary} />
                  <Text style={[styles.actionOptionText, { color: colors.textPrimary }]}>
                    Edit Rating & Notes
                  </Text>
                </TouchableOpacity>

                {/* Delete Item */}
                <TouchableOpacity
                  style={styles.actionOptionRow}
                  onPress={() => {
                    const item = actionItem;
                    setActionItem(null);
                    setItemToDelete(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={colors.danger} />
                  <Text style={[styles.actionOptionText, { color: colors.danger }]}>
                    Remove from Watched List
                  </Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.cancelActionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => setActionItem(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelActionText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Media Modal */}
      {editingItem && (
        <EditMediaModal
          visible={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        visible={!!itemToDelete}
        title="Remove Item"
        message={`Are you sure you want to remove "${itemToDelete?.title}" from your watched list?`}
        confirmLabel="Remove"
        isDanger
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
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  greetingContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  greetingSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  greetingTagline: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  waveEmoji: {
    fontSize: 20,
  },
  avatarButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E2536',
    borderWidth: 1.5,
    borderColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.lg,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#64748B',
  },

  /* Hero Section */
  heroSection: {
    marginBottom: SPACING.xl,
  },
  heroScrollView: {
    overflow: 'visible',
  },
  heroCard: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  heroContent: {
    padding: SPACING.md + 2,
  },
  featuredBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#FFFFFF',
    opacity: 0.85,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  heroOverview: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    height: 4,
    borderRadius: 2,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#22C55E',
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  /* Collections / Sections */
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  horizontalScrollContent: {
    gap: 12,
    paddingRight: SPACING.md,
  },
  mediaCard: {
    width: CARD_WIDTH,
  },
  mediaPoster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  mediaYear: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },

  /* Empty Prompt */
  emptyPromptCard: {
    width: HERO_CARD_WIDTH,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyPromptSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
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
    width: 48,
    height: 72,
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
  actionOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: SPACING.md,
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelActionBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  upcomingTypeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  upcomingTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
