import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
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
  ArrowLeft,
  Bot,
  Film,
  Sparkles,
  Tv,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { FilmReelSpinner } from '../../components/common/FilmLoading';
import { MediaCard } from '../../components/media/MediaCard';
import { EmptyState } from '../../components/common/EmptyState';
import { watchService } from '../../services/watchService';
import { useToast } from '../../context/ToastContext';
import { WatchItem } from '../../types/media';

const EXAMPLES = [
  'A thrilling mystery with a big twist',
  'A feel-good movie to cheer me up',
  'A dark series with complex characters',
  'A sci-fi movie like Inception',
  'A show similar to The Last of Us',
];

export default function AIFilterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showInfo } = useToast();

  const [prompt, setPrompt] = useState<string>('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [results, setResults] = useState<WatchItem[]>([]);
  const [filterMode, setFilterMode] = useState<'ai' | 'tmdb-person' | 'basic' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (customPrompt?: string) => {
    const activeText = (customPrompt !== undefined ? customPrompt : prompt).trim();
    if (!activeText) return;

    Keyboard.dismiss();
    setIsLoading(true);
    setHasSearched(true);

    try {
      const fullPrompt = `${activeText} (prefer ${mediaType === 'movie' ? 'movies' : 'TV shows'})`;
      const res = await watchService.aiFilter(fullPrompt);
      setResults(res.items);
      setFilterMode(res.mode);

      if (res.items.length === 0) {
        showInfo('No matching titles found in your library.');
      } else {
        showSuccess(`Found ${res.items.length} matching recommendations!`);
      }
    } catch (err: any) {
      console.error('AI filter error:', err);
      showError(err.response?.data?.message || 'Error processing AI filter');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExample = (example: string) => {
    setPrompt(example);
    handleSearch(example);
  };

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
        <Text style={styles.screenTitle}>AI Filter</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SPACING.xxl },
        ]}
      >
        {/* Large Prompt Card with Textarea */}
        <View style={styles.promptCard}>
          <TextInput
            style={styles.promptInput}
            multiline
            numberOfLines={4}
            placeholder="Describe what you're in the mood for... e.g. 'a mind-bending sci-fi movie like Interstellar'"
            placeholderTextColor={COLORS.textMuted}
            value={prompt}
            onChangeText={setPrompt}
            textAlignVertical="top"
          />
        </View>

        {/* Segmented Toggle: Movies | TV Shows */}
        <View style={styles.segmentedContainer}>
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
            style={[styles.segmentBtn, mediaType === 'tv' && styles.segmentBtnActive]}
            onPress={() => setMediaType('tv')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, mediaType === 'tv' && styles.segmentTextActive]}>
              TV Shows
            </Text>
          </TouchableOpacity>
        </View>

        {/* Big Find Recommendations Button */}
        <TouchableOpacity
          style={[styles.findButton, (!prompt.trim() || isLoading) && styles.findButtonDisabled]}
          onPress={() => handleSearch()}
          disabled={!prompt.trim() || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <FilmReelSpinner size={20} color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.findButtonText}>Find Recommendations</Text>
              <Sparkles size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>

        {/* Try These Examples Section */}
        {!hasSearched && (
          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Try these examples</Text>
            <View style={styles.examplesList}>
              {EXAMPLES.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.examplePill}
                  onPress={() => handleSelectExample(ex)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exampleText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Results Section */}
        {hasSearched && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeaderRow}>
              <Text style={styles.resultsTitle}>
                Recommended For You ({results.length})
              </Text>
              <TouchableOpacity onPress={() => setHasSearched(false)}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {results.length > 0 ? (
              <View style={styles.resultsGrid}>
                {results.map((item) => (
                  <View key={item._id} style={styles.gridItemWrapper}>
                    <MediaCard
                      item={item}
                      viewMode="grid"
                      onPress={() =>
                        router.push(`/media/${item.tmdbId}?type=${item.mediaType}` as any)
                      }
                    />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                icon={<Bot size={44} color={COLORS.textMuted} />}
                title="No Matches Found"
                message="Try tweaking your description or try one of the example prompts above."
                actionLabel="Try Another Prompt"
                onAction={() => setHasSearched(false)}
              />
            )}
          </View>
        )}
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
  promptCard: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.md,
  },
  promptInput: {
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 22,
    minHeight: 90,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  findButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    height: 52,
    marginBottom: SPACING.xl,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  findButtonDisabled: {
    opacity: 0.5,
  },
  findButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  examplesSection: {
    marginTop: SPACING.sm,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  examplesList: {
    gap: SPACING.sm + 2,
  },
  examplePill: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.full,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  exampleText: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    fontWeight: '500',
  },
  resultsSection: {
    marginTop: SPACING.sm,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetText: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItemWrapper: {
    width: '48%',
    marginBottom: SPACING.md,
  },
});
