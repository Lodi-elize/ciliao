import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from './theme';
import { modalStyles } from './modal';

type FeedbackKind = 'success' | 'error' | 'info';

export type FeedbackDialogState = {
  kind: FeedbackKind;
  title: string;
  message: string;
};

type FeedbackDialogProps = {
  feedback: FeedbackDialogState | null;
  onClose: () => void;
};

export function FeedbackDialog({ feedback, onClose }: FeedbackDialogProps) {
  return (
    <Modal visible={feedback !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[modalStyles.backdrop, modalStyles.centeredBackdrop]}>
        <Pressable accessibilityLabel="关闭提示" style={modalStyles.scrim} onPress={onClose} />
        <View style={modalStyles.dialogSurface}>
          <View style={[styles.chip, getChipStyle(feedback?.kind)]}>
            <Text style={styles.chipText}>{getChipText(feedback?.kind)}</Text>
          </View>
          <Text style={styles.title}>{feedback?.title}</Text>
          <Text style={styles.copy}>{feedback?.message}</Text>
          <Pressable style={[modalStyles.button, modalStyles.buttonDark, styles.action]} onPress={onClose}>
            <Text style={modalStyles.buttonTextPaper}>知道了</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function getChipText(kind?: FeedbackKind) {
  if (kind === 'success') return '完成';
  if (kind === 'error') return '需要处理';
  return '提示';
}

function getChipStyle(kind?: FeedbackKind) {
  if (kind === 'success') return styles.successChip;
  if (kind === 'error') return styles.errorChip;
  return styles.infoChip;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  successChip: { backgroundColor: colors.lemon },
  errorChip: { backgroundColor: '#f6d4d6' },
  infoChip: { backgroundColor: '#d9f4ff' },
  chipText: { color: colors.ink, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: spacing.sm },
  copy: { color: colors.muted, marginTop: spacing.sm, lineHeight: 20, fontWeight: '700' },
  action: { marginTop: spacing.lg }
});
