import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../ui/Avatar';
import { modalStyles } from '../../ui/modal';
import { colors, radius, spacing } from '../../ui/theme';
import type { useNfcInviteLaunch } from './useNfcInviteLaunch';

type NfcInviteLaunchDialogProps = ReturnType<typeof useNfcInviteLaunch>;

export function NfcInviteLaunchDialog({ dialogState, dismissDialog, sendInviteRequest }: NfcInviteLaunchDialogProps) {
  const visible = dialogState !== null;
  const user = dialogState && 'user' in dialogState ? dialogState.user : undefined;
  const isSending = dialogState?.kind === 'sending';
  const isSuccess = dialogState?.kind === 'success';
  const isFailure = dialogState?.kind === 'failure';

  const title =
    dialogState?.kind === 'confirm'
      ? 'NFC 好友邀请'
      : dialogState?.kind === 'sending'
        ? '正在发送申请'
        : dialogState?.kind === 'success'
          ? '申请已发送'
          : dialogState?.title;

  const message =
    dialogState?.kind === 'confirm'
      ? `是否向 ${dialogState.user.displayName} 发送好友申请？`
      : dialogState?.kind === 'sending'
        ? `正在向 ${dialogState.user.displayName} 发送好友申请。`
        : dialogState?.message;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissDialog}>
      <View style={[modalStyles.backdrop, modalStyles.centeredBackdrop]}>
        <View style={[modalStyles.dialogSurface, styles.surface]}>
          <View style={[styles.statusPill, isSuccess ? styles.successPill : isFailure ? styles.failurePill : styles.invitePill]}>
            <Text style={styles.statusText}>{isSuccess ? '成功' : isFailure ? '提示' : 'NFC'}</Text>
          </View>

          {user ? (
            <View style={styles.profileRow}>
              <Avatar label={user.avatar || user.displayName} imageUrl={user.avatarUrl} size={58} accent={isFailure ? 'coral' : 'mint'} />
              <View style={styles.profileBody}>
                <Text style={styles.name}>{user.displayName}</Text>
                <Text style={styles.identity}>{user.username ? `@${user.username}` : user.phone ?? user.id}</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.copy}>{message}</Text>

          {isSending ? (
            <View style={styles.sendingBox}>
              <ActivityIndicator />
              <Text style={styles.sendingText}>请稍候...</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {dialogState?.kind === 'confirm' || (dialogState?.kind === 'failure' && user) ? (
              <Pressable style={[styles.button, styles.primaryButton]} onPress={sendInviteRequest}>
                <Text style={styles.primaryText}>{dialogState.kind === 'confirm' ? '发送申请' : '重新发送'}</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.button, dialogState?.kind === 'confirm' ? styles.secondaryButton : styles.darkButton]} onPress={dismissDialog}>
              <Text style={dialogState?.kind === 'confirm' ? styles.secondaryText : styles.darkText}>{dialogState?.kind === 'confirm' ? '取消' : '知道了'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  surface: { gap: spacing.md },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  invitePill: { backgroundColor: colors.lemon },
  successPill: { backgroundColor: '#d7f8ea' },
  failurePill: { backgroundColor: '#ffe1e5' },
  statusText: { color: colors.ink, fontWeight: '900' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.sm,
    backgroundColor: '#f8f1ff',
    borderWidth: 1,
    borderColor: colors.line
  },
  profileBody: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  identity: { color: colors.muted, marginTop: 2, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '900' },
  copy: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  sendingBox: {
    minHeight: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#d7edff'
  },
  sendingText: { color: colors.muted, fontWeight: '800' },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButton: { backgroundColor: colors.coral },
  secondaryButton: { backgroundColor: '#fff4f0', borderWidth: 1, borderColor: '#ffd3c5' },
  darkButton: { backgroundColor: colors.ink },
  primaryText: { color: 'white', fontWeight: '900' },
  secondaryText: { color: colors.ink, fontWeight: '900' },
  darkText: { color: colors.paper, fontWeight: '900' }
});
