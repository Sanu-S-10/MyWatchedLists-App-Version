import React, { useState } from 'react';
import {
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
import { Check, Film, Search, Tv, X } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../common/Button';
import { CustomList } from '../../types/customList';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { customListService } from '../../services/customListService';
import { useToast } from '../../context/ToastContext';
import { TMDB_IMAGE_BASE_W185 } from '../../config/env';

interface CreateListModalProps {
  visible: boolean;
  listToEdit?: CustomList | null;
  onClose: () => void;
  onSaved: (list: CustomList) => void;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({
  visible,
  listToEdit,
  onClose,
  onSaved,
}) => {
  const { history } = useWatchHistory();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [mediaFilter, setMediaFilter] = useState<'movie' | 'series'>('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (listToEdit) {
        setName(listToEdit.name || '');
        setDescription(listToEdit.description || '');
        const ids = new Set<string>();
        (listToEdit.items || []).forEach((item) => {
          if (item.watchItem) ids.add(item.watchItem);
        });
        setSelectedItemIds(ids);
      } else {
        setName('');
        setDescription('');
        setSelectedItemIds(new Set());
      }
      setSearchQuery('');
      setMediaFilter('movie');
    }
  }, [visible, listToEdit]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredHistory = history.filter((item) => {
    if (item.mediaType !== mediaFilter) return false;
    if (!searchQuery.trim()) return true;
    return item.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Please enter a list name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        itemIds: Array.from(selectedItemIds),
        isPublic: true,
      };

      let result: CustomList;
      if (listToEdit) {
        result = await customListService.updateCustomList(listToEdit._id, payload);
        showSuccess('List updated successfully!');
      } else {
        result = await customListService.createCustomList(payload);
        showSuccess('List created successfully!');
      }

      onSaved(result);
      onClose();
    } catch (e: any) {
      showError(e.message || 'Failed to save list');
    } finally {
      setIsSubmitting(false);
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
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {listToEdit ? 'Edit Custom List' : 'Create Custom List'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>List Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Favorite Sci-Fi Movies"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Description Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What makes this list special?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Item Selection Section */}
            <View style={styles.pickerSection}>
              <View style={styles.pickerHeaderRow}>
                <Text style={styles.fieldLabel}>
                  Select Titles ({selectedItemIds.size} selected)
                </Text>
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      mediaFilter === 'movie' && styles.typeBtnActive,
                    ]}
                    onPress={() => setMediaFilter('movie')}
                  >
                    <Film size={12} color={mediaFilter === 'movie' ? '#FFF' : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.typeBtnText,
                        mediaFilter === 'movie' && styles.typeBtnTextActive,
                      ]}
                    >
                      Movies
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      mediaFilter === 'series' && styles.typeBtnActive,
                    ]}
                    onPress={() => setMediaFilter('series')}
                  >
                    <Tv size={12} color={mediaFilter === 'series' ? '#FFF' : COLORS.textMuted} />
                    <Text
                      style={[
                        styles.typeBtnText,
                        mediaFilter === 'series' && styles.typeBtnTextActive,
                      ]}
                    >
                      Series
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search in history */}
              <View style={styles.searchRow}>
                <Search size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={`Search watched ${mediaFilter === 'movie' ? 'movies' : 'series'}...`}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* Items Horizontal / Grid Scroll */}
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No watched items available yet.</Text>
              ) : filteredHistory.length === 0 ? (
                <Text style={styles.emptyText}>No matching titles found.</Text>
              ) : (
                <View style={styles.itemsGrid}>
                  {filteredHistory.map((item) => {
                    const isSelected = selectedItemIds.has(item._id);
                    const posterUri = item.posterPath
                      ? `${TMDB_IMAGE_BASE_W185}${item.posterPath}`
                      : null;

                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[
                          styles.posterItem,
                          isSelected && styles.posterItemSelected,
                        ]}
                        onPress={() => toggleItem(item._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.posterWrapper}>
                          {posterUri ? (
                            <Image
                              source={{ uri: posterUri }}
                              style={styles.pickerPoster}
                            />
                          ) : (
                            <View style={styles.noPickerPoster}>
                              <Text style={styles.noPickerPosterText}>No Poster</Text>
                            </View>
                          )}
                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <Check size={14} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.sheetFooter}>
            <Button
              title="Cancel"
              variant="secondary"
              size="md"
              onPress={onClose}
              style={styles.footerBtn}
            />
            <Button
              title={listToEdit ? 'Save Changes' : 'Create List'}
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
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.xs + 2,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
  },
  pickerSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  typeBtnText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 40,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  posterItem: {
    width: '31%',
    marginBottom: SPACING.sm,
  },
  posterItemSelected: {
    opacity: 1,
  },
  posterWrapper: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerPoster: {
    width: '100%',
    height: '100%',
  },
  noPickerPoster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPickerPosterText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
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
