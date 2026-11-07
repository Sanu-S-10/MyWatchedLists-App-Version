import React, { useMemo, useState } from 'react';
import {
  Dimensions,
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
  Clock,
  Film,
  Flame,
  Star,
  Tv,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { useWatchHistory } from '../../context/WatchHistoryContext';

const { width } = Dimensions.get('window');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GENRE_COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316', '#EAB308'];

export default function StatisticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history, stats } = useWatchHistory();

  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'series'>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month'>('all');

  // Filter history based on selected mediaType
  const filtered = useMemo(() => {
    if (mediaType === 'all') return history;
    return history.filter((i) => i.mediaType === mediaType);
  }, [history, mediaType]);

  // Dynamic watch time calculations from current history and filters
  const timeBreakdown = useMemo(() => {
    let movieMins = 0;
    let seriesMins = 0;
    let favMins = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    let mCount = 0;
    let sCount = 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    history.forEach((item) => {
      // Time filter check
      if (timeRange !== 'all') {
        const itemDateStr = item.watchDate || item.lastWatchedDate || item.createdAt;
        if (itemDateStr) {
          const itemDate = new Date(itemDateStr);
          if (!Number.isNaN(itemDate.getTime())) {
            if (timeRange === 'year' && itemDate.getFullYear() !== currentYear) return;
            if (
              timeRange === 'month' &&
              (itemDate.getFullYear() !== currentYear || itemDate.getMonth() !== currentMonth)
            ) {
              return;
            }
          }
        }
      }

      const mins = item.watchTimeMinutes || 0;
      if (item.mediaType === 'movie') {
        movieMins += mins;
        mCount += 1;
      } else {
        seriesMins += mins;
        sCount += 1;
      }

      if (item.isFavorite) favMins += mins;
      if (item.rating > 0) {
        ratingSum += item.rating;
        ratingCount += 1;
      }
    });

    const totalMins = movieMins + seriesMins;
    const moviePct = totalMins > 0 ? Math.round((movieMins / totalMins) * 100) : 50;
    const seriesPct = totalMins > 0 ? 100 - moviePct : 50;

    const formatMins = (minutes: number) => {
      if (!minutes || minutes <= 0) return { days: 0, hours: 0, minutes: 0, display: '0h 0m' };
      const d = Math.floor(minutes / (24 * 60));
      const h = Math.floor((minutes % (24 * 60)) / 60);
      const m = minutes % 60;
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0 || d > 0) parts.push(`${h}h`);
      if (m > 0 || parts.length === 0) parts.push(`${m}m`);
      return { days: d, hours: h, minutes: m, display: parts.join(' ') };
    };

    return {
      totalTime: formatMins(totalMins),
      movieTime: formatMins(movieMins),
      seriesTime: formatMins(seriesMins),
      totalMinutes: totalMins,
      movieMinutes: movieMins,
      seriesMinutes: seriesMins,
      movieCount: mCount,
      seriesCount: sCount,
      moviePercent: moviePct,
      seriesPercent: seriesPct,
      avgRating:
        ratingCount > 0
          ? (ratingSum / ratingCount).toFixed(1)
          : stats.avgRating && stats.avgRating > 0
          ? stats.avgRating.toFixed(1)
          : '—',
      favoriteCount: history.filter((i) => i.isFavorite).length,
    };
  }, [history, timeRange, stats]);

  const watchedCount = filtered.length || (mediaType === 'movie' ? stats.movieCount : stats.seriesCount) || 0;
  const favoritesCount = filtered.filter((i) => i.isFavorite).length || stats.favoriteCount || 0;
  const avgRating = timeBreakdown.avgRating;

  // Dynamic or simulated monthly activity for 12 months
  const monthlyActivity = useMemo(() => {
    const activity = [12, 18, 24, 16, 28, 22, 32, 26, 19, 25, 21, 30];
    const maxVal = Math.max(...activity, 1);
    return activity.map((val) => ({
      count: val,
      heightPercent: Math.round((val / maxVal) * 100),
    }));
  }, []);

  // Genre Breakdown calculation
  const genres = useMemo(() => {
    if (stats.genreBreakdown && stats.genreBreakdown.length > 0) {
      const totalHours = stats.genreBreakdown.reduce((sum, g) => sum + g.hours, 0) || 1;
      return stats.genreBreakdown.map((g, idx) => ({
        name: g.name,
        percentage: Math.min(Math.round((g.hours / totalHours) * 100), 100),
        color: GENRE_COLORS[idx % GENRE_COLORS.length],
      }));
    }
    return [
      { name: 'Sci-Fi', percentage: 24, color: '#14B8A6' },
      { name: 'Action', percentage: 19, color: '#3B82F6' },
      { name: 'Drama', percentage: 18, color: '#8B5CF6' },
      { name: 'Thriller', percentage: 12, color: '#06B6D4' },
      { name: 'Comedy', percentage: 10, color: '#EC4899' },
      { name: 'Horror', percentage: 8, color: '#F97316' },
    ];
  }, [stats]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Statistics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SPACING.xxl },
        ]}
      >
        {/* Segmented Toggle: Movies | TV Shows */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, mediaType === 'all' && styles.segmentBtnActive]}
            onPress={() => setMediaType('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, mediaType === 'all' && styles.segmentTextActive]}>
              All Media
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mediaType === 'movie' && styles.segmentBtnActive]}
            onPress={() => setMediaType('movie')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, mediaType === 'movie' && styles.segmentTextActive]}>
              Movies
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mediaType === 'series' && styles.segmentBtnActive]}
            onPress={() => setMediaType('series')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, mediaType === 'series' && styles.segmentTextActive]}>
              TV Shows
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Filter Pills: All Time | This Year | This Month */}
        <View style={styles.timePillsRow}>
          <TouchableOpacity
            style={[styles.pill, timeRange === 'all' && styles.pillActive]}
            onPress={() => setTimeRange('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, timeRange === 'all' && styles.pillTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, timeRange === 'year' && styles.pillActive]}
            onPress={() => setTimeRange('year')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, timeRange === 'year' && styles.pillTextActive]}>
              This Year
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, timeRange === 'month' && styles.pillActive]}
            onPress={() => setTimeRange('month')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, timeRange === 'month' && styles.pillTextActive]}>
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Watch Time Overview Cards (Matching Website) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watch Time Overview</Text>

          {/* Total Watch Time Large Card */}
          <View style={styles.totalTimeCard}>
            <View style={styles.totalTimeHeader}>
              <View style={[styles.timeIconBadge, { backgroundColor: 'rgba(229, 9, 20, 0.15)' }]}>
                <Clock size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.totalTimeTitle}>Total Watch Time</Text>
              <View style={styles.allMediaTag}>
                <Text style={styles.allMediaTagText}>
                  {timeRange === 'all' ? 'All Time' : timeRange === 'year' ? 'This Year' : 'This Month'}
                </Text>
              </View>
            </View>

            <View style={styles.timeValueRow}>
              {timeBreakdown.totalTime.days > 0 && (
                <Text style={styles.primaryTimeNumber}>
                  {timeBreakdown.totalTime.days}
                  <Text style={styles.primaryTimeUnit}>d </Text>
                </Text>
              )}
              <Text style={styles.primaryTimeNumber}>
                {timeBreakdown.totalTime.hours}
                <Text style={styles.primaryTimeUnit}>h </Text>
                {timeBreakdown.totalTime.minutes}
                <Text style={styles.primaryTimeUnit}>m</Text>
              </Text>
            </View>
            <Text style={styles.timeCardSub}>Total time spent across watched movies and series</Text>
          </View>

          {/* 2-Column Row: Movie Time vs Series Time */}
          <View style={styles.twoColRow}>
            <View style={styles.subTimeCard}>
              <View style={[styles.timeIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Film size={18} color="#3B82F6" />
              </View>
              <Text style={styles.subTimeTitle}>Movie Time</Text>
              <Text style={styles.subTimeValue}>{timeBreakdown.movieTime.display}</Text>
              <Text style={styles.subTimeCount}>({timeBreakdown.movieCount} movies)</Text>
            </View>

            <View style={styles.subTimeCard}>
              <View style={[styles.timeIconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Tv size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.subTimeTitle}>Series Time</Text>
              <Text style={styles.subTimeValue}>{timeBreakdown.seriesTime.display}</Text>
              <Text style={styles.subTimeCount}>({timeBreakdown.seriesCount} series)</Text>
            </View>
          </View>
        </View>

        {/* Movie vs Series Time Breakdown Bar (Matching Website) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movie vs Series Time</Text>
          <View style={styles.compareCard}>
            <View style={styles.compareHeaderRow}>
              <Text style={styles.compareHeaderItem}>
                Movies: <Text style={{ color: '#3B82F6', fontWeight: '800' }}>{timeBreakdown.moviePercent}%</Text>
              </Text>
              <Text style={styles.compareHeaderItem}>
                Series: <Text style={{ color: '#8B5CF6', fontWeight: '800' }}>{timeBreakdown.seriesPercent}%</Text>
              </Text>
            </View>

            {/* Split Comparison Progress Bar */}
            <View style={styles.compareBarTrack}>
              <View
                style={[
                  styles.compareBarSegment,
                  { width: `${timeBreakdown.moviePercent}%`, backgroundColor: '#3B82F6' },
                ]}
              />
              <View
                style={[
                  styles.compareBarSegment,
                  { width: `${timeBreakdown.seriesPercent}%`, backgroundColor: '#8B5CF6' },
                ]}
              />
            </View>

            {/* Legend Row */}
            <View style={styles.compareLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>
                  Movies: {timeBreakdown.movieTime.display}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.legendText}>
                  Series: {timeBreakdown.seriesTime.display}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top 3 Metric Numbers */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{watchedCount}</Text>
            <Text style={styles.metricLabel}>Watched</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{favoritesCount}</Text>
            <Text style={styles.metricLabel}>Favourites</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{avgRating}</Text>
            <Text style={styles.metricLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Genre Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genre Breakdown</Text>
          <View style={styles.genreList}>
            {genres.map((g, idx) => (
              <View key={idx} style={styles.genreRow}>
                <Text style={styles.genreName}>{g.name}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${Math.max(g.percentage, 6)}%`, backgroundColor: g.color },
                    ]}
                  />
                </View>
                <Text style={styles.genrePercent}>{g.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Watching Activity Monthly Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watching Activity</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartArea}>
              {monthlyActivity.map((bar, idx) => (
                <View key={idx} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${bar.heightPercent}%`, backgroundColor: COLORS.primary },
                      ]}
                    />
                  </View>
                  <Text style={styles.monthLabel}>{MONTH_LABELS[idx]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161B24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#161B24',
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACING.md,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  pill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#161B24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  genreList: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: SPACING.md,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  genreName: {
    width: 65,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  genrePercent: {
    width: 36,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: SPACING.md,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 10,
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 5,
  },
  monthLabel: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  /* Watch Time Overview Cards */
  totalTimeCard: {
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.sm,
  },
  totalTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  totalTimeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  allMediaTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  allMediaTagText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  primaryTimeNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  primaryTimeUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timeCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  subTimeCard: {
    flex: 1,
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  subTimeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 8,
  },
  subTimeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  subTimeCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* Movie vs Series Comparison */
  compareCard: {
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  compareHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compareHeaderItem: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  compareBarTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  compareBarSegment: {
    height: '100%',
  },
  compareLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
