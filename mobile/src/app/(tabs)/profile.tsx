import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Image,
  Modal,
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
  BarChart3,
  Check,
  ChevronRight,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Button } from '../../components/common/Button';
import { BulkImportModal } from '../../components/profile/BulkImportModal';
import { useAuth } from '../../context/AuthContext';
import { useWatchHistory } from '../../context/WatchHistoryContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

const BATMAN_AVATAR = require('../../../assets/images/batman-avatar.jpg');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { stats, fetchHistory } = useWatchHistory();
  const { showSuccess, showError, showInfo } = useToast();
  const { theme, colors, setTheme, themes } = useTheme();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const scrollViewRef = useRef<any>(null);


  // Double click navbar icon listener: refresh page and reset to default
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVBAR_DOUBLE_TAP', (event) => {
      if (event?.tab === 'profile') {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        setIsLogoutModalOpen(false);
        setShowPasswordModal(false);
        setIsThemeModalOpen(false);
        setIsBulkImportOpen(false);
        fetchHistory();
      }
    });
    return () => {
      sub.remove();
    };
  }, [fetchHistory]);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    await logout();
    showSuccess('Signed out successfully');
    router.replace('/(auth)/login');
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      showError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    setIsChangingPass(true);
    try {
      await updateProfile({ password: newPassword });
      showSuccess('Password updated successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      showError(e.message || 'Failed to update password');
    } finally {
      setIsChangingPass(false);
    }
  };

  const currentThemeMeta = themes.find((t) => t.id === theme) || themes[0];
  const username = user?.username || 'Alex';
  const email = user?.email || 'alex@example.com';
  const memberSince = 'Member since 2024';

  const watchedCount = stats.totalCount;
  const moviesCount = stats.movieCount;
  const seriesCount = stats.seriesCount;
  const favoritesCount = stats.favoriteCount;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top Header: Profile Title */}
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Profile</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 104 },
        ]}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            <Image
              source={BATMAN_AVATAR}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{username}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{email}</Text>
          <Text style={[styles.memberSince, { color: colors.textSecondary }]}>{memberSince}</Text>
        </View>

        {/* 4 Stat Boxes Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{watchedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Watched</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{moviesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Movies</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{seriesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TV Shows</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{favoritesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Favourites</Text>
          </View>
        </View>

        {/* Menu Navigation List */}
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Appearance & Theme (New option like website) */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setIsThemeModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryMuted }]}>
                <Palette size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Appearance & Theme</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                  {currentThemeMeta.name} • Tap to change theme
                </Text>
              </View>
            </View>
            <View style={styles.themeIndicatorRight}>
              <View
                style={[
                  styles.themeCirclePreview,
                  { backgroundColor: colors.primary, borderColor: colors.borderLight },
                ]}
              />
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Account Settings */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: colors.surface }]}>
                <Lock size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Account Settings</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>Change password & security</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* AI Filter */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/aifilter' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Sparkles size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>AI Filter</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>Get personalised recommendations</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Statistics */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/statistics' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <BarChart3 size={18} color="#A855F7" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Statistics</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>Your watch history analytics</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Bulk Import CSV */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setIsBulkImportOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <FileSpreadsheet size={18} color="#22C55E" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Bulk Import CSV</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>Import movies & series via CSV format</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => showInfo('MyWatchedLists v1.0.0 — Powered by TMDB & Gemini AI')}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: colors.surface }]}>
                <HelpCircle size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Help & Support</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>About, version & licenses</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomWidth: 0 }]}
            onPress={() => setIsLogoutModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <LogOut size={18} color={colors.danger} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.danger }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Change Password Inline Modal */}
        {showPasswordModal && (
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change Password</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <TextInput
              style={[
                styles.modalInput,
                {
                  marginTop: SPACING.xs,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password (min 6 characters)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setShowPasswordModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={isChangingPass ? 'Updating...' : 'Update Password'}
                variant="primary"
                size="sm"
                onPress={handleChangePassword}
                isLoading={isChangingPass}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={isThemeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsThemeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.themeModalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.themeModalHeader}>
              <View>
                <Text style={[styles.themeModalTitle, { color: colors.textPrimary }]}>
                  Choose Theme
                </Text>
                <Text style={[styles.themeModalSubtitle, { color: colors.textMuted }]}>
                  Personalize your interface style & colors
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsThemeModalOpen(false)}
                style={[styles.closeIconBtn, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* List of Themes */}
            <ScrollView
              style={styles.themeScrollList}
              showsVerticalScrollIndicator={false}
            >
              {themes.map((t) => {
                const isActive = theme === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.themeRowCard,
                      {
                        backgroundColor: isActive ? colors.surface : 'transparent',
                        borderColor: isActive ? t.accent : colors.border,
                      },
                    ]}
                    onPress={async () => {
                      await setTheme(t.id);
                      showSuccess(`Theme changed to ${t.name}`);
                    }}
                    activeOpacity={0.75}
                  >
                    {/* Visual Color Preview Swatch */}
                    <View
                      style={[
                        styles.themePreviewBox,
                        {
                          backgroundColor: t.color,
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.themeAccentDot,
                          {
                            backgroundColor: t.accent,
                          },
                        ]}
                      />
                    </View>

                    {/* Theme Info */}
                    <View style={styles.themeInfoCol}>
                      <View style={styles.themeNameRow}>
                        <Text style={[styles.themeNameText, { color: colors.textPrimary }]}>
                          {t.name}
                        </Text>
                        {t.tag && (
                          <View
                            style={[
                              styles.themeBadgePill,
                              { backgroundColor: t.accent },
                            ]}
                          >
                            <Text
                              style={[
                                styles.themeBadgeText,
                                { color: t.id === 'neon' || t.id === 'noir' ? '#000000' : '#FFFFFF' },
                              ]}
                            >
                              {t.tag}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.themeDescText, { color: colors.textMuted }]}>
                        {t.description}
                      </Text>
                    </View>

                    {/* Active Checkmark */}
                    <View style={styles.themeCheckCol}>
                      {isActive ? (
                        <View
                          style={[
                            styles.activeCheckCircle,
                            { backgroundColor: t.accent },
                          ]}
                        >
                          <Check
                            size={14}
                            color={t.id === 'neon' || t.id === 'noir' ? '#000000' : '#FFFFFF'}
                            strokeWidth={3}
                          />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.inactiveCheckCircle,
                            { borderColor: colors.borderLight },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title="Done"
              variant="primary"
              fullWidth
              onPress={() => setIsThemeModalOpen(false)}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={isLogoutModalOpen}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        isDanger
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        visible={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
      />
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1E2536',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  themeIndicatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeCirclePreview: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  modalBox: {
    backgroundColor: '#161B24',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modalInput: {
    backgroundColor: '#0B0E14',
    borderRadius: RADIUS.sm,
    color: '#FFFFFF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },

  /* Theme Selection Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  themeModalContent: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#121620',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  themeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  themeModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  themeModalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeScrollList: {
    maxHeight: 380,
  },
  themeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
  },
  themePreviewBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  themeAccentDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeInfoCol: {
    flex: 1,
  },
  themeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeNameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  themeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  themeDescText: {
    fontSize: 11,
    marginTop: 2,
  },
  themeCheckCol: {
    marginLeft: SPACING.sm,
  },
  activeCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
});
