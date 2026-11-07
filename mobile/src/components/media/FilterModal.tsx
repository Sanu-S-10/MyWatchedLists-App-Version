import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  Globe,
  RotateCcw,
  Star,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { WatchItem } from '../../types/media';

export interface MediaFilters {
  genres: string[];
  minRating: number;
  year: string;
  country: string;
  sortBy: 'createdAtDesc' | 'ratingDesc' | 'yearDesc' | 'titleAsc';
}

export const DEFAULT_FILTERS: MediaFilters = {
  genres: [],
  minRating: 0,
  year: '',
  country: '',
  sortBy: 'createdAtDesc',
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  JP: 'Japan',
  KR: 'South Korea',
  IN: 'India',
  FR: 'France',
  DE: 'Germany',
  CA: 'Canada',
  ES: 'Spain',
  IT: 'Italy',
  AU: 'Australia',
  CN: 'China',
  MX: 'Mexico',
  BR: 'Brazil',
};

const POPULAR_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Science Fiction',
  'Thriller',
];

const RATING_OPTIONS = [
  { label: 'Any Rating', value: 0, stars: '' },
  { label: '⭐⭐⭐⭐⭐ (5.0)', value: 5, stars: '5.0' },
  { label: '⭐⭐⭐⭐+ (4.0+)', value: 4, stars: '4.0+' },
  { label: '⭐⭐⭐+ (3.0+)', value: 3, stars: '3.0+' },
  { label: '⭐⭐+ (2.0+)', value: 2, stars: '2.0+' },
  { label: '⭐+ (1.0+)', value: 1, stars: '1.0+' },
];

const SORT_OPTIONS: { key: MediaFilters['sortBy']; label: string }[] = [
  { key: 'createdAtDesc', label: 'Recently Watched' },
  { key: 'ratingDesc', label: 'Highest Rated' },
  { key: 'yearDesc', label: 'Newest Release' },
  { key: 'titleAsc', label: 'Title (A - Z)' },
];

interface FilterModalProps {
  visible: boolean;
  filters: MediaFilters;
  items: WatchItem[];
  onClose: () => void;
  onApply: (filters: MediaFilters) => void;
  onReset: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  items,
  onClose,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<MediaFilters>(filters);

  // Dropdown expansion toggles
  const [openDropdown, setOpenDropdown] = useState<
    'genre' | 'rating' | 'country' | 'sort' | null
  >(null);

  // Sync state when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      setOpenDropdown(null);
    }
  }, [visible, filters]);

  const toggleDropdown = (name: 'genre' | 'rating' | 'country' | 'sort') => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  // Available genres
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>(POPULAR_GENRES);
    items.forEach((item) => {
      item.genres?.forEach((g) => {
        if (g.name) genreSet.add(g.name);
      });
    });
    return Array.from(genreSet).sort();
  }, [items]);

  // Available countries
  const availableCountries = useMemo(() => {
    const countryMap = new Map<string, string>();
    Object.entries(COUNTRY_NAMES).forEach(([code, name]) => {
      countryMap.set(code, name);
    });

    items.forEach((item) => {
      if (item.originCountry && !countryMap.has(item.originCountry)) {
        try {
          const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(item.originCountry);
          countryMap.set(item.originCountry, name || item.originCountry);
        } catch {
          countryMap.set(item.originCountry, item.originCountry);
        }
      }
    });

    return Array.from(countryMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  // Matching items count
  const matchingCount = useMemo(() => {
    let result = [...items];

    if (localFilters.genres.length > 0) {
      result = result.filter((item) =>
        localFilters.genres.every((genre) =>
          item.genres?.some((g) => g.name.toLowerCase() === genre.toLowerCase())
        )
      );
    }

    if (localFilters.minRating > 0) {
      result = result.filter((item) => item.rating >= localFilters.minRating);
    }

    if (localFilters.year.trim()) {
      result = result.filter((item) => {
        const itemYear = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
        return itemYear === localFilters.year.trim();
      });
    }

    if (localFilters.country) {
      result = result.filter((item) => item.originCountry === localFilters.country);
    }

    return result.length;
  }, [items, localFilters]);

  const hasActiveFilters =
    localFilters.genres.length > 0 ||
    localFilters.minRating > 0 ||
    localFilters.year.trim().length > 0 ||
    localFilters.country.length > 0 ||
    localFilters.sortBy !== 'createdAtDesc';

  const toggleGenre = (genre: string) => {
    setLocalFilters((prev) => {
      const exists = prev.genres.includes(genre);
      return {
        ...prev,
        genres: exists ? prev.genres.filter((g) => g !== genre) : [...prev.genres, genre],
      };
    });
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
    setOpenDropdown(null);
    onReset();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  // Current selected label for Country
  const selectedCountryName = localFilters.country
    ? COUNTRY_NAMES[localFilters.country] || localFilters.country
    : 'All Countries';

  // Current selected label for Rating
  const selectedRatingLabel =
    RATING_OPTIONS.find((o) => o.value === localFilters.minRating)?.label || 'Any Rating';

  // Current selected label for Sort
  const selectedSortLabel =
    SORT_OPTIONS.find((o) => o.key === localFilters.sortBy)?.label || 'Recently Watched';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Filter size={20} color={COLORS.primary} />
              <Text style={styles.title}>Filter & Sort</Text>
            </View>

            <View style={styles.headerRight}>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={14} color={COLORS.danger} />
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable Filters */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. GENRE DROPDOWN */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>GENRE</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownHeader,
                  openDropdown === 'genre' && styles.dropdownHeaderActive,
                ]}
                onPress={() => toggleDropdown('genre')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownHeaderText,
                    localFilters.genres.length > 0 && styles.dropdownHeaderTextHighlight,
                  ]}
                >
                  {localFilters.genres.length > 0
                    ? `${localFilters.genres.length} Genres Selected`
                    : 'Select Genres'}
                </Text>
                {openDropdown === 'genre' ? (
                  <ChevronUp size={18} color={COLORS.primary} />
                ) : (
                  <ChevronDown size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {/* Selected Genres tags */}
              {localFilters.genres.length > 0 && (
                <View style={styles.selectedTagsContainer}>
                  {localFilters.genres.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={styles.selectedTag}
                      onPress={() => toggleGenre(g)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectedTagText}>{g}</Text>
                      <X size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Expanded Genre Dropdown Menu */}
              {openDropdown === 'genre' && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    {availableGenres.map((genre) => {
                      const isSelected = localFilters.genres.includes(genre);
                      return (
                        <TouchableOpacity
                          key={genre}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemActive,
                          ]}
                          onPress={() => toggleGenre(genre)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextActive,
                            ]}
                          >
                            {genre}
                          </Text>
                          {isSelected && (
                            <Check size={16} color={COLORS.primary} strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 2. MIN RATING DROPDOWN */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>MIN RATING</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownHeader,
                  openDropdown === 'rating' && styles.dropdownHeaderActive,
                ]}
                onPress={() => toggleDropdown('rating')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownHeaderText,
                    localFilters.minRating > 0 && styles.dropdownHeaderTextHighlight,
                  ]}
                >
                  {selectedRatingLabel}
                </Text>
                {openDropdown === 'rating' ? (
                  <ChevronUp size={18} color={COLORS.primary} />
                ) : (
                  <ChevronDown size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {/* Expanded Rating Dropdown Menu */}
              {openDropdown === 'rating' && (
                <View style={styles.dropdownMenu}>
                  {RATING_OPTIONS.map((opt) => {
                    const isSelected = localFilters.minRating === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setLocalFilters((prev) => ({ ...prev, minRating: opt.value }));
                          setOpenDropdown(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={COLORS.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 3. RELEASE YEAR INPUT (Preset random chips removed!) */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>RELEASE YEAR</Text>
              <View style={styles.yearInputRow}>
                <TextInput
                  style={styles.yearInput}
                  placeholder="e.g. 2023"
                  placeholderTextColor="#64748B"
                  value={localFilters.year}
                  onChangeText={(text) =>
                    setLocalFilters((prev) => ({ ...prev, year: text }))
                  }
                  keyboardType="numeric"
                  maxLength={4}
                />
                {localFilters.year.length > 0 && (
                  <TouchableOpacity
                    style={styles.inputClearBtn}
                    onPress={() => setLocalFilters((prev) => ({ ...prev, year: '' }))}
                  >
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 4. COUNTRY DROPDOWN */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>COUNTRY</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownHeader,
                  openDropdown === 'country' && styles.dropdownHeaderActive,
                ]}
                onPress={() => toggleDropdown('country')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownHeaderText,
                    localFilters.country.length > 0 && styles.dropdownHeaderTextHighlight,
                  ]}
                >
                  {selectedCountryName}
                </Text>
                {openDropdown === 'country' ? (
                  <ChevronUp size={18} color={COLORS.primary} />
                ) : (
                  <ChevronDown size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {/* Expanded Country Dropdown Menu */}
              {openDropdown === 'country' && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        !localFilters.country && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setLocalFilters((prev) => ({ ...prev, country: '' }));
                        setOpenDropdown(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          !localFilters.country && styles.dropdownItemTextActive,
                        ]}
                      >
                        All Countries
                      </Text>
                      {!localFilters.country && (
                        <Check size={16} color={COLORS.primary} strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>

                    {availableCountries.map(([code, name]) => {
                      const isSelected = localFilters.country === code;
                      return (
                        <TouchableOpacity
                          key={code}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setLocalFilters((prev) => ({ ...prev, country: code }));
                            setOpenDropdown(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextActive,
                            ]}
                          >
                            {name} ({code})
                          </Text>
                          {isSelected && (
                            <Check size={16} color={COLORS.primary} strokeWidth={2.5} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 5. SORT BY DROPDOWN */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>SORT BY</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownHeader,
                  openDropdown === 'sort' && styles.dropdownHeaderActive,
                ]}
                onPress={() => toggleDropdown('sort')}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownHeaderText}>{selectedSortLabel}</Text>
                {openDropdown === 'sort' ? (
                  <ChevronUp size={18} color={COLORS.primary} />
                ) : (
                  <ChevronDown size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>

              {/* Expanded Sort Dropdown Menu */}
              {openDropdown === 'sort' && (
                <View style={styles.dropdownMenu}>
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = localFilters.sortBy === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setLocalFilters((prev) => ({ ...prev, sortBy: opt.key }));
                          setOpenDropdown(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={COLORS.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyButtonText}>
                Apply Filters ({matchingCount} titles)
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#121620',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: 18,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  /* Dropdown Header Box */
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownHeaderActive: {
    borderColor: COLORS.primary,
  },
  dropdownHeaderText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  dropdownHeaderTextHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Dropdown Menu Items */
  dropdownMenu: {
    backgroundColor: '#181E2C',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.08)',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  dropdownItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Selected Genres Tags */
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Year Input */
  yearInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  yearInput: {
    height: 46,
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  inputClearBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },

  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  applyButton: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
