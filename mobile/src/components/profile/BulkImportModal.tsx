import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Film,
  Plus,
  RefreshCw,
  Share2,
  Star,
  Tv,
  Upload,
  X,
  XCircle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { tmdbService } from '../../services/tmdbService';
import { TMDBMediaItem } from '../../types/media';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';
import { FilmLoading, FilmReelSpinner } from '../common/FilmLoading';

const SAMPLE_CSV_CONTENT = `Title,Type,Year,Rating
The Batman,movie,2022,5
Inception,movie,2010,5
Breaking Bad,series,2008,5
Stranger Things,series,2016,4
Dune: Part Two,movie,2024,5
Interstellar,movie,2014,5
The Last of Us,series,2023,5
Oppenheimer,movie,2023,5
Severance,series,2022,4
Spider-Man: Across the Spider-Verse,movie,2023,5
Succession,series,2018,5
The Dark Knight,movie,2008,5`;

interface CSVRow {
  title: string;
  type?: 'movie' | 'tv';
  year?: string;
  rating: number;
}

export interface VerifiedImportItem {
  id: string;
  index: number;
  csvRow: CSVRow;
  matchedMedia: TMDBMediaItem | null;
  isApproved: boolean; // Tick = true, Cross = false
  importStatus: 'pending' | 'imported' | 'skipped' | 'failed';
  errorMessage?: string;
}

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose,
  onCompleted,
}) => {
  const { colors } = useTheme();
  const { addItem, getHistoryItemByTmdbId } = useWatchHistory();
  const { showSuccess, showError, showInfo } = useToast();

  const [step, setStep] = useState<'pick' | 'verify' | 'completed'>('pick');
  const [csvText, setCsvText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const [verifiedItems, setVerifiedItems] = useState<VerifiedImportItem[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Counts
  const approvedCount = verifiedItems.filter((it) => it.isApproved).length;
  const skippedCount = verifiedItems.filter((it) => !it.isApproved).length;
  const totalCount = verifiedItems.length;

  const importedCount = verifiedItems.filter((it) => it.importStatus === 'imported').length;
  const notImportedCount = verifiedItems.filter((it) => it.importStatus !== 'imported').length;

  const resetAll = () => {
    setStep('pick');
    setCsvText('');
    setShowPasteBox(false);
    setIsProcessing(false);
    setVerifiedItems([]);
    setIsImporting(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Robust CSV Parser
  const parseCSVString = (text: string): CSVRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const firstLineLower = lines[0].toLowerCase();
    const hasHeader =
      firstLineLower.includes('title') ||
      firstLineLower.includes('name') ||
      firstLineLower.includes('movie');

    let colTitleIdx = 0;
    let colTypeIdx = 1;
    let colYearIdx = 2;
    let colRatingIdx = 3;

    if (hasHeader) {
      const headerTokens = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());
      const tIdx = headerTokens.findIndex((h) => h === 'title' || h === 'name');
      const tyIdx = headerTokens.findIndex((h) => h === 'type' || h === 'mediatype' || h === 'media_type');
      const yIdx = headerTokens.findIndex((h) => h === 'year' || h === 'release' || h === 'release_year');
      const rIdx = headerTokens.findIndex((h) => h === 'rating' || h === 'score' || h === 'rate');

      if (tIdx !== -1) colTitleIdx = tIdx;
      if (tyIdx !== -1) colTypeIdx = tyIdx;
      if (yIdx !== -1) colYearIdx = yIdx;
      if (rIdx !== -1) colRatingIdx = rIdx;
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
      .map((line) => {
        // Parse CSV row with potential quoted strings
        const pattern = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const fields: string[] = [];
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
          fields.push((val || '').trim());
        }

        const rawTitle = fields[colTitleIdx] || '';
        const rawType = (fields[colTypeIdx] || '').toLowerCase();
        const rawYear = fields[colYearIdx] || '';

        // Rating: try designated rating column, fallback to last column if 5 fields
        let rawRating = parseFloat(fields[colRatingIdx]);
        if (isNaN(rawRating) && fields.length >= 5) {
          const fallback = parseFloat(fields[4]);
          if (!isNaN(fallback)) rawRating = fallback;
        }

        // Support 'tv series', 'series', 'tv', 'show', 'tv show' -> 'tv'
        // and 'movie', 'film' -> 'movie'
        const type: 'movie' | 'tv' | undefined =
          rawType.includes('series') || rawType === 'tv' || rawType.includes('show')
            ? 'tv'
            : rawType === 'movie' || rawType === 'film'
            ? 'movie'
            : undefined;

        const year = /^\d{4}$/.test(rawYear) ? rawYear : undefined;

        let rating = 0;
        if (!isNaN(rawRating) && rawRating > 0) {
          // If rating given out of 10, normalize to 1-5
          rating = rawRating > 5 ? Math.round(rawRating / 2) : Math.round(rawRating);
          rating = Math.max(1, Math.min(5, rating));
        }

        return {
          title: rawTitle,
          type,
          year,
          rating,
        };
      })
      .filter((r) => r.title.length > 0);
  };

  // Process rows by searching TMDB and building verification list in exact CSV order
  const processRows = async (rows: CSVRow[]) => {
    if (rows.length === 0) {
      showError('No valid rows found in CSV');
      return;
    }

    setIsProcessing(true);
    setStep('verify');
    setProcessingProgress({ current: 0, total: rows.length });

    const results: VerifiedImportItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProcessingProgress({ current: i + 1, total: rows.length });

      try {
        let matched: TMDBMediaItem | null = null;
        const searchResults = await tmdbService.searchMulti(row.title);

        if (searchResults && searchResults.length > 0) {
          // If type specified, prioritize it
          if (row.type) {
            matched = searchResults.find((m) => m.media_type === row.type) || null;
          }
          // If year specified, match year if possible
          if (row.year && matched) {
            const yearMatch = searchResults.find(
              (m) =>
                m.media_type === (row.type || m.media_type) &&
                (m.release_date?.startsWith(row.year!) || m.first_air_date?.startsWith(row.year!))
            );
            if (yearMatch) matched = yearMatch;
          }
          // Default to top result if not matched yet
          if (!matched) {
            matched = searchResults.find((m) => m.media_type === 'movie' || m.media_type === 'tv') || searchResults[0];
          }
        }

        results.push({
          id: `csv-${i}`,
          index: i + 1,
          csvRow: row,
          matchedMedia: matched,
          isApproved: !!matched, // Auto-tick if matched, cross if not
          importStatus: 'pending',
        });
      } catch (err) {
        results.push({
          id: `csv-${i}`,
          index: i + 1,
          csvRow: row,
          matchedMedia: null,
          isApproved: false,
          importStatus: 'pending',
          errorMessage: 'Search failed',
        });
      }
    }

    setVerifiedItems(results);
    setIsProcessing(false);
  };

  // Pick CSV from device
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const rows = parseCSVString(content);
      if (rows.length === 0) {
        showError('CSV file has no valid entries');
        return;
      }
      await processRows(rows);
    } catch (e: any) {
      showError(e.message || 'Failed to read CSV file');
    }
  };

  // Load Built-in Demo CSV
  const handleLoadDemo = async () => {
    const rows = parseCSVString(SAMPLE_CSV_CONTENT);
    await processRows(rows);
  };

  // Share / Export Demo CSV
  const handleShareDemo = async () => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}movies_series_demo.csv`;
      await FileSystem.writeAsStringAsync(fileUri, SAMPLE_CSV_CONTENT, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Demo CSV Template',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        showInfo('Demo CSV saved to cache');
      }
    } catch (e) {
      showError('Could not share demo CSV');
    }
  };

  // Parse pasted CSV text
  const handleParsePastedText = async () => {
    if (!csvText.trim()) {
      showError('Please paste your CSV text');
      return;
    }
    const rows = parseCSVString(csvText);
    if (rows.length === 0) {
      showError('No valid rows recognized in pasted text');
      return;
    }
    await processRows(rows);
  };

  // Toggle tick / cross for an individual item
  const handleSetApproved = (id: string, approved: boolean) => {
    setVerifiedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isApproved: approved } : it))
    );
  };

  // Quick Select All / Deselect All
  const handleToggleSelectAll = (select: boolean) => {
    setVerifiedItems((prev) =>
      prev.map((it) => ({ ...it, isApproved: select }))
    );
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    const toImport = verifiedItems.filter((it) => it.isApproved && it.importStatus !== 'imported');
    if (toImport.length === 0) {
      showError('No approved titles selected to import');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: toImport.length });

    let successCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      setImportProgress({ current: i + 1, total: toImport.length });

      try {
        const media = item.matchedMedia;
        const row = item.csvRow;

        const title = media?.title || media?.name || row.title;
        const mediaType = media?.media_type === 'tv' || row.type === 'tv' ? 'series' : 'movie';
        const tmdbId = media ? media.id : 0;
        const posterPath = media?.poster_path || '';
        const releaseDate = media?.release_date || media?.first_air_date || (row.year ? `${row.year}-01-01` : '');

        // Check if already in library
        const existing = tmdbId ? getHistoryItemByTmdbId(tmdbId, mediaType) : null;

        if (existing) {
          // Already in watch history - treat as successfully handled
          setVerifiedItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, importStatus: 'imported' } : it))
          );
          successCount++;
        } else {
          const res = await addItem({
            tmdbId: tmdbId || Math.floor(Math.random() * 900000) + 100000,
            mediaType,
            title,
            posterPath,
            releaseDate,
            rating: row.rating,
            watchDate: new Date().toISOString().split('T')[0],
            isUnknownDate: false,
          });

          if (res.success) {
            setVerifiedItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, importStatus: 'imported' } : it))
            );
            successCount++;
          } else {
            setVerifiedItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, importStatus: 'failed', errorMessage: res.message } : it
              )
            );
          }
        }
      } catch (err: any) {
        setVerifiedItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, importStatus: 'failed', errorMessage: err.message } : it
          )
        );
      }
    }

    setIsImporting(false);
    setStep('completed');
    showSuccess(`Bulk import complete! Added ${successCount} titles.`);
    onCompleted?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.headerTitleWrap}>
            <FileSpreadsheet size={22} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Bulk Import CSV
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* STEP 1: PICK CSV SOURCE */}
        {step === 'pick' && (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.pickContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Guide Card */}
            <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.guideHeader}>
                <FileText size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>
                  CSV Format Instructions
                </Text>
              </View>
              <Text style={[styles.guideBody, { color: colors.textSecondary }]}>
                Add your watched movies and TV series in the standard 4-column CSV format:
              </Text>
              <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>
                  Title, Type, Year, Rating
                </Text>
              </View>
              <Text style={[styles.guideSubText, { color: colors.textMuted }]}>
                • <Text style={{ fontWeight: '700' }}>Type:</Text> movie or series{'\n'}
                • <Text style={{ fontWeight: '700' }}>Year:</Text> 4-digit release year (e.g. 2024){'\n'}
                • <Text style={{ fontWeight: '700' }}>Rating:</Text> 1 to 5 (All titles are imported as Watched)
              </Text>

              {/* Demo Action Buttons */}
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={[styles.demoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={handleShareDemo}
                  activeOpacity={0.75}
                >
                  <Share2 size={14} color={colors.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>
                    Export Demo CSV
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleLoadDemo}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={14} color={colors.primaryContrast} style={{ marginRight: 6 }} />
                  <Text style={[styles.demoBtnText, { color: colors.primaryContrast, fontWeight: '700' }]}>
                    Load Sample Demo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Action: Upload File */}
            <TouchableOpacity
              style={[
                styles.uploadCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handlePickDocument}
              activeOpacity={0.8}
            >
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Upload size={32} color={colors.primary} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                Select CSV File
              </Text>
              <Text style={[styles.uploadSubtitle, { color: colors.textMuted }]}>
                Tap to pick a .csv file from your device
              </Text>
            </TouchableOpacity>

            {/* Alternative: Paste CSV Text */}
            <TouchableOpacity
              style={styles.pasteToggleRow}
              onPress={() => setShowPasteBox(!showPasteBox)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pasteToggleText, { color: colors.primary }]}>
                {showPasteBox ? '— Hide text input' : '+ Or paste CSV text directly'}
              </Text>
            </TouchableOpacity>

            {showPasteBox && (
              <View style={[styles.pasteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[
                    styles.pasteInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={csvText}
                  onChangeText={setCsvText}
                  placeholder={`Title,Type,Year,Rating\nThe Batman,movie,2022,5\nBreaking Bad,series,2008,5`}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={6}
                />
                <TouchableOpacity
                  style={[styles.parsePasteBtn, { backgroundColor: colors.primary }]}
                  onPress={handleParsePastedText}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.parsePasteBtnText, { color: colors.primaryContrast }]}>
                    Parse & Verify CSV Text
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* STEP 2: VERIFICATION SECTION */}
        {step === 'verify' && (
          <View style={styles.verifyContainer}>
            {/* Processing Banner */}
            {isProcessing ? (
              <View style={[styles.processingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FilmLoading
                  size="md"
                  message={`Matching Titles on TMDB (${processingProgress.current} / ${processingProgress.total})...`}
                />
              </View>
            ) : (
              <>
                {/* Verification Control & Summary Bar */}
                <View style={[styles.summaryBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                  <View style={styles.countsRow}>
                    <View style={styles.countBadge}>
                      <Text style={[styles.countLabel, { color: colors.textMuted }]}>Total: </Text>
                      <Text style={[styles.countNumber, { color: colors.textPrimary }]}>{totalCount}</Text>
                    </View>
                    <View style={styles.countDivider} />
                    <View style={styles.countBadge}>
                      <CheckCircle2 size={13} color={colors.primary} style={{ marginRight: 3 }} />
                      <Text style={[styles.countLabel, { color: colors.primary }]}>Import: </Text>
                      <Text style={[styles.countNumber, { color: colors.primary, fontWeight: '800' }]}>
                        {approvedCount}
                      </Text>
                    </View>
                    <View style={styles.countDivider} />
                    <View style={styles.countBadge}>
                      <XCircle size={13} color={colors.danger} style={{ marginRight: 3 }} />
                      <Text style={[styles.countLabel, { color: colors.danger }]}>Skip: </Text>
                      <Text style={[styles.countNumber, { color: colors.danger }]}>{skippedCount}</Text>
                    </View>
                  </View>

                  <View style={styles.bulkSelectButtons}>
                    <TouchableOpacity
                      onPress={() => handleToggleSelectAll(true)}
                      style={[styles.smallBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.textPrimary }]}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleToggleSelectAll(false)}
                      style={[styles.smallBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.textMuted }]}>Deselect</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items Arranged in the Exact Order of the CSV */}
                <ScrollView
                  style={styles.itemsScroll}
                  contentContainerStyle={styles.itemsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {verifiedItems.map((item) => {
                    const row = item.csvRow;
                    const media = item.matchedMedia;
                    const isMovie = media?.media_type === 'movie' || row.type === 'movie';
                    const displayTitle = media ? media.title || media.name : row.title;
                    const year =
                      media?.release_date?.slice(0, 4) ||
                      media?.first_air_date?.slice(0, 4) ||
                      row.year ||
                      '';
                    const poster = media?.poster_path
                      ? `${TMDB_IMAGE_BASE_W185}${media.poster_path}`
                      : null;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: item.isApproved ? colors.primary : colors.border,
                            opacity: item.isApproved ? 1 : 0.65,
                          },
                        ]}
                      >
                        {/* Index Order Badge */}
                        <View style={[styles.indexBadge, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.indexBadgeText, { color: colors.textMuted }]}>
                            #{item.index}
                          </Text>
                        </View>

                        {/* Poster Thumbnail */}
                        {poster ? (
                          <Image source={{ uri: poster }} style={styles.itemPoster} />
                        ) : (
                          <View style={[styles.itemPoster, styles.posterPlaceholder, { backgroundColor: colors.surface }]}>
                            {isMovie ? (
                              <Film size={20} color={colors.textMuted} />
                            ) : (
                              <Tv size={20} color={colors.textMuted} />
                            )}
                          </View>
                        )}

                        {/* Info Column */}
                        <View style={styles.itemInfoCol}>
                          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {displayTitle}
                          </Text>

                          {media && media.title !== row.title && media.name !== row.title && (
                            <Text style={[styles.csvRawTitle, { color: colors.textMuted }]} numberOfLines={1}>
                              CSV: "{row.title}"
                            </Text>
                          )}

                          <View style={styles.itemMetaRow}>
                            <View style={[styles.typePill, { backgroundColor: colors.surface }]}>
                              <Text style={[styles.typePillText, { color: colors.textSecondary }]}>
                                {isMovie ? 'Movie' : 'Series'}
                              </Text>
                            </View>
                            {year ? (
                              <Text style={[styles.itemYear, { color: colors.textMuted }]}>{year}</Text>
                            ) : null}
                          </View>

                          {row.rating > 0 && (
                            <View style={styles.ratingRow}>
                              <Star size={12} color={COLORS.star} fill={COLORS.star} />
                              <Text style={[styles.ratingNumber, { color: COLORS.star }]}>
                                {row.rating} / 5
                              </Text>
                            </View>
                          )}

                          {!media && (
                            <View style={styles.unmatchedRow}>
                              <AlertCircle size={12} color={colors.warning} />
                              <Text style={[styles.unmatchedText, { color: colors.warning }]}>
                                Not found on TMDB
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Tick and Cross Verification Actions */}
                        <View style={styles.actionsCol}>
                          {/* Tick Button (Add) */}
                          <TouchableOpacity
                            style={[
                              styles.actionCircleBtn,
                              item.isApproved
                                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                : { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                            onPress={() => handleSetApproved(item.id, true)}
                            activeOpacity={0.7}
                            accessibilityLabel="Include for import"
                          >
                            <Check
                              size={18}
                              color={item.isApproved ? colors.primaryContrast : colors.textMuted}
                              strokeWidth={3}
                            />
                          </TouchableOpacity>

                          {/* Cross Button (Remove / Skip) */}
                          <TouchableOpacity
                            style={[
                              styles.actionCircleBtn,
                              !item.isApproved
                                ? { backgroundColor: colors.danger, borderColor: colors.danger }
                                : { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                            onPress={() => handleSetApproved(item.id, false)}
                            activeOpacity={0.7}
                            accessibilityLabel="Skip from import"
                          >
                            <X
                              size={18}
                              color={!item.isApproved ? '#FFFFFF' : colors.textMuted}
                              strokeWidth={3}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Bottom Import Action Bar */}
                <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.executeImportBtn,
                      { backgroundColor: colors.primary },
                      (approvedCount === 0 || isImporting) && { opacity: 0.6 },
                    ]}
                    onPress={handleExecuteImport}
                    disabled={approvedCount === 0 || isImporting}
                    activeOpacity={0.85}
                  >
                    {isImporting ? (
                      <View style={styles.importingInner}>
                        <FilmReelSpinner size={18} color={colors.primaryContrast} style={{ marginRight: 8 }} />
                        <Text style={[styles.executeImportBtnText, { color: colors.primaryContrast }]}>
                          Importing ({importProgress.current}/{importProgress.total})...
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.executeImportBtnText, { color: colors.primaryContrast }]}>
                        Import {approvedCount} Titles ({skippedCount} skipped)
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* STEP 3: COMPLETED SUMMARY */}
        {step === 'completed' && (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.completedContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.successIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <CheckCircle2 size={54} color={colors.primary} />
            </View>

            <Text style={[styles.completedTitle, { color: colors.textPrimary }]}>
              Import Complete!
            </Text>

            {/* Counts Summary Box */}
            <View style={[styles.summaryStatsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statCol}>
                <Text style={[styles.statBigNumber, { color: colors.primary }]}>{importedCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Imported</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statCol}>
                <Text style={[styles.statBigNumber, { color: colors.danger }]}>{notImportedCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Not Imported</Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statCol}>
                <Text style={[styles.statBigNumber, { color: colors.textPrimary }]}>{totalCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
              </View>
            </View>

            {/* Finished Items List */}
            <View style={styles.completedList}>
              {verifiedItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.completedRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.completedRowLeft}>
                    {item.importStatus === 'imported' ? (
                      <CheckCircle2 size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    ) : (
                      <XCircle size={18} color={colors.danger} style={{ marginRight: 8 }} />
                    )}
                    <Text
                      style={[
                        styles.completedRowTitle,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.matchedMedia?.title || item.matchedMedia?.name || item.csvRow.title}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.completedRowStatus,
                      {
                        color: item.importStatus === 'imported' ? colors.primary : colors.textMuted,
                      },
                    ]}
                  >
                    {item.importStatus === 'imported' ? 'Imported' : 'Skipped'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Done Action Button */}
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.doneBtnText, { color: colors.primaryContrast }]}>
                Done & View in Library
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  pickContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  guideCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  guideBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  codeBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  guideSubText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  demoBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  uploadCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  uploadIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
  },
  pasteToggleRow: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: SPACING.sm,
  },
  pasteToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pasteBox: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  pasteInput: {
    height: 120,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  parsePasteBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parsePasteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Verification Step */
  verifyContainer: {
    flex: 1,
  },
  processingBox: {
    margin: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  processingCount: {
    fontSize: 13,
    marginTop: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  countNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  countDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
  },
  bulkSelectButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsScroll: {
    flex: 1,
  },
  itemsScrollContent: {
    padding: SPACING.md,
    paddingBottom: 24,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    padding: 10,
    position: 'relative',
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  indexBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemPoster: {
    width: 44,
    height: 64,
    borderRadius: RADIUS.xs,
    marginRight: 10,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  csvRawTitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemYear: {
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  unmatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  unmatchedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  executeImportBtn: {
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  executeImportBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  importingInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Completed Step */
  completedContent: {
    padding: SPACING.xl,
    alignItems: 'center',
    paddingBottom: 40,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: SPACING.md,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: SPACING.lg,
  },
  summaryStatsBox: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statBigNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  completedList: {
    width: '100%',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  completedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  completedRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  completedRowStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  doneBtn: {
    width: '100%',
    height: 50,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
