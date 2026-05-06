import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { colors, radius, shadow, spacing } from '../../ui/theme';

type HomeScreenProps = {
  onOpenChat: (contactId: string) => void;
  onAddFriend: () => void;
};

export function HomeScreen({ onOpenChat, onAddFriend }: HomeScreenProps) {
  const contacts = useAppStore((state) => state.contacts);
  const setContacts = useAppStore((state) => state.setContacts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .contacts()
      .then((result) => setContacts(result.contacts))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法加载通讯录。'))
      .finally(() => setLoading(false));
  }, [setContacts]);

  return (
    <View style={styles.root}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryKicker}>伙伴图鉴</Text>
        <Text style={styles.summaryTitle}>{contacts.length} 位伙伴已连接</Text>
        <Text style={styles.summaryCopy}>NFC 卡片和手动邀请都会把伙伴加入这里。点头像卡片就能开聊。</Text>
      </View>

      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Pressable style={styles.emptyCard} onPress={onAddFriend}>
            <Text style={styles.emptyTitle}>通讯录还是空的</Text>
            <Text style={styles.emptyCopy}>点右上角 +，扫描 NFC 卡片或输入邀请内容。</Text>
          </Pressable>
        }
        renderItem={({ item, index }) => (
          <Pressable style={styles.contactCard} onPress={() => onOpenChat(item.id)}>
            <Avatar label={item.avatar || item.displayName} imageUrl={item.avatarUrl} size={54} accent={index % 2 === 0 ? 'mint' : 'lavender'} />
            <View style={styles.contactBody}>
              <Text style={styles.contactName}>{item.displayName}</Text>
              <Text style={styles.contactHint}>{item.username ? `@${item.username}` : item.phone ?? item.id}</Text>
            </View>
            <Text style={styles.chatPill}>聊天</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  summaryCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, backgroundColor: '#fff1f7', borderWidth: 2, borderColor: '#ffd4e4', ...shadow },
  summaryKicker: { color: colors.coral, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 4 },
  summaryCopy: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs, fontWeight: '700' },
  list: { paddingBottom: spacing.xl },
  error: { color: colors.danger, fontWeight: '800', marginBottom: spacing.sm },
  emptyCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.line, ...shadow },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  emptyCopy: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20, fontWeight: '700' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(255,255,255,0.94)', overflow: 'hidden', ...shadow },
  contactBody: { flex: 1, minWidth: 0 },
  contactName: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  contactHint: { color: colors.muted, marginTop: 3, fontWeight: '700' },
  chatPill: { flexShrink: 0, overflow: 'hidden', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.lemon, color: colors.ink, fontWeight: '900' }
});
