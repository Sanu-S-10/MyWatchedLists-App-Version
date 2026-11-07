import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { TMDBSeason } from '../../types/media';

interface EpisodeTrackerProps {
  seasons: TMDBSeason[];
  selectedEpisodes: Set<string>; // Set of "S1E1", "S1E2"
  onToggleEpisode: (seasonNumber: number, episodeNumber: number) => void;
  onToggleSeason: (seasonNumber: number, isSelectAll: boolean) => void;
  disabled?: boolean;
}

export const EpisodeTracker: React.FC<EpisodeTrackerProps> = ({
  seasons,
  selectedEpisodes,
  onToggleEpisode,
  onToggleSeason,
  disabled = false,
}) => {
  const [expandedSeason, setExpandedSeason] = useState<number | null>(
    seasons.length > 0 ? seasons[0].season_number : null
  );

  const toggleExpand = (seasonNumber: number) => {
    setExpandedSeason((prev) => (prev === seasonNumber ? null : seasonNumber));
  };

  const today = new Date();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Season & Episode Tracking</Text>
      <Text style={styles.sectionSubtitle}>
        Check off the episodes you've watched to accurately calculate your total series watch time.
      </Text>

      {seasons.map((season) => {
        const isExpanded = expandedSeason === season.season_number;
        const episodes = season.episodes || [];
        const airedEpisodes = episodes.filter(
          (ep) => !ep.air_date || new Date(ep.air_date) <= today
        );
        const unreleasedEpisodes = episodes.filter(
          (ep) => ep.air_date && new Date(ep.air_date) > today
        );

        const airedEpisodeCount = airedEpisodes.length;
        const watchedCountInSeason = episodes.filter((ep) =>
          selectedEpisodes.has(`S${season.season_number}E${ep.episode_number}`)
        ).length;

        const isAllAiredWatched =
          airedEpisodeCount > 0 &&
          airedEpisodes.every((ep) =>
            selectedEpisodes.has(`S${season.season_number}E${ep.episode_number}`)
          );

        return (
          <View key={season.season_number} style={styles.seasonContainer}>
            {/* Season Header */}
            <TouchableOpacity
              style={styles.seasonHeader}
              onPress={() => toggleExpand(season.season_number)}
              activeOpacity={0.8}
            >
              <View style={styles.seasonHeaderLeft}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    isAllAiredWatched && styles.checkboxChecked,
                    disabled && styles.checkboxDisabled,
                  ]}
                  disabled={disabled || airedEpisodeCount === 0}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleSeason(season.season_number, !isAllAiredWatched);
                  }}
                  activeOpacity={0.7}
                >
                  {isAllAiredWatched && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </TouchableOpacity>

                <View style={styles.seasonTitleCol}>
                  <Text style={styles.seasonTitle}>Season {season.season_number}</Text>
                  <Text style={styles.seasonProgressText}>
                    {watchedCountInSeason} / {airedEpisodeCount} watched
                    {unreleasedEpisodes.length > 0 && ` (${unreleasedEpisodes.length} upcoming)`}
                  </Text>
                </View>
              </View>

              <View style={styles.seasonHeaderRight}>
                {isExpanded ? (
                  <ChevronUp size={20} color={COLORS.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={COLORS.textSecondary} />
                )}
              </View>
            </TouchableOpacity>

            {/* Expanded Episode List */}
            {isExpanded && (
              <View style={styles.episodesList}>
                {episodes.length === 0 ? (
                  <Text style={styles.noEpisodesText}>Loading episode details...</Text>
                ) : (
                  episodes.map((ep) => {
                    const isAired = !ep.air_date || new Date(ep.air_date) <= today;
                    const isWatched = selectedEpisodes.has(
                      `S${season.season_number}E${ep.episode_number}`
                    );

                    return (
                      <TouchableOpacity
                        key={ep.id || ep.episode_number}
                        style={[
                          styles.episodeItem,
                          !isAired && styles.episodeItemUnreleased,
                        ]}
                        disabled={disabled || !isAired}
                        onPress={() =>
                          onToggleEpisode(season.season_number, ep.episode_number)
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkboxSmall,
                            isWatched && styles.checkboxChecked,
                            (!isAired || disabled) && styles.checkboxDisabled,
                          ]}
                        >
                          {isWatched && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </View>

                        <View style={styles.episodeTextCol}>
                          <View style={styles.episodeHeaderRow}>
                            <Text
                              style={[
                                styles.episodeNumber,
                                isWatched && styles.episodeNumberWatched,
                              ]}
                            >
                              EP {ep.episode_number}
                            </Text>
                            <Text
                              style={[
                                styles.episodeName,
                                isWatched && styles.episodeNameWatched,
                              ]}
                              numberOfLines={1}
                            >
                              {ep.name || `Episode ${ep.episode_number}`}
                            </Text>
                          </View>

                          <View style={styles.episodeMetaRow}>
                            {ep.runtime ? (
                              <Text style={styles.episodeRuntime}>{ep.runtime}m</Text>
                            ) : null}
                            {ep.air_date ? (
                              <Text style={styles.episodeAirDate}>
                                {new Date(ep.air_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Text>
                            ) : null}
                            {!isAired && (
                              <Text style={styles.unreleasedBadge}>Upcoming</Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: SPACING.md,
  },
  seasonContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
  },
  seasonHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seasonTitleCol: {
    marginLeft: SPACING.md,
  },
  seasonTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  seasonProgressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  seasonHeaderRight: {
    paddingLeft: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxSmall: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginRight: SPACING.md,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  episodesList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  noEpisodesText: {
    color: COLORS.textMuted,
    fontSize: 13,
    padding: SPACING.md,
    textAlign: 'center',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  episodeItemUnreleased: {
    opacity: 0.5,
  },
  episodeTextCol: {
    flex: 1,
  },
  episodeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeNumber: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    width: 44,
  },
  episodeNumberWatched: {
    color: COLORS.primary,
  },
  episodeName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  episodeNameWatched: {
    color: COLORS.textSecondary,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 3,
    marginLeft: 44,
  },
  episodeRuntime: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  episodeAirDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  unreleasedBadge: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
