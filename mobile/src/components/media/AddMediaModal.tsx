import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, Clock, Heart, X } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../common/Button';
import { StarRating } from '../common/StarRating';
import { EpisodeTracker } from './EpisodeTracker';
import { TMDBMediaItem, TMDBSeason } from '../../types/media';
import { tmdbService } from '../../services/tmdbService';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

interface AddMediaModalProps {
  visible: boolean;
  item: TMDBMediaItem | null;
  onClose: () => void;
  onAdded?: () => void;
}

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  visible,
  item,
  onClose,
  onAdded,
}) => {
  const { addItem, getHistoryItemByTmdbId } = useWatchHistory();
  const { showSuccess, showError, showInfo } = useToast();

  const [rating, setRating] = useState<number>(0);
  const [userNotes, setUserNotes] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isUnknownDate, setIsUnknownDate] = useState<boolean>(false);
  const [watchDate, setWatchDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Series Season Data
  const [seasonsData, setSeasonsData] = useState<TMDBSeason[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [fullDetails, setFullDetails] = useState<any>(null);

  const isMovie = item ? (item.media_type === 'movie' || (!item.media_type && !!item.title)) : true;
  const isExisting = item ? !!getHistoryItemByTmdbId(item.id, isMovie ? 'movie' : 'series') : false;

  useEffect(() => {
    if (!visible || !item) return;

    // Reset fields
    setRating(0);
    setUserNotes('');
    setIsFavorite(false);
    setIsUnknownDate(false);
    setWatchDate(new Date().toISOString().split('T')[0]);
    setSelectedEpisodes(new Set());
    setSeasonsData([]);
    setFullDetails(null);

    const loadExtraDetails = async () => {
      try {
        setLoadingDetails(true);
        if (isMovie) {
          const movieData = await tmdbService.getMovieDetails(item.id);
          setFullDetails(movieData);
        } else {
          const seriesData = await tmdbService.getSeriesDetails(item.id);
          setFullDetails(seriesData);

          const validSeasons = (seriesData.seasons || []).filter(
            (s) => s.season_number > 0
          );

          // Fetch full episodes for each season
          const seasonPromises = validSeasons.map((s) =>
            tmdbService.getSeasonDetails(item.id, s.season_number).catch(() => s)
          );
          const resolved = await Promise.all(seasonPromises);
          setSeasonsData(resolved);

          // By default for new additions, mark all aired episodes as watched
          const defaultWatched = new Set<string>();
          const today = new Date();
          resolved.forEach((s) => {
            (s.episodes || []).forEach((ep) => {
              if (!ep.air_date || new Date(ep.air_date) <= today) {
                defaultWatched.add(`S${s.season_number}E${ep.episode_number}`);
              }
            });
          });
          setSelectedEpisodes(defaultWatched);
        }
      } catch (err) {
        console.warn('Error fetching TMDB details in AddMediaModal', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadExtraDetails();
  }, [visible, item, isMovie]);

  const handleToggleEpisode = (seasonNum: number, epNum: number) => {
    const key = `S${seasonNum}E${epNum}`;
    setSelectedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleSeason = (seasonNum: number, selectAll: boolean) => {
    const targetSeason = seasonsData.find((s) => s.season_number === seasonNum);
    if (!targetSeason || !targetSeason.episodes) return;

    const today = new Date();
    setSelectedEpisodes((prev) => {
      const next = new Set(prev);
      targetSeason.episodes?.forEach((ep) => {
        if (!ep.air_date || new Date(ep.air_date) <= today) {
          const key = `S${seasonNum}E${ep.episode_number}`;
          if (selectAll) next.add(key);
          else next.delete(key);
        }
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!item) return;

    if (isExisting) {
      showInfo('This title is already in your watch list.');
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      let subType: 'anime' | 'animation' | 'documentary' | 'live_action' = 'live_action';
      const genres = fullDetails?.genres || [];
      const isAnimation =
        genres.some((g: any) => g.id === 16) || item.genre_ids?.includes(16);
      const isDocumentary =
        genres.some((g: any) => g.id === 99) || item.genre_ids?.includes(99);

      if (isDocumentary) {
        subType = 'documentary';
      } else if (isAnimation) {
        const isJapanese =
          item.original_language === 'ja' ||
          fullDetails?.original_language === 'ja' ||
          item.origin_country?.includes('JP') ||
          fullDetails?.origin_country?.includes('JP');
        subType = isJapanese ? 'anime' : 'animation';
      }

      let watchTimeMinutes = 0;
      let calculatedEpisodes = 0;

      if (isMovie) {
        watchTimeMinutes = fullDetails?.runtime || 120;
      } else {
        const avgRuntime = fullDetails?.episode_run_time?.[0] || 45;
        selectedEpisodes.forEach((epStr) => {
          const [sStr, eStr] = epStr.replace('S', '').split('E');
          const sNum = parseInt(sStr, 10);
          const eNum = parseInt(eStr, 10);
          const season = seasonsData.find((sec) => sec.season_number === sNum);
          const ep = season?.episodes?.find((e) => e.episode_number === eNum);
          const epMins = ep?.runtime && ep.runtime > 0 ? ep.runtime : avgRuntime;
          watchTimeMinutes += epMins;
          calculatedEpisodes++;
        });
      }

      let finalWatchDate: string | null = null;
      if (!isUnknownDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (watchDate === todayStr) {
          finalWatchDate = new Date().toISOString();
        } else {
          finalWatchDate = watchDate;
        }
      }

      const payload = {
        tmdbId: item.id,
        mediaType: isMovie ? ('movie' as const) : ('series' as const),
        subType,
        status: 'watched' as const,
        title: item.title || item.name || 'Untitled',
        posterPath: item.poster_path || undefined,
        originCountry: isMovie
          ? fullDetails?.production_countries?.[0]?.iso_3166_1
          : fullDetails?.origin_country?.[0] || item.origin_country?.[0],
        releaseDate: item.release_date || item.first_air_date,
        genres: genres.map((g: any) => ({ id: g.id, name: g.name })),
        rating,
        userNotes: userNotes.trim(),
        isFavorite,
        watchDate: finalWatchDate,
        watchTimeMinutes,
        runtime: isMovie ? fullDetails?.runtime || 120 : undefined,
        seasons: !isMovie ? fullDetails?.number_of_seasons || 1 : undefined,
        episodes: !isMovie ? calculatedEpisodes : undefined,
        episodeDuration: !isMovie ? fullDetails?.episode_run_time?.[0] || 45 : undefined,
        watchedEpisodes: !isMovie ? Array.from(selectedEpisodes) : [],
        watchedSeasons: [],
      };

      const result = await addItem(payload);
      if (result.success) {
        showSuccess(`Added "${payload.title}" to your watched list!`);
        onClose();
        if (onAdded) onAdded();
      } else {
        showError(result.message || 'Failed to add item');
      }
    } catch (e: any) {
      showError(e.message || 'Error adding item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWatchLater = async () => {
    if (!item) return;

    if (isExisting) {
      showInfo('This title is already in your list.');
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      let subType: 'anime' | 'animation' | 'documentary' | 'live_action' = 'live_action';
      const genres = fullDetails?.genres || [];
      const isAnimation =
        genres.some((g: any) => g.id === 16) || item.genre_ids?.includes(16);
      const isDocumentary =
        genres.some((g: any) => g.id === 99) || item.genre_ids?.includes(99);

      if (isDocumentary) {
        subType = 'documentary';
      } else if (isAnimation) {
        const isJapanese =
          item.original_language === 'ja' ||
          fullDetails?.original_language === 'ja' ||
          item.origin_country?.includes('JP') ||
          fullDetails?.origin_country?.includes('JP');
        subType = isJapanese ? 'anime' : 'animation';
      }

      const payload = {
        tmdbId: item.id,
        mediaType: isMovie ? ('movie' as const) : ('series' as const),
        subType,
        status: 'watch_later' as const,
        title: item.title || item.name || 'Untitled',
        posterPath: item.poster_path || undefined,
        originCountry: isMovie
          ? fullDetails?.production_countries?.[0]?.iso_3166_1
          : fullDetails?.origin_country?.[0] || item.origin_country?.[0],
        releaseDate: item.release_date || item.first_air_date,
        genres: genres.map((g: any) => ({ id: g.id, name: g.name })),
        rating: 0,
        userNotes: userNotes.trim(),
        isFavorite,
        watchDate: null,
        watchTimeMinutes: 0,
        runtime: isMovie ? fullDetails?.runtime || 120 : undefined,
        seasons: !isMovie ? fullDetails?.number_of_seasons || 1 : undefined,
        episodes: 0,
        episodeDuration: !isMovie ? fullDetails?.episode_run_time?.[0] || 45 : undefined,
        watchedEpisodes: [],
        watchedSeasons: [],
      };

      const result = await addItem(payload);
      if (result.success) {
        showSuccess(`Saved "${payload.title}" to Watch Later 🕒`);
        onClose();
        if (onAdded) onAdded();
      } else {
        showError(result.message || 'Failed to add item');
      }
    } catch (e: any) {
      showError(e.message || 'Error saving to watch later');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  const posterUri = item.poster_path
    ? `${TMDB_IMAGE_BASE_W185}${item.poster_path}`
    : null;
  const year = (item.release_date || item.first_air_date || '').substring(0, 4);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {isExisting ? 'Already in Watch List' : 'Add to Watched List'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Media Info Banner */}
            <View style={styles.mediaBanner}>
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View style={styles.noPoster}>
                  <Text style={styles.noPosterText}>No Poster</Text>
                </View>
              )}
              <View style={styles.mediaDetails}>
                <Text style={styles.mediaTitle} numberOfLines={2}>
                  {item.title || item.name}
                </Text>
                <Text style={styles.mediaSubtitle}>
                  {isMovie ? 'Movie' : 'TV Series'} {year ? `• ${year}` : ''}
                </Text>
                {fullDetails && (
                  <Text style={styles.mediaRuntime}>
                    {isMovie
                      ? `${fullDetails.runtime || '?'} mins`
                      : `${fullDetails.number_of_seasons || '?'} Seasons • ${fullDetails.number_of_episodes || '?'} Episodes`}
                  </Text>
                )}
              </View>
            </View>

            {loadingDetails ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loaderText}>Fetching details...</Text>
              </View>
            ) : null}

            {/* Favorite & Date Row */}
            <View style={styles.controlRow}>
              <View style={styles.favSection}>
                <Text style={styles.controlLabel}>Favorite</Text>
                <TouchableOpacity
                  style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                  onPress={() => setIsFavorite(!isFavorite)}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={22}
                    color={isFavorite ? COLORS.danger : COLORS.textMuted}
                    fill={isFavorite ? COLORS.danger : 'transparent'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.dateSection}>
                <Text style={styles.controlLabel}>Watch Date</Text>
                <View style={styles.dateInputWrap}>
                  <Calendar size={16} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.dateInput}
                    value={watchDate}
                    onChangeText={setWatchDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    editable={!isUnknownDate}
                  />
                </View>
                <View style={styles.unknownDateRow}>
                  <Switch
                    value={isUnknownDate}
                    onValueChange={setIsUnknownDate}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor="#FFFFFF"
                  />
                  <Text style={styles.unknownDateText}>Unknown date</Text>
                </View>
              </View>
            </View>

            {/* Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.controlLabel}>Your Rating</Text>
              <View style={styles.starWrap}>
                <StarRating rating={rating} onRate={setRating} size={30} />
              </View>
            </View>

            {/* TV Series Episode Tracker */}
            {!isMovie && seasonsData.length > 0 && (
              <EpisodeTracker
                seasons={seasonsData}
                selectedEpisodes={selectedEpisodes}
                onToggleEpisode={handleToggleEpisode}
                onToggleSeason={handleToggleSeason}
              />
            )}

            {/* User Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.controlLabel}>Personal Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={userNotes}
                onChangeText={setUserNotes}
                placeholder="What did you think? Favorite scenes, memorable quotes..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Watch Later Quick Action */}
          {!isExisting && (
            <View style={styles.watchLaterBar}>
              <TouchableOpacity
                style={styles.watchLaterBtn}
                onPress={handleSaveWatchLater}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Clock size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.watchLaterBtnText}>Save to Watch Later (Unrated)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Actions */}
          <View style={styles.sheetFooter}>
            <Button
              title="Cancel"
              variant="secondary"
              size="md"
              onPress={onClose}
              style={styles.footerBtn}
            />
            <Button
              title={isExisting ? 'Already Added' : 'Add to List'}
              variant="primary"
              size="md"
              disabled={isExisting}
              isLoading={isSubmitting}
              onPress={handleSubmit}
              style={styles.footerBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.elevated,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  sheetBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  mediaBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surface,
  },
  noPoster: {
    width: 60,
    height: 90,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPosterText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  mediaDetails: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  mediaTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  mediaSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mediaRuntime: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  loaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loaderText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  controlRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  favSection: {
    alignItems: 'center',
  },
  controlLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: SPACING.xs + 2,
  },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerMuted,
  },
  dateSection: {
    flex: 1,
  },
  dateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  dateInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  unknownDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 6,
  },
  unknownDateText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  ratingSection: {
    marginBottom: SPACING.lg,
  },
  starWrap: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  notesSection: {
    marginBottom: SPACING.xl,
  },
  notesInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 14,
    minHeight: 80,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  watchLaterBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: 4,
  },
  watchLaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  watchLaterBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  footerBtn: {
    flex: 1,
  },
});
