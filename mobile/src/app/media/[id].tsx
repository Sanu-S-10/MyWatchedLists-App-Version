import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  ExternalLink,
  Film,
  Heart,
  Info,
  Play,
  Plus,
  Share2,
  Star,
  Tv,
  Users,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { FilmLoading } from '../../components/common/FilmLoading';
import { AddMediaModal } from '../../components/media/AddMediaModal';
import { EditMediaModal } from '../../components/media/EditMediaModal';
import { AddToCustomListModal } from '../../components/lists/AddToCustomListModal';
import {
  TMDB_IMAGE_BASE_BACKDROP,
  TMDB_IMAGE_BASE_W185,
  TMDB_IMAGE_BASE_W500,
} from '../../config/env';
import { tmdbService } from '../../services/tmdbService';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import {
  TMDBCastMember,
  TMDBCrewMember,
  TMDBMediaItem,
  TMDBMovieDetails,
  TMDBSeason,
  TMDBSeriesDetails,
  WatchProvider,
  isMediaWatched,
  isMediaWatchLater,
} from '../../types/media';

const { width } = Dimensions.get('window');

export default function MediaDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const numericId = Number(id);

  const { history, addItem, updateItem, removeItem, getHistoryItemByTmdbId } = useWatchHistory();
  const { showSuccess, showError, showInfo } = useToast();

  const [details, setDetails] = useState<TMDBMovieDetails | TMDBSeriesDetails | null>(null);
  const [cast, setCast] = useState<TMDBCastMember[]>([]);
  const [crew, setCrew] = useState<TMDBCrewMember[]>([]);
  const [recommendations, setRecommendations] = useState<TMDBMediaItem[]>([]);
  const [watchProvider, setWatchProvider] = useState<WatchProvider | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  // TV Series specific state
  const [activeTvTab, setActiveTvTab] = useState<'episodes' | 'about' | 'related'>('episodes');
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [seasonDetails, setSeasonDetails] = useState<TMDBSeason | null>(null);
  const [loadingSeason, setLoadingSeason] = useState<boolean>(false);
  const [isSeasonPickerOpen, setIsSeasonPickerOpen] = useState<boolean>(false);

  // Collapsible sections
  const [isOverviewExpanded, setIsOverviewExpanded] = useState<boolean>(false);
  const [showDirectorProducers, setShowDirectorProducers] = useState<boolean>(false);
  const [showFullCrew, setShowFullCrew] = useState<boolean>(false);
  const [showProduction, setShowProduction] = useState<boolean>(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine media type
  const isMovieType = type === 'movie' || (type !== 'tv' && type !== 'series' && (!type || type === 'movie'));

  // Find if this item is in the user's history
  const historyItem = getHistoryItemByTmdbId(
    numericId,
    isMovieType ? 'movie' : 'series'
  ) || history.find((h) => Number(h.tmdbId) === numericId);

  // Check if saved to Watch Later vs fully Watched
  const isWatchLater = Boolean(historyItem && isMediaWatchLater(historyItem));
  const isWatched = Boolean(historyItem && isMediaWatched(historyItem));

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!numericId || isNaN(numericId)) {
        setErrorMessage('Invalid media identifier');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        let mediaData: TMDBMovieDetails | TMDBSeriesDetails;
        let inferredType: 'movie' | 'tv' = isMovieType ? 'movie' : 'tv';

        if (isMovieType) {
          try {
            mediaData = await tmdbService.getMovieDetails(numericId);
          } catch (e) {
            mediaData = await tmdbService.getSeriesDetails(numericId);
            inferredType = 'tv';
          }
        } else {
          try {
            mediaData = await tmdbService.getSeriesDetails(numericId);
          } catch (e) {
            mediaData = await tmdbService.getMovieDetails(numericId);
            inferredType = 'movie';
          }
        }

        if (!isMounted) return;
        setDetails(mediaData);

        const credits = (mediaData as any).credits;
        if (credits) {
          setCast(credits.cast?.slice(0, 16) || []);
          setCrew(credits.crew || []);
        }

        // Fetch recommendations, watch providers, and trailer video concurrently
        const [recs, provider, trailer] = await Promise.all([
          tmdbService.getRecommendations(inferredType, numericId),
          tmdbService.getWatchProviders(inferredType, numericId),
          tmdbService.getVideos(inferredType, numericId),
        ]);

        if (!isMounted) return;
        setRecommendations(recs);
        setWatchProvider(provider);
        setTrailerUrl(trailer);

        // If TV Series, fetch Season 1 by default
        if (inferredType === 'tv') {
          const seasons = (mediaData as TMDBSeriesDetails).seasons?.filter((s) => s.season_number > 0) || [];
          const initialSeason = seasons.length > 0 ? seasons[0].season_number : 1;
          setSelectedSeasonNumber(initialSeason);
          try {
            const seasonData = await tmdbService.getSeasonDetails(numericId, initialSeason);
            if (isMounted) setSeasonDetails(seasonData);
          } catch (err) {
            console.warn('Could not load season', err);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching media details:', err);
        setErrorMessage('Failed to load media details. Please check your connection.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [numericId, type]);

  // Load season when user changes season
  const handleSeasonChange = async (seasonNumber: number) => {
    setSelectedSeasonNumber(seasonNumber);
    setIsSeasonPickerOpen(false);
    setLoadingSeason(true);

    try {
      const data = await tmdbService.getSeasonDetails(numericId, seasonNumber);
      setSeasonDetails(data);
    } catch (e) {
      showError(`Failed to load Season ${seasonNumber}`);
    } finally {
      setLoadingSeason(false);
    }
  };

  const handlePlayTrailer = () => {
    const titleText = isMovie ? (details as TMDBMovieDetails)?.title : (details as TMDBSeriesDetails)?.name;
    if (trailerUrl) {
      Linking.openURL(trailerUrl);
    } else if (titleText) {
      Linking.openURL(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(`${titleText} official trailer`)}`
      );
    }
  };

  const handleShare = async () => {
    if (!details) return;
    const mediaTitle = isMovie ? (details as TMDBMovieDetails).title : (details as TMDBSeriesDetails).name;
    try {
      await Share.share({
        message: `Check out "${mediaTitle}" on MyWatchedLists!`,
      });
    } catch {
      showInfo(`Sharing ${mediaTitle}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!historyItem) return;
    setIsDeleting(true);
    const result = await removeItem(historyItem._id);
    setIsDeleting(false);
    setIsDeleteModalOpen(false);

    if (result.success) {
      showSuccess('Removed from your watch history');
    } else {
      showError(result.message || 'Failed to remove item');
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async () => {
    if (historyItem) {
      const newStatus = !historyItem.isFavorite;
      const res = await updateItem(historyItem._id, { isFavorite: newStatus });
      if (res.success) {
        showSuccess(newStatus ? 'Added to Favourites ❤️' : 'Removed from Favourites');
      } else {
        showError('Could not update favourite status');
      }
    } else {
      const genresList = details?.genres?.map((g) => ({ id: g.id, name: g.name })) || [];
      let subType: 'anime' | 'animation' | 'documentary' | 'live_action' = 'live_action';
      if (genresList.some((g) => g.id === 99)) {
        subType = 'documentary';
      } else if (genresList.some((g) => g.id === 16)) {
        const isJapanese =
          details?.original_language === 'ja' ||
          (isMovie
            ? (details as TMDBMovieDetails).production_countries?.some((c) => c.iso_3166_1 === 'JP')
            : (details as TMDBSeriesDetails).origin_country?.includes('JP'));
        subType = isJapanese ? 'anime' : 'animation';
      }

      const res = await addItem({
        tmdbId: numericId,
        mediaType: isMovie ? 'movie' : 'series',
        subType,
        title: (isMovie ? (details as TMDBMovieDetails)?.title : (details as TMDBSeriesDetails)?.name) || 'Media',
        posterPath: details?.poster_path || undefined,
        originCountry: isMovie
          ? (details as TMDBMovieDetails)?.production_countries?.[0]?.iso_3166_1 || ''
          : (details as TMDBSeriesDetails)?.origin_country?.[0] || '',
        releaseDate: isMovie
          ? (details as TMDBMovieDetails)?.release_date
          : (details as TMDBSeriesDetails)?.first_air_date,
        genres: genresList,
        rating: 5,
        isFavorite: true,
        watchDate: new Date().toISOString(),
        runtime: isMovie ? (details as TMDBMovieDetails)?.runtime || 120 : undefined,
        watchTimeMinutes: isMovie ? (details as TMDBMovieDetails)?.runtime || 120 : 0,
        seasons: !isMovie ? (details as TMDBSeriesDetails)?.number_of_seasons || 1 : undefined,
        episodeDuration: !isMovie ? (details as TMDBSeriesDetails)?.episode_run_time?.[0] || 45 : undefined,
      });
      if (res.success) {
        showSuccess('Added to Favourites ❤️');
      } else {
        showError('Failed to add to favourites');
      }
    }
  };

  // Toggle Watch Later status
  const handleToggleWatchLater = async () => {
    if (historyItem) {
      if (isWatchLater) {
        const res = await removeItem(historyItem._id);
        if (res.success) {
          showSuccess('Removed from Watch Later');
        } else {
          showError(res.message || 'Failed to remove from Watch Later');
        }
      } else {
        const res = await updateItem(historyItem._id, {
          status: 'watch_later',
          rating: 0,
          watchTimeMinutes: 0,
          watchedEpisodes: [],
          watchedSeasons: [],
          episodes: 0,
        });
        if (res.success) {
          showSuccess('Moved to Watch Later 🕒');
        } else {
          showError(res.message || 'Could not move to Watch Later');
        }
      }
    } else {
      if (!details) return;
      const isMovieMedia = 'title' in details;
      const genresList = details?.genres?.map((g) => ({ id: g.id, name: g.name })) || [];
      let subType: 'anime' | 'animation' | 'documentary' | 'live_action' = 'live_action';
      if (genresList.some((g) => g.id === 99)) {
        subType = 'documentary';
      } else if (genresList.some((g) => g.id === 16)) {
        const isJapanese =
          details?.original_language === 'ja' ||
          (isMovieMedia
            ? (details as TMDBMovieDetails).production_countries?.some((c) => c.iso_3166_1 === 'JP')
            : (details as TMDBSeriesDetails).origin_country?.includes('JP'));
        subType = isJapanese ? 'anime' : 'animation';
      }

      const res = await addItem({
        tmdbId: numericId,
        mediaType: isMovieMedia ? 'movie' : 'series',
        subType,
        status: 'watch_later',
        title: (isMovieMedia ? (details as TMDBMovieDetails)?.title : (details as TMDBSeriesDetails)?.name) || 'Media',
        posterPath: details?.poster_path || undefined,
        originCountry: isMovieMedia
          ? (details as TMDBMovieDetails)?.production_countries?.[0]?.iso_3166_1 || ''
          : (details as TMDBSeriesDetails)?.origin_country?.[0] || '',
        releaseDate: isMovieMedia
          ? (details as TMDBMovieDetails)?.release_date
          : (details as TMDBSeriesDetails)?.first_air_date,
        genres: genresList,
        rating: 0,
        isFavorite: false,
        watchDate: null,
        runtime: isMovieMedia ? (details as TMDBMovieDetails)?.runtime || 120 : undefined,
        watchTimeMinutes: 0,
        seasons: !isMovieMedia ? (details as TMDBSeriesDetails)?.number_of_seasons || 1 : undefined,
        episodeDuration: !isMovieMedia ? (details as TMDBSeriesDetails)?.episode_run_time?.[0] || 45 : undefined,
        watchedEpisodes: [],
      });
      if (res.success) {
        showSuccess('Saved to Watch Later 🕒');
      } else {
        showError(res.message || 'Failed to save to Watch Later');
      }
    }
  };

  // Check if an episode is watched
  const isEpisodeWatched = (seasonNum: number, episodeNum: number): boolean => {
    if (!historyItem) return false;
    const tag = `S${seasonNum}E${episodeNum}`;
    if (historyItem.watchedEpisodes?.includes(tag)) return true;
    const s = historyItem.seasonsWatched?.find((sw) => sw.seasonNumber === seasonNum);
    if (s && s.episodesWatched?.includes(episodeNum)) return true;
    return false;
  };

  // Toggle episode watched
  const handleToggleEpisode = async (seasonNum: number, episodeNum: number) => {
    const currentlyWatched = isEpisodeWatched(seasonNum, episodeNum);
    const tag = `S${seasonNum}E${episodeNum}`;

    if (historyItem) {
      let currentEpisodes = [...(historyItem.watchedEpisodes || [])];
      if (currentlyWatched) {
        currentEpisodes = currentEpisodes.filter((e) => e !== tag);
      } else {
        if (!currentEpisodes.includes(tag)) currentEpisodes.push(tag);
      }

      let currentSeasons = [...(historyItem.seasonsWatched || [])];
      const sIndex = currentSeasons.findIndex((sw) => sw.seasonNumber === seasonNum);
      if (sIndex >= 0) {
        const epSet = new Set(currentSeasons[sIndex].episodesWatched || []);
        if (currentlyWatched) {
          epSet.delete(episodeNum);
        } else {
          epSet.add(episodeNum);
        }
        currentSeasons[sIndex] = {
          seasonNumber: seasonNum,
          episodesWatched: Array.from(epSet),
        };
      } else if (!currentlyWatched) {
        currentSeasons.push({
          seasonNumber: seasonNum,
          episodesWatched: [episodeNum],
        });
      }

      const totalWatched = currentSeasons.reduce(
        (sum, s) => sum + (s.episodesWatched?.length || 0),
        0
      );

      const res = await updateItem(historyItem._id, {
        watchedEpisodes: currentEpisodes,
        seasonsWatched: currentSeasons,
        episodes: totalWatched,
      });

      if (res.success) {
        showSuccess(currentlyWatched ? `Unchecked Episode ${episodeNum}` : `Watched Episode ${episodeNum} ✓`);
      }
    } else {
      const genresList = details?.genres?.map((g) => ({ id: g.id, name: g.name })) || [];
      let subType: 'anime' | 'animation' | 'documentary' | 'live_action' = 'live_action';
      if (genresList.some((g) => g.id === 99)) {
        subType = 'documentary';
      } else if (genresList.some((g) => g.id === 16)) {
        const isJapanese =
          details?.original_language === 'ja' ||
          (details as TMDBSeriesDetails)?.origin_country?.includes('JP');
        subType = isJapanese ? 'anime' : 'animation';
      }
      const epDuration = (details as TMDBSeriesDetails)?.episode_run_time?.[0] || 45;

      const res = await addItem({
        tmdbId: numericId,
        mediaType: 'series',
        subType,
        title: (details as TMDBSeriesDetails)?.name || 'TV Series',
        posterPath: details?.poster_path || undefined,
        originCountry: (details as TMDBSeriesDetails)?.origin_country?.[0] || '',
        releaseDate: (details as TMDBSeriesDetails)?.first_air_date,
        genres: genresList,
        watchedEpisodes: [tag],
        seasonsWatched: [{ seasonNumber: seasonNum, episodesWatched: [episodeNum] }],
        episodes: 1,
        seasons: (details as TMDBSeriesDetails)?.number_of_seasons || 1,
        episodeDuration: epDuration,
        watchTimeMinutes: epDuration,
        watchDate: new Date().toISOString(),
        rating: 0,
        isFavorite: false,
      });
      if (res.success) {
        showSuccess(`Watched Episode ${episodeNum} ✓`);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <FilmLoading size="lg" message="Loading film details..." />
      </View>
    );
  }

  if (errorMessage || !details) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Info size={48} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{errorMessage || 'Title not found'}</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  const isMovie = 'title' in details;
  const title = isMovie ? details.title : details.name;
  const releaseDate = isMovie ? details.release_date : details.first_air_date;
  const releaseYear = releaseDate ? releaseDate.slice(0, 4) : '';
  const backdropUrl = details.backdrop_path
    ? `${TMDB_IMAGE_BASE_BACKDROP}${details.backdrop_path}`
    : null;

  // Format movie runtime
  const formatMovieRuntime = (minutes?: number) => {
    if (!minutes) return '2h 15m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // TV seasons list
  const seasonsList = !isMovie
    ? ((details as TMDBSeriesDetails).seasons || []).filter((s) => s.season_number > 0)
    : [];

  // Directors, writers, producers extraction
  const directors = crew.filter((person) => person.job === 'Director');
  const writers = crew.filter((person) =>
    ['Screenplay', 'Writer', 'Story', 'Creator'].includes(person.job)
  );
  const producers = crew.filter((person) =>
    ['Producer', 'Executive Producer'].includes(person.job)
  );

  const keyCrew = [
    ...directors.map((p) => ({ ...p, role: 'Director' })),
    ...writers.slice(0, 3).map((p) => ({ ...p, role: 'Writer' })),
    ...producers.slice(0, 3).map((p) => ({ ...p, role: 'Producer' })),
  ].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

  const keyCrewIds = new Set(keyCrew.map((p) => p.id));
  const remainingCrew = crew.filter((p) => !keyCrewIds.has(p.id));

  // Render collapsible Director & Producers section
  const renderDirectorProducersSection = () => {
    if (keyCrew.length === 0) return null;
    return (
      <View style={styles.accordionContainer}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setShowDirectorProducers((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionTitleRow}>
            <Users size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.accordionTitle}>Director & Producers</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{keyCrew.length}</Text>
            </View>
          </View>
          {showDirectorProducers ? (
            <ChevronUp size={20} color={COLORS.textMuted} />
          ) : (
            <ChevronDown size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        {showDirectorProducers && (
          <View style={styles.accordionContent}>
            <View style={styles.crewGrid}>
              {keyCrew.map((person, idx) => (
                <TouchableOpacity
                  key={`keycrew-${person.id}-${idx}`}
                  style={styles.crewCard}
                  onPress={() => router.push(`/person/${person.id}` as any)}
                  activeOpacity={0.7}
                >
                  {person.profile_path ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${person.profile_path}` }}
                      style={styles.crewAvatar}
                    />
                  ) : (
                    <View style={[styles.crewAvatar, styles.avatarPlaceholder]}>
                      <Users size={18} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={styles.crewCardInfo}>
                    <Text style={styles.crewName} numberOfLines={1}>
                      {person.name}
                    </Text>
                    <Text style={styles.crewRole} numberOfLines={1}>
                      {person.role || person.job}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render collapsible Full Crew section
  const renderCrewSection = () => {
    if (remainingCrew.length === 0) return null;
    return (
      <View style={styles.accordionContainer}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setShowFullCrew((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionTitleRow}>
            <Film size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.accordionTitle}>Crew</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{remainingCrew.length}</Text>
            </View>
          </View>
          {showFullCrew ? (
            <ChevronUp size={20} color={COLORS.textMuted} />
          ) : (
            <ChevronDown size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        {showFullCrew && (
          <View style={styles.accordionContent}>
            <View style={styles.crewGrid}>
              {remainingCrew.slice(0, 30).map((person, idx) => (
                <TouchableOpacity
                  key={`crew-${person.id}-${idx}`}
                  style={styles.crewCard}
                  onPress={() => router.push(`/person/${person.id}` as any)}
                  activeOpacity={0.7}
                >
                  {person.profile_path ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${person.profile_path}` }}
                      style={styles.crewAvatar}
                    />
                  ) : (
                    <View style={[styles.crewAvatar, styles.avatarPlaceholder]}>
                      <Users size={18} color={COLORS.textMuted} />
                    </View>
                  )}
                  <View style={styles.crewCardInfo}>
                    <Text style={styles.crewName} numberOfLines={1}>
                      {person.name}
                    </Text>
                    <Text style={styles.crewRole} numberOfLines={1}>
                      {person.job || person.department}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {remainingCrew.length > 30 && (
              <Text style={styles.moreCrewNotice}>
                +{remainingCrew.length - 30} more crew members
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render collapsible Production & Details section
  const renderProductionSection = () => {
    if (!details) return null;
    const movieDetails = isMovie ? (details as TMDBMovieDetails) : null;
    const seriesDetails = !isMovie ? (details as TMDBSeriesDetails) : null;
    const companies = details.production_companies || [];

    return (
      <View style={styles.accordionContainer}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setShowProduction((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionTitleRow}>
            <Clapperboard size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.accordionTitle}>Production & Details</Text>
          </View>
          {showProduction ? (
            <ChevronUp size={20} color={COLORS.textMuted} />
          ) : (
            <ChevronDown size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        {showProduction && (
          <View style={styles.accordionContent}>
            <View style={styles.detailsTable}>
              {details.status ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{details.status}</Text>
                </View>
              ) : null}

              {details.original_language ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Original Language</Text>
                  <Text style={styles.detailValue}>{details.original_language.toUpperCase()}</Text>
                </View>
              ) : null}

              {movieDetails && movieDetails.budget && movieDetails.budget > 0 ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>${movieDetails.budget.toLocaleString()}</Text>
                </View>
              ) : null}

              {movieDetails && movieDetails.revenue && movieDetails.revenue > 0 ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Revenue</Text>
                  <Text style={styles.detailValue}>${movieDetails.revenue.toLocaleString()}</Text>
                </View>
              ) : null}

              {seriesDetails && seriesDetails.number_of_episodes ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Episodes</Text>
                  <Text style={styles.detailValue}>{seriesDetails.number_of_episodes} Episodes</Text>
                </View>
              ) : null}

              {companies.length > 0 && (
                <View
                  style={[
                    styles.detailRow,
                    { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
                  ]}
                >
                  <Text style={styles.detailLabel}>Production Companies</Text>
                  <View style={styles.companiesWrap}>
                    {companies.map((c) => (
                      <View key={c.id} style={styles.companyPill}>
                        {c.logo_path ? (
                          <Image
                            source={{ uri: `${TMDB_IMAGE_BASE_W185}${c.logo_path}` }}
                            style={styles.companyLogo}
                            resizeMode="contain"
                          />
                        ) : null}
                        <Text style={styles.companyName}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BACKDROP (Screen 5 & Screen 6 style) */}
        <View style={styles.heroContainer}>
          {backdropUrl ? (
            <Image source={{ uri: backdropUrl }} style={styles.heroBackdrop} resizeMode="cover" />
          ) : (
            <View style={[styles.heroBackdrop, styles.backdropPlaceholder]} />
          )}

          {/* Transparent Dark Gradient: transparent poster with subtle bottom blend */}
          <LinearGradient
            colors={[
              'rgba(11, 14, 20, 0.4)',
              'transparent',
              'rgba(11, 14, 20, 0.25)',
              '#0B0E14',
            ]}
            locations={[0, 0.35, 0.8, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Navigation Bar: Back < | Share > */}
          <View style={[styles.topBar, { top: insets.top + SPACING.xs }]}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.circleButton} onPress={handleShare} activeOpacity={0.7}>
                <Share2 size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Banner Trailer Click Area (Clean banner without play icon/button) */}
          <TouchableOpacity
            style={styles.bannerCenterClickArea}
            onPress={handlePlayTrailer}
            activeOpacity={0.9}
            accessibilityLabel="Play trailer on YouTube"
          />
        </View>

        {/* MOVIE VIEW (Screen 5 - Dune: Part Two Layout) */}
        {isMovie ? (
          <View style={styles.contentBody}>
            {/* Title */}
            <Text style={styles.mainTitle}>{title}</Text>

            {/* Meta Line: 2024 • 2h 46m • PG-13 */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{releaseYear || '2024'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {formatMovieRuntime((details as TMDBMovieDetails).runtime)}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {details.status === 'Released' ? 'PG-13' : details.status || 'PG-13'}
              </Text>
            </View>

            {/* Genre Pills Row */}
            {details.genres && details.genres.length > 0 && (
              <View style={styles.genrePillsRow}>
                {details.genres.slice(0, 4).map((g) => (
                  <View key={g.id} style={styles.genrePill}>
                    <Text style={styles.genrePillText}>{g.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Star Rating Line: ⭐ 8.6/10 (843K) */}
            <View style={styles.ratingRow}>
              <Star size={16} color={COLORS.star} fill={COLORS.star} />
              <Text style={styles.ratingScore}>
                {details.vote_average ? details.vote_average.toFixed(1) : '8.6'}/10
              </Text>
              <Text style={styles.ratingCount}>
                ({details.vote_count ? `${Math.round(details.vote_count / 1000)}K` : '843K'})
              </Text>
            </View>

            {/* Synopsis Overview with Expandable More / Less for Long Summaries */}
            {(() => {
              const overview =
                details.overview ||
                'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.';
              const isLong = overview.trim().length > 260;

              return (
                <View style={styles.overviewContainer}>
                  <Text
                    style={styles.overviewText}
                    numberOfLines={isLong && !isOverviewExpanded ? 3 : undefined}
                  >
                    {overview}
                  </Text>
                  {isLong && (
                    <TouchableOpacity
                      onPress={() => setIsOverviewExpanded((prev) => !prev)}
                      activeOpacity={0.7}
                      style={styles.moreLessButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.moreLessText}>
                        {isOverviewExpanded ? 'Less' : 'More'}
                      </Text>
                      {isOverviewExpanded ? (
                        <ChevronUp size={14} color={COLORS.primaryLight || '#FFFFFF'} style={{ marginLeft: 2 }} />
                      ) : (
                        <ChevronDown size={14} color={COLORS.primaryLight || '#FFFFFF'} style={{ marginLeft: 2 }} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {/* Full-width CTA Buttons */}
            <View style={styles.ctaContainer}>
              {historyItem && !isWatchLater ? (
                <TouchableOpacity
                  style={[styles.primaryPillButton, { backgroundColor: COLORS.watched }]}
                  onPress={() => setIsEditModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Check size={18} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryPillText}>Watched • Edit Rating</Text>
                </TouchableOpacity>
              ) : historyItem && isWatchLater ? (
                <TouchableOpacity
                  style={[styles.primaryPillButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => setIsEditModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Check size={18} color="#FFFFFF" strokeWidth={2.6} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryPillText}>In Watch Later • Mark as Watched</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryPillButton}
                  onPress={() => setIsAddModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryPillText}>Mark as Watched</Text>
                </TouchableOpacity>
              )}

              <View style={styles.movieSubCtasRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryPillButtonHalf,
                    isWatchLater && {
                      backgroundColor: 'rgba(16, 185, 129, 0.16)',
                      borderColor: '#10B981',
                    },
                  ]}
                  onPress={handleToggleWatchLater}
                  activeOpacity={0.7}
                >
                  <Clock
                    size={16}
                    color={isWatchLater ? '#10B981' : '#FFFFFF'}
                    strokeWidth={2.2}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.secondaryPillText,
                      { color: isWatchLater ? '#10B981' : '#FFFFFF' },
                    ]}
                  >
                    {isWatchLater ? 'In Watchlist' : 'Watch Later'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryPillButtonHalf, { borderColor: COLORS.primary + '66' }]}
                  onPress={() => setIsAddToListModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={16}
                    color={COLORS.primaryLight || '#FFFFFF'}
                    strokeWidth={2.4}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.secondaryPillText, { color: COLORS.primaryLight || '#FFFFFF' }]}>
                    Add to List
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Where to Watch Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Where to Watch</Text>
              {watchProvider ? (
                <TouchableOpacity
                  style={styles.providerCard}
                  onPress={() => watchProvider.link && Linking.openURL(watchProvider.link)}
                  activeOpacity={0.8}
                >
                  {watchProvider.logo_path ? (
                    <Image
                      source={{ uri: `${TMDB_IMAGE_BASE_W185}${watchProvider.logo_path}` }}
                      style={styles.providerLogo}
                    />
                  ) : (
                    <View style={[styles.providerLogo, styles.providerLogoPlaceholder]}>
                      <Film size={20} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerSubtitle}>Stream now on</Text>
                    <Text style={styles.providerTitle}>{watchProvider.provider_name}</Text>
                  </View>
                  <ExternalLink size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.providerCard}>
                  <View style={[styles.providerLogo, styles.providerLogoPlaceholder]}>
                    <Film size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerSubtitle}>Available on digital stores</Text>
                    <Text style={styles.providerTitle}>Apple TV, Prime Video, Google Play</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Cast Carousel */}
            {cast.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>Top Cast</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.castScroll}
                >
                  {cast.slice(0, 10).map((actor) => (
                    <TouchableOpacity
                      key={actor.id}
                      style={styles.castItem}
                      onPress={() => router.push(`/person/${actor.id}` as any)}
                      activeOpacity={0.7}
                    >
                      {actor.profile_path ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_W185}${actor.profile_path}` }}
                          style={styles.castAvatar}
                        />
                      ) : (
                        <View style={[styles.castAvatar, styles.avatarPlaceholder]}>
                          <Users size={22} color={COLORS.textMuted} />
                        </View>
                      )}
                      <Text style={styles.castName} numberOfLines={1}>
                        {actor.name}
                      </Text>
                      <Text style={styles.castRole} numberOfLines={1}>
                        {actor.character}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Collapsible Sections: Director & Producers, Crew, Production & Details */}
            <View style={[styles.sectionBlock, { marginTop: SPACING.xs }]}>
              {renderDirectorProducersSection()}
              {renderCrewSection()}
              {renderProductionSection()}
            </View>

            {/* Recommendations / Related */}
            {recommendations.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>More Like This</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recsScroll}
                >
                  {recommendations.slice(0, 8).map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      style={styles.recItem}
                      onPress={() => router.push(`/media/${rec.id}?type=movie` as any)}
                      activeOpacity={0.8}
                    >
                      {rec.poster_path ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_W185}${rec.poster_path}` }}
                          style={styles.recPoster}
                        />
                      ) : (
                        <View style={[styles.recPoster, styles.posterPlaceholder]}>
                          <Film size={24} color={COLORS.textMuted} />
                        </View>
                      )}
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {rec.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          /* TV SERIES VIEW (Screen 6 - The Last of Us Layout) */
          <View style={styles.contentBody}>
            {/* Title */}
            <Text style={styles.mainTitle}>{title}</Text>

            {/* Meta Line: 2023 • Present • TV-MA • 2 Seasons */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{releaseYear || '2023'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{details.status || 'Present'}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>TV-MA</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {(details as TMDBSeriesDetails).number_of_seasons || 1} Seasons
              </Text>
            </View>

            {/* Genre Pills */}
            {details.genres && details.genres.length > 0 && (
              <View style={styles.genrePillsRow}>
                {details.genres.slice(0, 4).map((g) => (
                  <View key={g.id} style={styles.genrePill}>
                    <Text style={styles.genrePillText}>{g.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 4 Quick Action Circular Buttons (Screen 6 style) */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => setIsAddToListModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionCircle}>
                  <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.quickActionLabel}>Add to List</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={handleToggleWatchLater}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionCircle,
                    isWatchLater && {
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      borderColor: '#10B981',
                    },
                  ]}
                >
                  <Clock
                    size={22}
                    color={isWatchLater ? '#10B981' : '#FFFFFF'}
                    strokeWidth={2.4}
                  />
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    isWatchLater && { color: '#10B981' },
                  ]}
                >
                  {isWatchLater ? 'In Watchlist' : 'Watch Later'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => {
                  if (historyItem) {
                    setIsEditModalOpen(true);
                  } else {
                    setIsAddModalOpen(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionCircle,
                    historyItem && !isWatchLater && { backgroundColor: COLORS.watched, borderColor: COLORS.watched },
                  ]}
                >
                  <Check size={22} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.quickActionLabel}>
                  {historyItem && !isWatchLater ? 'Watched' : 'Watched'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={handleToggleFavorite}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.quickActionCircle,
                    historyItem?.isFavorite && { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: COLORS.danger },
                  ]}
                >
                  <Heart
                    size={22}
                    color={historyItem?.isFavorite ? COLORS.danger : '#FFFFFF'}
                    fill={historyItem?.isFavorite ? COLORS.danger : 'none'}
                    strokeWidth={2.2}
                  />
                </View>
                <Text style={styles.quickActionLabel}>Favourite</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-Navigation Tabs: [ Episodes | About | Related ] */}
            <View style={styles.subTabsContainer}>
              <TouchableOpacity
                style={[styles.subTabPill, activeTvTab === 'episodes' && styles.subTabPillActive]}
                onPress={() => setActiveTvTab('episodes')}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.subTabText, activeTvTab === 'episodes' && styles.subTabTextActive]}
                >
                  Episodes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabPill, activeTvTab === 'about' && styles.subTabPillActive]}
                onPress={() => setActiveTvTab('about')}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.subTabText, activeTvTab === 'about' && styles.subTabTextActive]}
                >
                  About
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabPill, activeTvTab === 'related' && styles.subTabPillActive]}
                onPress={() => setActiveTvTab('related')}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.subTabText, activeTvTab === 'related' && styles.subTabTextActive]}
                >
                  Related
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: EPISODES */}
            {activeTvTab === 'episodes' && (
              <View style={styles.episodesTab}>
                {/* Season Dropdown Selector Pill */}
                <TouchableOpacity
                  style={styles.seasonSelectorPill}
                  onPress={() => setIsSeasonPickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seasonSelectorText}>Season {selectedSeasonNumber}</Text>
                  <ChevronDown size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Episodes Checklist */}
                {loadingSeason ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 32 }} />
                ) : seasonDetails?.episodes && seasonDetails.episodes.length > 0 ? (
                  <View style={styles.episodesList}>
                    {seasonDetails.episodes.map((ep) => {
                      const watched = isEpisodeWatched(selectedSeasonNumber, ep.episode_number);
                      const stillUrl = ep.still_path
                        ? `${TMDB_IMAGE_BASE_W185}${ep.still_path}`
                        : null;
                      const formattedRuntime = ep.runtime
                        ? `${Math.floor(ep.runtime / 60) > 0 ? `${Math.floor(ep.runtime / 60)}h ` : ''}${ep.runtime % 60}m`
                        : '50m';

                      return (
                        <View key={ep.id} style={styles.episodeCard}>
                          {/* Thumbnail with small play overlay */}
                          <TouchableOpacity
                            style={styles.episodeThumbContainer}
                            onPress={handlePlayTrailer}
                            activeOpacity={0.8}
                          >
                            {stillUrl ? (
                              <Image source={{ uri: stillUrl }} style={styles.episodeThumb} />
                            ) : (
                              <View style={[styles.episodeThumb, styles.posterPlaceholder]}>
                                <Tv size={20} color={COLORS.textMuted} />
                              </View>
                            )}
                            <View style={styles.episodeThumbPlayOverlay}>
                              <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                            </View>
                          </TouchableOpacity>

                          {/* Episode Details */}
                          <View style={styles.episodeInfoCol}>
                            <Text style={styles.episodeTitleText} numberOfLines={1}>
                              {ep.episode_number}. {ep.name}
                            </Text>
                            <Text style={styles.episodeSubText}>{formattedRuntime}</Text>
                          </View>

                          {/* Green Checkmark Button */}
                          <TouchableOpacity
                            style={styles.episodeCheckButton}
                            onPress={() => handleToggleEpisode(selectedSeasonNumber, ep.episode_number)}
                            activeOpacity={0.7}
                          >
                            {watched ? (
                              <View style={styles.checkedCircle}>
                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            ) : (
                              <View style={styles.uncheckedCircle} />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyEpisodesText}>No episodes found for this season.</Text>
                )}
              </View>
            )}

            {/* TAB 2: ABOUT */}
            {activeTvTab === 'about' && (
              <View style={styles.aboutTab}>
                {(() => {
                  const overview = details.overview || 'No synopsis available for this TV series.';
                  const isLong = overview.trim().length > 260;

                  return (
                    <View style={styles.overviewContainer}>
                      <Text
                        style={styles.overviewText}
                        numberOfLines={isLong && !isOverviewExpanded ? 3 : undefined}
                      >
                        {overview}
                      </Text>
                      {isLong && (
                        <TouchableOpacity
                          onPress={() => setIsOverviewExpanded((prev) => !prev)}
                          activeOpacity={0.7}
                          style={styles.moreLessButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.moreLessText}>
                            {isOverviewExpanded ? 'Less' : 'More'}
                          </Text>
                          {isOverviewExpanded ? (
                            <ChevronUp size={14} color={COLORS.primaryLight || '#FFFFFF'} style={{ marginLeft: 2 }} />
                          ) : (
                            <ChevronDown size={14} color={COLORS.primaryLight || '#FFFFFF'} style={{ marginLeft: 2 }} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}

                <View style={styles.ratingRow}>
                  <Star size={16} color={COLORS.star} fill={COLORS.star} />
                  <Text style={styles.ratingScore}>
                    {details.vote_average ? details.vote_average.toFixed(1) : '8.8'}/10
                  </Text>
                  <Text style={styles.ratingCount}>
                    ({details.vote_count ? `${Math.round(details.vote_count / 1000)}K` : '540K'})
                  </Text>
                </View>

                {/* Where to Watch */}
                <View style={[styles.sectionBlock, { marginTop: SPACING.md }]}>
                  <Text style={styles.sectionHeading}>Where to Watch</Text>
                  {watchProvider ? (
                    <TouchableOpacity
                      style={styles.providerCard}
                      onPress={() => watchProvider.link && Linking.openURL(watchProvider.link)}
                      activeOpacity={0.8}
                    >
                      {watchProvider.logo_path ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_W185}${watchProvider.logo_path}` }}
                          style={styles.providerLogo}
                        />
                      ) : null}
                      <View style={styles.providerInfo}>
                        <Text style={styles.providerSubtitle}>Stream now on</Text>
                        <Text style={styles.providerTitle}>{watchProvider.provider_name}</Text>
                      </View>
                      <ExternalLink size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.providerCard}>
                      <View style={[styles.providerLogo, styles.providerLogoPlaceholder]}>
                        <Tv size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.providerInfo}>
                        <Text style={styles.providerSubtitle}>Available on</Text>
                        <Text style={styles.providerTitle}>HBO Max, Netflix, Prime Video</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Cast */}
                {cast.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>Series Cast</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.castScroll}
                    >
                      {cast.slice(0, 10).map((actor) => (
                        <TouchableOpacity
                          key={actor.id}
                          style={styles.castItem}
                          onPress={() => router.push(`/person/${actor.id}` as any)}
                          activeOpacity={0.7}
                        >
                          {actor.profile_path ? (
                            <Image
                              source={{ uri: `${TMDB_IMAGE_BASE_W185}${actor.profile_path}` }}
                              style={styles.castAvatar}
                            />
                          ) : (
                            <View style={[styles.castAvatar, styles.avatarPlaceholder]}>
                              <Users size={22} color={COLORS.textMuted} />
                            </View>
                          )}
                          <Text style={styles.castName} numberOfLines={1}>
                            {actor.name}
                          </Text>
                          <Text style={styles.castRole} numberOfLines={1}>
                            {actor.character}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Collapsible Sections: Director & Producers, Crew, Production & Details */}
                <View style={[styles.sectionBlock, { marginTop: SPACING.sm }]}>
                  {renderDirectorProducersSection()}
                  {renderCrewSection()}
                  {renderProductionSection()}
                </View>
              </View>
            )}

            {/* TAB 3: RELATED */}
            {activeTvTab === 'related' && (
              <View style={styles.relatedTab}>
                <View style={styles.recsGrid}>
                  {recommendations.slice(0, 9).map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      style={styles.gridRecItem}
                      onPress={() => router.push(`/media/${rec.id}?type=tv` as any)}
                      activeOpacity={0.8}
                    >
                      {rec.poster_path ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_W185}${rec.poster_path}` }}
                          style={styles.gridRecPoster}
                        />
                      ) : (
                        <View style={[styles.gridRecPoster, styles.posterPlaceholder]}>
                          <Tv size={24} color={COLORS.textMuted} />
                        </View>
                      )}
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {rec.name || rec.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Season Picker Modal */}
      <Modal
        visible={isSeasonPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSeasonPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSeasonPickerOpen(false)}
        >
          <View style={styles.seasonPickerSheet}>
            <Text style={styles.seasonPickerTitle}>Select Season</Text>
            {seasonsList.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.seasonPickerItem,
                  selectedSeasonNumber === s.season_number && styles.seasonPickerItemActive,
                ]}
                onPress={() => handleSeasonChange(s.season_number)}
              >
                <Text
                  style={[
                    styles.seasonPickerItemText,
                    selectedSeasonNumber === s.season_number && { color: COLORS.primary, fontWeight: '700' },
                  ]}
                >
                  Season {s.season_number} ({s.episode_count} Episodes)
                </Text>
                {selectedSeasonNumber === s.season_number && (
                  <Check size={18} color={COLORS.primary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Media Modal */}
      {isAddModalOpen && (
        <AddMediaModal
          visible={isAddModalOpen}
          item={
            details
              ? {
                  id: details.id,
                  title: isMovie ? (details as TMDBMovieDetails).title : undefined,
                  name: !isMovie ? (details as TMDBSeriesDetails).name : undefined,
                  media_type: isMovie ? 'movie' : 'tv',
                  poster_path: details.poster_path,
                  backdrop_path: details.backdrop_path,
                  release_date: isMovie ? (details as TMDBMovieDetails).release_date : undefined,
                  first_air_date: !isMovie ? (details as TMDBSeriesDetails).first_air_date : undefined,
                  vote_average: details.vote_average,
                  vote_count: details.vote_count,
                  overview: details.overview,
                  genre_ids: details.genres?.map((g) => g.id),
                }
              : null
          }
          onClose={() => setIsAddModalOpen(false)}
          onAdded={() => {
            setIsAddModalOpen(false);
            showSuccess('Added to your watch history!');
          }}
        />
      )}

      {/* Edit Media Modal */}
      {isEditModalOpen && historyItem && (
        <EditMediaModal
          visible={isEditModalOpen}
          item={historyItem}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={() => {
            setIsEditModalOpen(false);
            showSuccess('Updated activity!');
          }}
          onDeleted={() => {
            setIsEditModalOpen(false);
            showSuccess('Removed from watch history');
          }}
        />
      )}

      {/* Confirm Remove Modal */}
      <ConfirmModal
        visible={isDeleteModalOpen}
        title="Remove Title"
        message={`Are you sure you want to remove "${title}" from your watch history?`}
        confirmLabel="Remove"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDeleteItem}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Add to Custom List Modal */}
      {details && (
        <AddToCustomListModal
          visible={isAddToListModalOpen}
          onClose={() => setIsAddToListModalOpen(false)}
          media={{
            id: details.id,
            title: isMovie ? (details as TMDBMovieDetails).title : (details as TMDBSeriesDetails).name,
            mediaType: isMovie ? 'movie' : 'tv',
            posterPath: details.poster_path,
            backdropPath: details.backdrop_path,
            releaseDate: isMovie
              ? (details as TMDBMovieDetails).release_date
              : (details as TMDBSeriesDetails).first_air_date,
            overview: details.overview,
            voteAverage: details.vote_average,
          }}
          historyItem={historyItem}
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
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0E14',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: '#94A3B8',
    fontSize: FONT_SIZE.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#0B0E14',
  },
  errorTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: SPACING.md,
  },
  errorMessage: {
    fontSize: FONT_SIZE.md,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },

  /* HERO */
  heroContainer: {
    width: '100%',
    height: 330,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBackdrop: {
    width: '100%',
    height: 330,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backdropPlaceholder: {
    backgroundColor: '#161B24',
  },
  topBar: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 14, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bannerCenterClickArea: {
    position: 'absolute',
    width: '80%',
    height: '55%',
    alignSelf: 'center',
    top: '25%',
    zIndex: 5,
  },

  /* CONTENT BODY */
  contentBody: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 13,
    color: '#64748B',
  },
  genrePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  genrePill: {
    backgroundColor: '#161B24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingCount: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  overviewContainer: {
    marginTop: 12,
  },
  overviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#94A3B8',
  },
  moreLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
  },
  moreLessText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryLight || '#FFFFFF',
  },

  /* MOVIE CTA BUTTONS (Screen 5) */
  ctaContainer: {
    marginTop: SPACING.xl,
    gap: 12,
  },
  primaryPillButton: {
    width: '100%',
    height: 50,
    borderRadius: 9999,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryPillButton: {
    width: '100%',
    height: 50,
    borderRadius: 9999,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieSubCtasRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  secondaryPillButtonHalf: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  secondaryPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  /* SECTION BLOCK */
  sectionBlock: {
    marginTop: SPACING.xl,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  providerLogoPlaceholder: {
    backgroundColor: 'rgba(229, 9, 20, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  providerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },

  /* CAST CAROUSEL */
  castScroll: {
    gap: 12,
  },
  castItem: {
    width: 80,
    alignItems: 'center',
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#161B24',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  castName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  castRole: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },

  /* RECS */
  recsScroll: {
    gap: 12,
  },
  recItem: {
    width: 110,
  },
  recPoster: {
    width: 110,
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 6,
  },

  /* TV QUICK ACTIONS (Screen 6) */
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 6,
  },

  /* SUB TABS (Screen 6) */
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  subTabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'transparent',
  },
  subTabPillActive: {
    backgroundColor: COLORS.primary,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* EPISODES TAB */
  episodesTab: {
    marginTop: SPACING.md,
  },
  seasonSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#161B24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: SPACING.md,
  },
  seasonSelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  episodesList: {
    gap: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  episodeThumbContainer: {
    width: 80,
    height: 52,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161B24',
  },
  episodeThumb: {
    width: '100%',
    height: '100%',
  },
  episodeThumbPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  episodeTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  episodeSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  episodeCheckButton: {
    padding: 8,
  },
  checkedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.watched,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  emptyEpisodesText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 24,
  },

  /* ABOUT & RELATED TABS */
  aboutTab: {
    marginTop: SPACING.md,
  },
  relatedTab: {
    marginTop: SPACING.md,
  },
  recsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridRecItem: {
    width: (width - SPACING.lg * 2 - 20) / 3,
  },
  gridRecPoster: {
    width: '100%',
    height: 140,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
  },

  /* SEASON PICKER MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  seasonPickerSheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#121620',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seasonPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  seasonPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  seasonPickerItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 8,
  },
  seasonPickerItemText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  /* ACCORDION COLLAPSIBLE SECTIONS */
  accordionContainer: {
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.3)',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  accordionContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: SPACING.md,
  },
  crewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  crewCard: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2 - 10) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B24',
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  crewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#202634',
  },
  crewCardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  crewName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  crewRole: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  moreCrewNotice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  detailsTable: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  companiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  companyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  companyLogo: {
    width: 22,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  companyName: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
});
