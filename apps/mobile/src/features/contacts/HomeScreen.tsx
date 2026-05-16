import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { FeedbackDialog, FeedbackDialogState } from '../../ui/FeedbackDialog';
import { colors, radius, shadow, spacing } from '../../ui/theme';

type HomeScreenProps = {
  onOpenChat: (contactId: string) => void;
  onAddFriend: () => void;
};

export function HomeScreen({ onOpenChat, onAddFriend }: HomeScreenProps) {
  const contacts = useAppStore((state) => state.contacts);
  const incomingFriendRequests = useAppStore((state) => state.incomingFriendRequests);
  const setContacts = useAppStore((state) => state.setContacts);
  const setIncomingFriendRequests = useAppStore((state) => state.setIncomingFriendRequests);
  const removeIncomingFriendRequest = useAppStore((state) => state.removeIncomingFriendRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDialogState | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.contacts(), api.incomingFriendRequests()])
      .then(([contactsResult, requestsResult]) => {
        setContacts(contactsResult.contacts);
        setIncomingFriendRequests(requestsResult.requests.filter((request) => request.status === 'PENDING'));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法加载通讯录。'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [setContacts, setIncomingFriendRequests]);

  const acceptRequest = async (requestId: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await api.acceptFriendRequest(requestId);
      setContacts(result.contacts);
      removeIncomingFriendRequest(requestId);
      setFeedback({ kind: 'success', title: '已同意', message: '你们现在可以开始聊天了。' });
    } catch (cause) {
      setFeedback({ kind: 'error', title: '处理失败', message: cause instanceof Error ? cause.message : '无法同意好友申请。' });
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId: number) => {
    if (loading) return;
    setLoading(true);
    try {
      await api.rejectFriendRequest(requestId);
      removeIncomingFriendRequest(requestId);
      setFeedback({ kind: 'success', title: '已拒绝', message: '好友申请已处理。' });
    } catch (cause) {
      setFeedback({ kind: 'error', title: '处理失败', message: cause instanceof Error ? cause.message : '无法拒绝好友申请。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryKicker}>伙伴图鉴</Text>
        <Text style={styles.summaryTitle}>{contacts.length} 位伙伴已连接</Text>
        <Text style={styles.summaryCopy}>NFC 卡片和手动邀请都会把伙伴加入这里。点头像卡片就能开聊。</Text>
      </View>

      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {incomingFriendRequests.length > 0 ? (
        <View style={styles.requestPanel}>
          <View style={styles.requestHeader}>
            <Text style={styles.requestTitle}>好友申请</Text>
            <Pressable onPress={loadData} disabled={loading}>
              <Text style={styles.refreshText}>刷新</Text>
            </Pressable>
          </View>
          {incomingFriendRequests.map((request, index) => (
            <View key={request.id} style={styles.requestCard}>
              <Avatar label={request.requester.avatar || request.requester.displayName} imageUrl={request.requester.avatarUrl} size={46} accent={index % 2 === 0 ? 'mint' : 'lavender'} />
              <View style={styles.requestBody}>
                <Text style={styles.requestName}>{request.requester.displayName}</Text>
                <Text style={styles.requestHint}>{request.requester.username ? `@${request.requester.username}` : request.requester.phone ?? request.requester.id}</Text>
              </View>
              <View style={styles.requestActions}>
                <Pressable style={[styles.requestButton, styles.acceptButton]} onPress={() => acceptRequest(request.id)} disabled={loading}>
                  <Text style={styles.acceptText}>同意</Text>
                </Pressable>
                <Pressable style={[styles.requestButton, styles.rejectButton]} onPress={() => rejectRequest(request.id)} disabled={loading}>
                  <Text style={styles.rejectText}>拒绝</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Pressable style={styles.emptyCard} onPress={onAddFriend}>
            <Text style={styles.emptyTitle}>通讯录还是空的</Text>
            <Text style={styles.emptyCopy}>点右上角 +，扫描 NFC 卡片，或输入 username、ID、手机号发送好友申请。</Text>
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
      <FeedbackDialog feedback={feedback} onClose={() => setFeedback(null)} />
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
  requestPanel: { gap: spacing.sm, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md, backgroundColor: '#f4fffa', borderWidth: 2, borderColor: '#b8f0db', ...shadow },
  requestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  requestTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  refreshText: { color: colors.coral, fontWeight: '900' },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, padding: spacing.sm, backgroundColor: 'white' },
  requestBody: { flex: 1, minWidth: 0 },
  requestName: { color: colors.ink, fontWeight: '900' },
  requestHint: { color: colors.muted, marginTop: 2, fontWeight: '700' },
  requestActions: { flexDirection: 'row', flexShrink: 0, gap: spacing.xs },
  requestButton: { minHeight: 34, borderRadius: radius.md, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  acceptButton: { backgroundColor: colors.ink },
  rejectButton: { backgroundColor: '#f3e8ff' },
  acceptText: { color: colors.paper, fontWeight: '900' },
  rejectText: { color: colors.ink, fontWeight: '900' },
  emptyCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.line, ...shadow },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  emptyCopy: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20, fontWeight: '700' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(255,255,255,0.94)', overflow: 'hidden', ...shadow },
  contactBody: { flex: 1, minWidth: 0 },
  contactName: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  contactHint: { color: colors.muted, marginTop: 3, fontWeight: '700' },
  chatPill: { flexShrink: 0, overflow: 'hidden', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.lemon, color: colors.ink, fontWeight: '900' }
});
