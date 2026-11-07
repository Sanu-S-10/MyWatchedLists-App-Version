import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Film,
  Grid,
  List as ListIcon,
  MapPin,
  Star,
  Tv,
  User,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { FilmLoading } from '../../components/common/FilmLoading';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { TMDB_IMAGE_BASE_W185, TMDB_IMAGE_BASE_W500 } from '../../config/env';
import { tmdbService } from '../../services/tmdbService';
import { TMDBCreditItem, TMDBPerson } from '../../types/media';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - SPACING.md * 2 - SPACING.sm * 2) / 3;

export default function PersonDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);

  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [credits, setCredits] = useState<TMDBCreditItem[]>([]);
  const [knownFor, setKnownFor] = useState<TMDBCreditItem[]>([]);
  const [isBioExpanded, setIsBioExpanded] = useState<boolean>(false);
  const [filmographyView, setFilmographyView] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchPerson() {
      if (!numericId || isNaN(numericId)) {
        setError('Invalid person identifier');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await tmdbService.getPersonDetails(numericId);
        if (!isMounted) return;
        setPerson(data.person);
        setCredits(data.credits);
        setKnownFor(data.knownFor);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to fetch person details:', err);
        setError('Unable to load person details. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchPerson();

    return () => {
      isMounted = false;
    };
  }, [numericId]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <FilmLoading size="lg" message="Loading filmography..." />
      </View>
    );
  }

  if (error || !person) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <User size={48} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error || 'Profile not found'}</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  const profileUrl = person.profile_path
    ? `${TMDB_IMAGE_BASE_W500}${person.profile_path}`
    : null;

  const calculateAge = (birthday: string, deathday?: string) => {
    const start = new Date(birthday).getTime();
    const end = deathday ? new Date(deathday).getTime() : Date.now();
    const ageDiff = end - start;
    return Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: insets.bottom + SPACING.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          {profileUrl ? (
            <Image source={{ uri: profileUrl }} style={styles.profileImage} resizeMode="cover" />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <User size={48} color={COLORS.textMuted} />
            </View>
          )}

          <Text style={styles.personName}>{person.name}</Text>
          <Text style={styles.departmentText}>{person.known_for_department || 'Artist'}</Text>

          {/* Quick Meta Info */}
          <View style={styles.metaRow}>
            {person.birthday ? (
              <View style={styles.metaItem}>
                <Calendar size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {person.birthday}
                  {person.deathday
                    ? ` — ${person.deathday} (age ${calculateAge(person.birthday, person.deathday)})`
                    : ` (age ${calculateAge(person.birthday)})`}
                </Text>
              </View>
            ) : null}

            {person.place_of_birth ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {person.place_of_birth}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Biography */}
        {person.biography ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text
              style={styles.biographyText}
              numberOfLines={isBioExpanded ? undefined : 4}
            >
              {person.biography}
            </Text>
            {person.biography.length > 240 && (
              <TouchableOpacity
                onPress={() => setIsBioExpanded(!isBioExpanded)}
                style={styles.expandButton}
              >
                <Text style={styles.expandButtonText}>
                  {isBioExpanded ? 'Read Less' : 'Read Full Biography'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Known For Carousel */}
        {knownFor.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Known For</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.knownForList}
            >
              {knownFor.map((item) => {
                const title = item.title || item.name;
                const isMovie = item.media_type === 'movie' || (!item.media_type && !!item.title);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${item.credit_id || item.title}`}
                    style={styles.knownForCard}
                    onPress={() =>
                      router.push(
                        `/media/${item.id}?type=${isMovie ? 'movie' : 'tv'}` as any
                      )
                    }
                    activeOpacity={0.8}
                  >
                    {item.poster_path ? (
                      <Image
                        source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                        style={styles.knownForPoster}
                      />
                    ) : (
                      <View style={[styles.knownForPoster, styles.posterPlaceholder]}>
                        {isMovie ? (
                          <Film size={24} color={COLORS.textMuted} />
                        ) : (
                          <Tv size={24} color={COLORS.textMuted} />
                        )}
                      </View>
                    )}
                    <Text style={styles.knownForTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.knownForRole} numberOfLines={1}>
                      {item.character || item.job || (isMovie ? 'Movie' : 'Series')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Filmography Section with Posters */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Filmography</Text>
              <Text style={styles.creditsCount}>{credits.length} titles</Text>
            </View>

            {/* View Mode Toggle: List vs Grid */}
            <View style={styles.viewToggleRow}>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  filmographyView === 'list' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setFilmographyView('list')}
                activeOpacity={0.7}
              >
                <ListIcon
                  size={16}
                  color={filmographyView === 'list' ? '#FFFFFF' : '#94A3B8'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  filmographyView === 'grid' && styles.viewToggleBtnActive,
                ]}
                onPress={() => setFilmographyView('grid')}
                activeOpacity={0.7}
              >
                <Grid
                  size={16}
                  color={filmographyView === 'grid' ? '#FFFFFF' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {filmographyView === 'list' ? (
            /* Filmography List View with Posters */
            <View style={styles.filmographyList}>
              {credits.map((item, idx) => {
                const title = item.title || item.name;
                const date = item.release_date || item.first_air_date;
                const year = date ? date.slice(0, 4) : '—';
                const isMovie = item.media_type === 'movie' || (!item.media_type && !!item.title);

                return (
                  <TouchableOpacity
                    key={`${item.id}-${idx}`}
                    style={styles.filmRow}
                    onPress={() =>
                      router.push(
                        `/media/${item.id}?type=${isMovie ? 'movie' : 'tv'}` as any
                      )
                    }
                    activeOpacity={0.7}
                  >
                    {/* Poster Thumbnail */}
                    <View style={styles.filmPosterContainer}>
                      {item.poster_path ? (
                        <Image
                          source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                          style={styles.filmPoster}
                        />
                      ) : (
                        <View style={[styles.filmPoster, styles.posterPlaceholder]}>
                          {isMovie ? (
                            <Film size={18} color={COLORS.textMuted} />
                          ) : (
                            <Tv size={18} color={COLORS.textMuted} />
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.filmInfo}>
                      <View style={styles.filmTitleRow}>
                        <Text style={styles.filmTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        <Badge
                          label={isMovie ? 'Movie' : 'TV'}
                          variant={isMovie ? 'primary' : 'purple'}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.filmRole} numberOfLines={1}>
                        {item.character ? `as ${item.character}` : item.job || 'Cast'}
                      </Text>
                      <Text style={styles.filmYearText}>{year}</Text>
                    </View>

                    {item.vote_average ? (
                      <View style={styles.ratingBadge}>
                        <Star size={11} color={COLORS.star} fill={COLORS.star} />
                        <Text style={styles.ratingValue}>{item.vote_average.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* Filmography Grid View with Large Posters */
            <View style={styles.filmGrid}>
              {credits.map((item, idx) => {
                const title = item.title || item.name;
                const date = item.release_date || item.first_air_date;
                const year = date ? date.slice(0, 4) : '';
                const isMovie = item.media_type === 'movie' || (!item.media_type && !!item.title);

                return (
                  <TouchableOpacity
                    key={`grid-${item.id}-${idx}`}
                    style={styles.filmGridCard}
                    onPress={() =>
                      router.push(
                        `/media/${item.id}?type=${isMovie ? 'movie' : 'tv'}` as any
                      )
                    }
                    activeOpacity={0.8}
                  >
                    {item.poster_path ? (
                      <Image
                        source={{ uri: `${TMDB_IMAGE_BASE_W185}${item.poster_path}` }}
                        style={styles.filmGridPoster}
                      />
                    ) : (
                      <View style={[styles.filmGridPoster, styles.posterPlaceholder]}>
                        {isMovie ? (
                          <Film size={26} color={COLORS.textMuted} />
                        ) : (
                          <Tv size={26} color={COLORS.textMuted} />
                        )}
                      </View>
                    )}
                    <Text style={styles.filmGridTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    <View style={styles.filmGridMetaRow}>
                      <Text style={styles.filmGridYear}>{year || '—'}</Text>
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
              })}
            </View>
          )}
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
  headerBar: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
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
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#161B24',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  personName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  departmentText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creditsCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  biographyText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  expandButton: {
    marginTop: 6,
  },
  expandButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  knownForList: {
    gap: 12,
  },
  knownForCard: {
    width: 105,
  },
  knownForPoster: {
    width: 105,
    height: 155,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
    marginBottom: 6,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  knownForTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  knownForRole: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },

  /* Filmography List with Posters */
  filmographyList: {
    backgroundColor: '#121620',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  filmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filmPosterContainer: {
    width: 44,
    height: 64,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: '#161B24',
    marginRight: 12,
  },
  filmPoster: {
    width: '100%',
    height: '100%',
  },
  filmInfo: {
    flex: 1,
  },
  filmTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  filmTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  filmRole: {
    fontSize: 12,
    color: '#94A3B8',
  },
  filmYearText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#161B24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  ratingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.star,
  },

  /* Filmography Grid */
  filmGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filmGridCard: {
    width: GRID_ITEM_WIDTH,
    marginBottom: SPACING.md,
  },
  filmGridPoster: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH * 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: '#161B24',
  },
  filmGridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 5,
  },
  filmGridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  filmGridYear: {
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
});
