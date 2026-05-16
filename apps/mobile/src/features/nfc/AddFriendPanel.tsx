import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from '../../api/client';
import { useAppStore } from '../../state/appStore';
import { FeedbackDialog, FeedbackDialogState } from '../../ui/FeedbackDialog';
import { colors, radius, spacing } from '../../ui/theme';
import { getModalKeyboardAvoidingBehavior, modalStyles } from '../../ui/modal';
import { parseInvitePayload } from './invite';

type NfcModule = typeof import('./nfcService');

type AddFriendPanelProps = {
  onDone?: () => void;
};

type ScanResultState =
  | {
      kind: 'success';
      title: string;
      message: string;
    }
  | {
      kind: 'failure';
      title: string;
      message: string;
    };

type NfcPanelState =
  | {
      kind: 'idle';
    }
  | {
      kind: 'unsupported';
      message: string;
    };

export function AddFriendPanel({ onDone }: AddFriendPanelProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const [manualPayload, setManualPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPanelVisible, setScanPanelVisible] = useState(false);
  const [scanTrigger, setScanTrigger] = useState(0);
  const [nfcPanelState, setNfcPanelState] = useState<NfcPanelState>({ kind: 'idle' });
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDialogState | null>(null);
  const [searchedUser, setSearchedUser] = useState<Awaited<ReturnType<typeof api.searchFriend>>['user'] | null>(null);
  const scanTokenRef = useRef(0);

  const closeScanResult = () => {
    setScanResult(null);
  };

  const beginNfcScan = useCallback(async () => {
    if (!currentUser || !scanPanelVisible || busy || scanning || scanResult) return;

    const scanToken = ++scanTokenRef.current;
    setScanning(true);
    let rawPayload = '';

    try {
      if (Platform.OS === 'web') {
        if (scanTokenRef.current !== scanToken) return;
        setNfcPanelState({ kind: 'unsupported', message: '当前设备不支持 NFC 功能。' });
        return;
      }

      const nfc: NfcModule = await import('./nfcService');
      const supported = await nfc.isNfcSupported();
      if (scanTokenRef.current !== scanToken) return;
      if (!supported) {
        setNfcPanelState({ kind: 'unsupported', message: '当前设备不支持 NFC 功能。' });
        return;
      }

      rawPayload = await nfc.readNfcInvitePayload();
      if (scanTokenRef.current !== scanToken) return;

      setManualPayload(rawPayload);

      let invite: ReturnType<typeof parseInvitePayload>;
      try {
        invite = parseInvitePayload(rawPayload);
      } catch (error) {
        const message = getErrorMessage(error);
        void recordNfcReadEvent({
          status: 'FAILURE',
          rawPayload,
          payloadType: 'unknown',
          errorCode: 'NFC_PAYLOAD_INVALID',
          errorMessage: message
        });
        if (scanTokenRef.current !== scanToken) return;
        setScanResult({
          kind: 'failure',
          title: '扫描失败',
          message
        });
        return;
      }

      void recordNfcReadEvent({
        status: 'SUCCESS',
        rawPayload,
        parsedUserId: invite.userId,
        payloadType: 'invite'
      });

      const resolved = await api.resolveInvite(invite.userId);
      await api.createFriendRequest(resolved.user.id);
      if (scanTokenRef.current !== scanToken) return;

      setScanResult({
        kind: 'success',
        title: '扫描成功',
        message: `已识别到 ${resolved.user.displayName} 的邀请，好友申请已发送。`
      });
    } catch (error) {
      const message = getErrorMessage(error);
      void recordNfcReadEvent({
        status: 'FAILURE',
        rawPayload,
        payloadType: 'unknown',
        errorCode: getNfcErrorCode(error),
        errorMessage: message
      });
      if (scanTokenRef.current !== scanToken) return;
      setScanResult({
        kind: 'failure',
        title: '扫描失败',
        message
      });
    } finally {
      if (scanTokenRef.current === scanToken) {
        setScanning(false);
      }
    }
  }, [busy, currentUser, scanPanelVisible, scanResult, scanning]);

  const openScanPanel = () => {
    if (busy || scanning) return;
    setNfcPanelState({ kind: 'idle' });
    setScanResult(null);
    setScanPanelVisible(true);
    setScanTrigger((value) => value + 1);
  };

  const closeScanPanel = () => {
    scanTokenRef.current += 1;
    setScanning(false);
    setNfcPanelState({ kind: 'idle' });
    setScanResult(null);
    setScanPanelVisible(false);
  };

  const continueScanning = () => {
    if (busy || scanning) return;
    setNfcPanelState({ kind: 'idle' });
    setScanResult(null);
    setScanTrigger((value) => value + 1);
  };

  useEffect(() => {
    if (!scanPanelVisible || scanning || scanResult || scanTrigger === 0 || !currentUser) return;
    void beginNfcScan();
  }, [beginNfcScan, currentUser, scanPanelVisible, scanResult, scanTrigger, scanning]);

  const searchManualFriend = async () => {
    if (!currentUser || busy) return;
    const query = manualPayload.trim();
    if (!query) {
      setFeedback({ kind: 'info', title: '请输入内容', message: '可以输入对方的 username、ID 或手机号。' });
      return;
    }
    setBusy(true);
    try {
      const result = await api.searchFriend(query);
      setSearchedUser(result.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : '没有找到这个用户。';
      setSearchedUser(null);
      setFeedback({ kind: 'error', title: '查找失败', message });
    } finally {
      setBusy(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchedUser || busy) return;
    setBusy(true);
    try {
      await api.createFriendRequest(searchedUser.id);
      setFeedback({ kind: 'success', title: '申请已发送', message: `已向 ${searchedUser.displayName} 发送好友申请。` });
      setSearchedUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法发送好友申请。';
      setFeedback({ kind: 'error', title: '发送失败', message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NFC Link</Text>
      </View>
      <Text style={styles.title}>贴一下卡片，伙伴就位</Text>
      <Text style={styles.copy}>扫描带邀请的 NFC 卡片；也可以输入对方 username、ID 或手机号发送好友申请。</Text>
      <TextInput
        value={manualPayload}
        onChangeText={setManualPayload}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="输入 username、ID 或手机号"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {searchedUser ? (
        <View style={styles.resultCard}>
          <View style={styles.resultAvatar}>
            <Text style={styles.resultAvatarText}>{searchedUser.avatar || searchedUser.displayName.slice(0, 1)}</Text>
          </View>
          <View style={styles.resultBody}>
            <Text style={styles.resultName}>{searchedUser.displayName}</Text>
            <Text style={styles.resultHint}>{searchedUser.username ? `@${searchedUser.username}` : searchedUser.phone ?? searchedUser.id}</Text>
          </View>
          <Pressable style={[styles.sendButton, busy ? styles.disabledButton : null]} onPress={sendFriendRequest} disabled={busy}>
            <Text style={styles.sendText}>发送申请</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={openScanPanel} disabled={busy || scanning}>
          <Text style={styles.primaryText}>扫描 NFC</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={searchManualFriend} disabled={busy || scanning}>
          <Text style={styles.secondaryText}>查找用户</Text>
        </Pressable>
      </View>
      {busy ? <ActivityIndicator /> : null}

      <Modal visible={scanPanelVisible} transparent animationType="fade" onRequestClose={closeScanPanel}>
        <KeyboardAvoidingView style={modalStyles.backdrop} behavior={getModalKeyboardAvoidingBehavior()}>
          <Pressable accessibilityLabel="关闭 NFC 扫描面板" style={modalStyles.scrim} onPress={closeScanPanel} />
          <View style={modalStyles.frame}>
            <View style={styles.scanSheet}>
              <View style={modalStyles.handle} />
              <View style={modalStyles.header}>
                <View style={modalStyles.titleGroup}>
                  <Text style={modalStyles.title}>靠近 NFC</Text>
                  <Text style={modalStyles.copy}>
                    {nfcPanelState.kind === 'unsupported'
                      ? nfcPanelState.message
                      : scanning
                        ? '正在读取卡片内容，请保持手机贴近卡片。'
                        : '将邀请卡片贴近手机背面，读取完成后会自动弹出结果。'}
                  </Text>
                </View>
                <Pressable accessibilityLabel="关闭 NFC 扫描面板" style={modalStyles.closeButton} onPress={closeScanPanel}>
                  <Text style={modalStyles.closeText}>×</Text>
                </Pressable>
              </View>
              <View style={styles.scanStatus}>
                {nfcPanelState.kind === 'unsupported' ? null : scanning ? <ActivityIndicator /> : null}
                <Text style={styles.scanStatusText}>
                  {nfcPanelState.kind === 'unsupported' ? '当前设备不支持 NFC 功能' : scanning ? '扫描中...' : '等待扫描开始'}
                </Text>
              </View>
              <Pressable style={[modalStyles.button, modalStyles.buttonDark, styles.scanActionSpacing]} onPress={closeScanPanel}>
                <Text style={modalStyles.buttonTextPaper}>关闭面板</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={scanResult !== null} transparent animationType="fade" onRequestClose={closeScanResult}>
        <View style={[modalStyles.backdrop, modalStyles.centeredBackdrop]}>
          <View style={modalStyles.dialogSurface}>
            <View style={[styles.resultChip, scanResult?.kind === 'success' ? styles.successChip : styles.failureChip]}>
              <Text style={styles.resultChipText}>{scanResult?.kind === 'success' ? '成功' : '失败'}</Text>
            </View>
            <Text style={styles.resultTitle}>{scanResult?.title}</Text>
            <Text style={styles.resultCopy}>{scanResult?.message}</Text>
            <Pressable style={[modalStyles.button, modalStyles.buttonAccent, styles.resultActionSpacing]} onPress={continueScanning} disabled={scanning}>
              <Text style={modalStyles.buttonTextPaper}>继续扫描下一张</Text>
            </Pressable>
            <Pressable style={[modalStyles.button, modalStyles.buttonDark, styles.resultActionSpacingSmall]} onPress={closeScanResult}>
              <Text style={modalStyles.buttonTextPaper}>关闭结果</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <FeedbackDialog
        feedback={feedback}
        onClose={() => {
          const shouldClosePanel = feedback?.kind === 'success';
          setFeedback(null);
          if (shouldClosePanel) onDone?.();
        }}
      />
    </View>
  );
}

function recordNfcReadEvent(payload: Parameters<typeof api.recordNfcReadEvent>[0]) {
  return api.recordNfcReadEvent(payload).catch(() => undefined);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'NFC 扫描失败。';
}

function getNfcErrorCode(error: unknown) {
  if (!(error instanceof Error)) return 'NFC_READ_FAILED';
  const name = error.name || '';
  const message = error.message || '';
  if (/cancel/i.test(name) || /cancel|取消/i.test(message)) return 'NFC_CANCELLED';
  return 'NFC_READ_FAILED';
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: colors.lemon },
  badgeText: { color: colors.ink, fontWeight: '900' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '900', color: colors.ink },
  copy: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: '#f8f1ff', padding: spacing.md, borderWidth: 2, borderColor: colors.line, color: colors.ink, fontWeight: '700' },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: 'white', borderWidth: 2, borderColor: colors.line },
  resultAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lemon },
  resultAvatarText: { color: colors.ink, fontWeight: '900' },
  resultBody: { flex: 1, minWidth: 0 },
  resultName: { color: colors.ink, fontWeight: '900' },
  resultHint: { color: colors.muted, marginTop: 2, fontWeight: '700' },
  sendButton: { flexShrink: 0, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 9, backgroundColor: colors.coral },
  sendText: { color: 'white', fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flexGrow: 1, flexBasis: 160, minHeight: 48, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: colors.coral },
  secondaryButton: { backgroundColor: colors.ink },
  primaryText: { color: 'white', fontWeight: '900' },
  secondaryText: { color: colors.paper, fontWeight: '900' },
  scanSheet: {
    minHeight: '50%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.panel
  },
  scanStatus: {
    minHeight: 88,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line
  },
  scanStatusText: { color: colors.ink, fontWeight: '800' },
  scanActionSpacing: { marginTop: spacing.md },
  resultChip: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  successChip: { backgroundColor: colors.lemon },
  failureChip: { backgroundColor: '#f6d4d6' },
  resultChipText: { color: colors.ink, fontWeight: '900' },
  resultTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: spacing.sm },
  resultCopy: { color: colors.muted, marginTop: spacing.sm, lineHeight: 20, fontWeight: '700' },
  resultActionSpacing: { marginTop: spacing.lg },
  resultActionSpacingSmall: { marginTop: spacing.sm }
});
