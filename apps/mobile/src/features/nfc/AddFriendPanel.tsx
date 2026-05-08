import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { useAppStore } from '../../state/appStore';
import { colors, radius, shadow, spacing } from '../../ui/theme';
import { parseInvitePayload } from './invite';

type NfcModule = typeof import('./nfcService');

type AddFriendPanelProps = {
  onDone?: () => void;
};

export function AddFriendPanel({ onDone }: AddFriendPanelProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const [manualPayload, setManualPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<Awaited<ReturnType<typeof api.searchFriend>>['user'] | null>(null);

  const addFromPayload = async (payload: string) => {
    if (!currentUser || loading) return;
    setLoading(true);
    try {
      const invite = parseInvitePayload(payload);
      const resolved = await api.resolveInvite(invite.userId);
      await api.createFriendRequest(resolved.user.id);
      Alert.alert('申请已发送', `已向 ${resolved.user.displayName} 发送好友申请。`);
      onDone?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法添加好友。';
      Alert.alert('添加好友失败', message);
    } finally {
      setLoading(false);
    }
  };

  const searchManualFriend = async () => {
    if (!currentUser || loading) return;
    const query = manualPayload.trim();
    if (!query) {
      Alert.alert('请输入内容', '可以输入对方的 username、ID 或手机号。');
      return;
    }
    setLoading(true);
    try {
      const result = await api.searchFriend(query);
      setSearchedUser(result.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : '没有找到这个用户。';
      setSearchedUser(null);
      Alert.alert('查找失败', message);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!searchedUser || loading) return;
    setLoading(true);
    try {
      await api.createFriendRequest(searchedUser.id);
      Alert.alert('申请已发送', `已向 ${searchedUser.displayName} 发送好友申请。`);
      onDone?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法发送好友申请。';
      Alert.alert('发送失败', message);
    } finally {
      setLoading(false);
    }
  };

  const scanNfc = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('网页端暂不支持 NFC', '在浏览器测试时，请使用手动邀请内容。');
      return;
    }

    try {
      const nfc: NfcModule = await import('./nfcService');
      const payload = await nfc.readNfcInvitePayload();
      setManualPayload(payload);
      try {
        const invite = parseInvitePayload(payload);
        void recordNfcReadEvent({
          status: 'SUCCESS',
          rawPayload: payload,
          parsedUserId: invite.userId,
          payloadType: 'invite'
        });
      } catch (error) {
        void recordNfcReadEvent({
          status: 'FAILURE',
          rawPayload: payload,
          payloadType: 'unknown',
          errorCode: 'NFC_PAYLOAD_INVALID',
          errorMessage: getErrorMessage(error)
        });
      }
      await addFromPayload(payload);
    } catch (error) {
      const message = getErrorMessage(error);
      void recordNfcReadEvent({
        status: 'FAILURE',
        payloadType: 'unknown',
        errorCode: getNfcErrorCode(error),
        errorMessage: message
      });
      Alert.alert('NFC 扫描失败', message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NFC Link</Text>
      </View>
      <Text style={styles.title}>贴一下卡片，伙伴就位</Text>
      <Text style={styles.copy}>扫描写有邀请的 NFC 卡片；也可以输入对方 username、ID 或手机号发送好友申请。</Text>
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
          <Pressable style={[styles.sendButton, loading ? styles.disabledButton : null]} onPress={sendFriendRequest} disabled={loading}>
            <Text style={styles.sendText}>发送申请</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={scanNfc} disabled={loading}>
          <Text style={styles.primaryText}>扫描 NFC</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={searchManualFriend} disabled={loading}>
          <Text style={styles.secondaryText}>查找用户</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator /> : null}
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
  card: { gap: spacing.md, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, ...shadow },
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
  secondaryText: { color: colors.paper, fontWeight: '900' }
});
