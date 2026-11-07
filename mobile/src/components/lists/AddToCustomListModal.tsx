import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  Check,
  Film,
  FolderPlus,
  ListPlus,
  Plus,
  Tv,
  X,
} from 'lucide-react-native';
import { RADIUS, SPACING } from '../../constants/theme';
import { CustomList } from '../../types/customList';
import { WatchItem } from '../../types/media';
import { customListService } from '../../services/customListService';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

export interface AddToCustomListMedia {
  id: number; // TMDB ID
  title: string;
  mediaType: 'movie' | 'tv' | 'series';
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  overview?: string;
  voteAverage?: number;
}

interface AddToCustomListModalProps {
  visible: boolean;
  onClose: () => void;
  media: AddToCustomListMedia | null;
  historyItem?: WatchItem | null;
  onListUpdated?: () => void;
}

export const AddToCustomListModal: React.FC<AddToCustomListModalProps> = ({
  visible,
  onClose,
  media,
  historyItem,
  onListUpdated,
}) => {
  const { colors } = useTheme();
  const { addItem, getHistoryItemByTmdbId } = useWatchHistory();
  const { showSuccess, showError } = useToast();

  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingListId, setUpdatingListId] = useState<string | null>(null);

  // Inline "Create New List" Form State
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [isCreatingList, setIsCreatingList] = useState<boolean>(false);

  // Load custom lists when modal becomes visible
  const loadLists = async () => {
    try {
      setIsLoading(true);
      const lists = await customListService.getCustomLists();
      setCustomLists(lists);
    } catch (e) {
      console.warn('Could not load custom lists', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && media) {
      loadLists();
      setShowCreateForm(false);
      setNewListName('');
    }
  }, [visible, media?.id]);

  if (!visible || !media) return null;

  const normalizedType = media.mediaType === 'series' ? 'tv' : media.mediaType;

  // Helper to ensure we have a valid WatchItem in the database for the backend
  const ensureWatchItemId = async (): Promise<string | null> => {
    // 1. If historyItem prop is already passed, use its _id
    if (historyItem && historyItem._id) {
      return historyItem._id;
    }

    // 2. Check in WatchHistoryContext if it already exists
    const existing = getHistoryItemByTmdbId(media.id, normalizedType === 'movie' ? 'movie' : 'series');
    if (existing && existing._id) {
      return existing._id;
    }

    // 3. Otherwise, automatically register it as 'plan_to_watch' so backend can snapshot it
    try {
      const res = await addItem({
        tmdbId: media.id,
        mediaType: normalizedType === 'movie' ? 'movie' : 'series',
        title: media.title,
        posterPath: media.posterPath || '',
        releaseDate: media.releaseDate || '',
        rating: 0,
      });

      if (res.success && res.item) {
        return res.item._id;
      }
      return null;
    } catch (e) {
      console.error('Failed to create watch item before adding to custom list', e);
      return null;
    }
  };

  // Check if current media is in a given custom list
  const isItemInList = (list: CustomList): boolean => {
    return (list.items || []).some((it) => {
      if (it.tmdbId && it.tmdbId === media.id) return true;
      if (historyItem && it.watchItem === historyItem._id) return true;
      return false;
    });
  };

  // Toggle adding or removing from an existing custom list
  const handleToggleList = async (list: CustomList) => {
    const inList = isItemInList(list);
    setUpdatingListId(list._id);

    try {
      const watchItemId = await ensureWatchItemId();
      if (!watchItemId) {
        showError('Could not save media item to list');
        return;
      }

      let updatedItemIds: string[];
      if (inList) {
        // Remove item from custom list
        updatedItemIds = (list.items || [])
          .filter((it) => it.tmdbId !== media.id && it.watchItem !== watchItemId)
          .map((it) => it.watchItem)
          .filter(Boolean);
      } else {
        // Add item to custom list
        const existingIds = (list.items || [])
          .map((it) => it.watchItem)
          .filter(Boolean);
        updatedItemIds = Array.from(new Set([...existingIds, watchItemId]));
      }

      const updated = await customListService.updateCustomList(list._id, {
        itemIds: updatedItemIds,
      });

      setCustomLists((prev) =>
        prev.map((l) => (l._id === list._id ? updated : l))
      );

      if (inList) {
        showSuccess(`Removed from "${list.name}"`);
      } else {
        showSuccess(`Added to "${list.name}"!`);
      }

      onListUpdated?.();
    } catch (e: any) {
      showError(e.message || 'Failed to update custom list');
    } finally {
      setUpdatingListId(null);
    }
  };

  // Create a new list and immediately include the current media
  const handleCreateAndAdd = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) {
      showError('Please enter a list name');
      return;
    }

    setIsCreatingList(true);
    try {
      const watchItemId = await ensureWatchItemId();
      const itemIds = watchItemId ? [watchItemId] : [];

      const newList = await customListService.createCustomList({
        name: trimmed,
        description: '',
        itemIds,
        isPublic: true,
      });

      setCustomLists((prev) => [newList, ...prev]);
      setNewListName('');
      setShowCreateForm(false);
      showSuccess(`Created "${newList.name}" with "${media.title}"!`);

      onListUpdated?.();
    } catch (e: any) {
      showError(e.message || 'Failed to create list');
    } finally {
      setIsCreatingList(false);
    }
  };

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
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <ListPlus size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Add to Custom List
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Media Preview Card */}
          <View
            style={[
              styles.mediaPreview,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {media.posterPath ? (
              <Image
                source={{ uri: `${TMDB_IMAGE_BASE_W185}${media.posterPath}` }}
                style={styles.previewPoster}
              />
            ) : (
              <View style={[styles.previewPoster, styles.posterPlaceholder]}>
                {normalizedType === 'movie' ? (
                  <Film size={22} color={colors.textMuted} />
                ) : (
                  <Tv size={22} color={colors.textMuted} />
                )}
              </View>
            )}

            <View style={styles.previewInfo}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {media.title}
              </Text>
              <Text style={[styles.previewSubtitle, { color: colors.textMuted }]}>
                {normalizedType === 'movie' ? 'Movie' : 'TV Series'}
                {media.releaseDate ? ` • ${media.releaseDate.slice(0, 4)}` : ''}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Create New List Button / Inline Form */}
            {!showCreateForm ? (
              <TouchableOpacity
                style={[
                  styles.createListPromptBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryMuted || 'rgba(229, 9, 20, 0.08)',
                  },
                ]}
                onPress={() => setShowCreateForm(true)}
                activeOpacity={0.8}
              >
                <FolderPlus size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.createListPromptText, { color: colors.primary }]}>
                  + Create New List
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.inlineCreateBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.inlineCreateTitle, { color: colors.textPrimary }]}>
                  Create New List
                </Text>
                <TextInput
                  style={[
                    styles.createInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={newListName}
                  onChangeText={setNewListName}
                  placeholder="e.g. Best Sci-Fi, Weekend Watch..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.inlineCreateActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewListName('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitCreateBtn,
                      {
                        backgroundColor: colors.primary,
                      },
                      isCreatingList && { opacity: 0.7 },
                    ]}
                    onPress={handleCreateAndAdd}
                    disabled={isCreatingList}
                    activeOpacity={0.8}
                  >
                    {isCreatingList ? (
                      <ActivityIndicator size="small" color={colors.primaryContrast} />
                    ) : (
                      <Text
                        style={[
                          styles.submitCreateBtnText,
                          { color: colors.primaryContrast },
                        ]}
                      >
                        Create & Add
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Custom Lists Header */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              YOUR CUSTOM LISTS
            </Text>

            {isLoading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.textMuted }]}>
                  Loading lists...
                </Text>
              </View>
            ) : customLists.length === 0 ? (
              <View style={styles.emptyStateWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  You don't have any custom lists yet.
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                  Tap "+ Create New List" above to start your first collection!
                </Text>
              </View>
            ) : (
              <View style={styles.listsContainer}>
                {customLists.map((list) => {
                  const inList = isItemInList(list);
                  const isUpdating = updatingListId === list._id;

                  return (
                    <TouchableOpacity
                      key={list._id}
                      style={[
                        styles.listRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: inList ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => handleToggleList(list)}
                      activeOpacity={0.75}
                      disabled={isUpdating}
                    >
                      <View style={styles.listRowInfo}>
                        <Text
                          style={[
                            styles.listRowName,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {list.name}
                        </Text>
                        <Text style={[styles.listRowCount, { color: colors.textMuted }]}>
                          {list.itemCount || (list.items ? list.items.length : 0)} items
                          {list.description ? ` • ${list.description}` : ''}
                        </Text>
                      </View>

                      {isUpdating ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : inList ? (
                        <View
                          style={[
                            styles.addedBadge,
                            {
                              backgroundColor: colors.primary,
                            },
                          ]}
                        >
                          <Check size={14} color={colors.primaryContrast} strokeWidth={3} />
                          <Text
                            style={[
                              styles.addedBadgeText,
                              { color: colors.primaryContrast },
                            ]}
                          >
                            Added
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.addBtnPill,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Plus size={14} color={colors.textPrimary} strokeWidth={2.5} />
                          <Text style={[styles.addBtnPillText, { color: colors.textPrimary }]}>
                            Add
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  previewPoster: {
    width: 44,
    height: 64,
    borderRadius: RADIUS.xs,
    backgroundColor: '#1E2536',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 12,
  },
  scrollBody: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  createListPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: SPACING.lg,
  },
  createListPromptText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineCreateBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  inlineCreateTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  createInput: {
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  inlineCreateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitCreateBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
  submitCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  loaderWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 8,
    fontSize: 13,
  },
  emptyStateWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    textAlign: 'center',
  },
  listsContainer: {
    gap: 10,
    paddingBottom: 24,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
  },
  listRowInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  listRowName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  listRowCount: {
    fontSize: 12,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  addBtnPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
