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
import { Calendar, Heart, Trash2, X } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../common/Button';
import { StarRating } from '../common/StarRating';
import { EpisodeTracker } from './EpisodeTracker';
import { ConfirmModal } from '../common/ConfirmModal';
import { TMDBSeason, WatchItem } from '../../types/media';
import { tmdbService } from '../../services/tmdbService';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

interface EditMediaModalProps {
  visible: boolean;
  item: WatchItem | null;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export const EditMediaModal: React.FC<EditMediaModalProps> = ({
  visible,
  item,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const { updateItem, removeItem } = useWatchHistory();
  const { showSuccess, showError } = useToast();

  const [rating, setRating] = useState<number>(0);
  const [userNotes, setUserNotes] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isUnknownDate, setIsUnknownDate] = useState<boolean>(false);
  const [watchDate, setWatchDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Series Season Data
  const [seasonsData, setSeasonsData] = useState<TMDBSeason[]>([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(new Set());
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(false);

  const isMovie = item?.mediaType === 'movie';

  useEffect(() => {
    if (!visible || !item) return;

    setRating(item.rating || 0);
    setUserNotes(item.userNotes || '');
    setIsFavorite(item.isFavorite || false);
    setIsUnknownDate(item.watchDate === null);
    setWatchDate(
      item.watchDate
        ? new Date(item.watchDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );

    const initialWatched = new Set<string>();
    if (item.watchedEpisodes && Array.isArray(item.watchedEpisodes)) {
      item.watchedEpisodes.forEach((ep) => {
        initialWatched.add(typeof ep === 'string' ? ep : `S${(ep as any).season}E${(ep as any).episode}`);
      });
    }
    setSelectedEpisodes(initialWatched);

    if (!isMovie) {
      const loadSeasons = async () => {
        try {
          setLoadingSeasons(true);
          const seriesData = await tmdbService.getSeriesDetails(item.tmdbId);
          const validSeasons = (seriesData.seasons || []).filter((s) => s.season_number > 0);
          const seasonPromises = validSeasons.map((s) =>
            tmdbService.getSeasonDetails(item.tmdbId, s.season_number).catch(() => s)
          );
          const resolved = await Promise.all(seasonPromises);
          setSeasonsData(resolved);
        } catch (e) {
          console.warn('Failed to load season details for edit', e);
        } finally {
          setLoadingSeasons(false);
        }
      };
      loadSeasons();
    }
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

  const handleSave = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      let runtimeParams: any = {};
      if (!isMovie) {
        let calculatedEpisodes = 0;
        let totalWatchTime = 0;
        const avgRuntime = item.episodeDuration || 45;

        selectedEpisodes.forEach((epStr) => {
          const [sStr, eStr] = epStr.replace('S', '').split('E');
          const sNum = parseInt(sStr, 10);
          const eNum = parseInt(eStr, 10);
          const season = seasonsData.find((sec) => sec.season_number === sNum);
          const ep = season?.episodes?.find((e) => e.episode_number === eNum);
          const epMins = ep?.runtime && ep.runtime > 0 ? ep.runtime : avgRuntime;
          totalWatchTime += epMins;
          calculatedEpisodes++;
        });

        runtimeParams = {
          episodes: calculatedEpisodes,
          watchTimeMinutes: totalWatchTime,
          watchedEpisodes: Array.from(selectedEpisodes),
          watchedSeasons: [],
        };
      }

      const updates = {
        status: 'watched' as const,
        rating,
        userNotes: userNotes.trim(),
        isFavorite,
        watchDate: isUnknownDate ? null : watchDate,
        ...runtimeParams,
      };

      const result = await updateItem(item._id, updates);
      if (result.success) {
        showSuccess('Watch details updated!');
        onClose();
        if (onUpdated) onUpdated();
      } else {
        showError(result.message || 'Failed to update item');
      }
    } catch (e: any) {
      showError(e.message || 'Error updating item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      const result = await removeItem(item._id);
      if (result.success) {
        showSuccess('Removed from watch list');
        setShowDeleteConfirm(false);
        onClose();
        if (onDeleted) onDeleted();
      } else {
        showError(result.message || 'Failed to remove item');
      }
    } catch (e: any) {
      showError(e.message || 'Error removing item');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  const posterUri = item.posterPath
    ? `${TMDB_IMAGE_BASE_W185}${item.posterPath}`
    : null;
  const year = item.releaseDate ? item.releaseDate.substring(0, 4) : '';

  return (
    <>
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
              <Text style={styles.sheetTitle}>Edit Activity</Text>
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
                    {item.title}
                  </Text>
                  <Text style={styles.mediaSubtitle}>
                    {item.mediaType === 'movie' ? 'Movie' : 'TV Series'} {year ? `• ${year}` : ''}
                  </Text>
                  <Text style={styles.mediaRuntime}>
                    {item.mediaType === 'movie'
                      ? `${item.watchTimeMinutes || item.runtime || 0} mins logged`
                      : `${selectedEpisodes.size} episodes watched`}
                  </Text>
                </View>
              </View>

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
              {!isMovie && (
                loadingSeasons ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loaderText}>Loading episode checklist...</Text>
                  </View>
                ) : (
                  <EpisodeTracker
                    seasons={seasonsData}
                    selectedEpisodes={selectedEpisodes}
                    onToggleEpisode={handleToggleEpisode}
                    onToggleSeason={handleToggleSeason}
                  />
                )
              )}

              {/* User Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.controlLabel}>Personal Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={userNotes}
                  onChangeText={setUserNotes}
                  placeholder="What did you think of it?"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.deleteRow}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={COLORS.danger} />
                <Text style={styles.deleteText}>Remove from Watch History</Text>
              </TouchableOpacity>
            </ScrollView>

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
                title="Save Changes"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                onPress={handleSave}
                style={styles.footerBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Remove Title"
        message={`Are you sure you want to remove "${item.title}" from your watched list? This cannot be undone.`}
        confirmTitle="Remove"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
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
    paddingVertical: SPACING.lg,
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
    marginBottom: SPACING.lg,
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  footerBtn: {
    flex: 1,
  },
});
