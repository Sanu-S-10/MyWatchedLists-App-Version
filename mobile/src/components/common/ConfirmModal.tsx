import React from 'react';
import { Modal, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmTitle?: string;
  confirmLabel?: string;
  cancelTitle?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmTitle,
  confirmLabel,
  cancelTitle,
  cancelLabel,
  isDanger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const effectiveConfirmText = confirmLabel || confirmTitle || 'Confirm';
  const effectiveCancelText = cancelLabel || cancelTitle || 'Cancel';
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <View style={styles.headerRow}>
                {isDanger && (
                  <View style={styles.warningIcon}>
                    <AlertTriangle size={22} color={COLORS.danger} />
                  </View>
                )}
                <Text style={styles.title}>{title}</Text>
              </View>

              <Text style={styles.message}>{message}</Text>

              <View style={styles.actionsRow}>
                <Button
                  title={effectiveCancelText}
                  variant="secondary"
                  size="md"
                  onPress={onCancel}
                  disabled={isLoading}
                  style={styles.actionButton}
                />
                <Button
                  title={effectiveConfirmText}
                  variant={isDanger ? 'danger' : 'primary'}
                  size="md"
                  onPress={onConfirm}
                  isLoading={isLoading}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  warningIcon: {
    marginRight: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
  },
});
