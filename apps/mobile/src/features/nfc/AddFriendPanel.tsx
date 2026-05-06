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
  const setContacts = useAppStore((state) => state.setContacts);
  const [manualPayload, setManualPayload] = useState('nfcchat://add-friend?userId=bob');
  const [loading, setLoading] = useState(false);

  const addFromPayload = async (payload: string) => {
    if (!currentUser || loading) return;
    setLoading(true);
    try {
      const invite = parseInvitePayload(payload);
      const resolved = await api.resolveInvite(invite.userId);
      const result = await api.addContact(resolved.user.id);
      setContacts(result.contacts);
      Alert.alert('添加成功', `${resolved.user.displayName} 已加入你的通讯录。`);
      onDone?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法添加好友。';
      Alert.alert('添加好友失败', message);
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
      await addFromPayload(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'NFC 扫描失败。';
      Alert.alert('NFC 扫描失败', message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>NFC Link</Text>
      </View>
      <Text style={styles.title}>贴一下卡片，伙伴就位</Text>
      <Text style={styles.copy}>扫描写有邀请的 NFC 卡片；网页端测试时，可以直接粘贴邀请内容。</Text>
      <TextInput
        value={manualPayload}
        onChangeText={setManualPayload}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={scanNfc} disabled={loading}>
          <Text style={styles.primaryText}>扫描 NFC</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => addFromPayload(manualPayload)} disabled={loading}>
          <Text style={styles.secondaryText}>手动添加</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, ...shadow },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, backgroundColor: colors.lemon },
  badgeText: { color: colors.ink, fontWeight: '900' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '900', color: colors.ink },
  copy: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: '#f8f1ff', padding: spacing.md, borderWidth: 2, borderColor: colors.line, color: colors.ink, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flexGrow: 1, flexBasis: 160, minHeight: 48, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: colors.coral },
  secondaryButton: { backgroundColor: colors.ink },
  primaryText: { color: 'white', fontWeight: '900' },
  secondaryText: { color: colors.paper, fontWeight: '900' }
});
