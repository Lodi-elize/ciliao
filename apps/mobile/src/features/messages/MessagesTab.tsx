import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../../api/types';
import { useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { colors, fonts, radius, shadow, spacing } from '../../ui/theme';
import { formatBeijingTime } from '../../ui/time';

type MessagesTabProps = {
  onOpenChat: (contactId: string) => void;
  onAddFriend: () => void;
};

export function MessagesTab({ onOpenChat, onAddFriend }: MessagesTabProps) {
  const contacts = useAppStore((state) => state.contacts);
  const messagesByContact = useAppStore((state) => state.messagesByContact);

  const rows = contacts.map((contact) => {
    const messages = messagesByContact[contact.id] ?? [];
    const last = messages[messages.length - 1];
    return { contact, lastText: last?.text ?? '贴贴卡片后，从这里开始聊天。', time: last?.createdAt };
  });

  return (
    <View style={styles.root}>
      <View style={styles.heroCard}>
        <View style={styles.sparkle}>
          <Text style={styles.sparkleText}>NFC</Text>
        </View>
        <Text style={styles.heroTitle}>今日也要和伙伴连线</Text>
        <Text style={styles.heroCopy}>消息会在这里排队出现。现在先从通讯录伙伴开始聊天，NFC 加好友在右上角。</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.contact.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Pressable style={styles.emptyCard} onPress={onAddFriend}>
            <Text style={styles.emptyTitle}>还没有聊天伙伴</Text>
            <Text style={styles.emptyCopy}>点右上角 +，用 NFC 卡片或手动邀请添加第一位伙伴。</Text>
          </Pressable>
        }
        renderItem={({ item, index }) => (
          <MessageRow item={item.contact} lastText={item.lastText} time={item.time} index={index} onPress={() => onOpenChat(item.contact.id)} />
        )}
      />
    </View>
  );
}

function MessageRow({
  item,
  lastText,
  time,
  index,
  onPress
}: {
  item: UserProfile;
  lastText: string;
  time?: string;
  index: number;
  onPress: () => void;
}) {
  const accent = index % 3 === 0 ? 'coral' : index % 3 === 1 ? 'sky' : 'lavender';
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar label={item.avatar || item.displayName} imageUrl={item.avatarUrl} accent={accent} size={56} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.time}>{time ? formatShortTime(time) : '刚刚'}</Text>
        </View>
        <Text numberOfLines={1} style={styles.preview}>{lastText}</Text>
      </View>
    </Pressable>
  );
}

function formatShortTime(value: string) {
  return formatBeijingTime(value);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroCard: { marginBottom: spacing.md, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.ink, overflow: 'hidden', ...shadow },
  sparkle: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: colors.lemon },
  sparkleText: { color: colors.ink, fontWeight: '900' },
  heroTitle: { color: colors.paper, fontFamily: fonts.display, fontSize: 24, fontWeight: '900', marginTop: spacing.md },
  heroCopy: { color: '#e8ddff', lineHeight: 20, marginTop: spacing.xs, fontWeight: '700' },
  list: { paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: 'rgba(255,255,255,0.92)', overflow: 'hidden', ...shadow },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, fontWeight: '900' },
  time: { flexShrink: 0, color: colors.muted, fontSize: 12, fontWeight: '700' },
  preview: { color: colors.muted, marginTop: 4, fontWeight: '700' },
  emptyCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.line, ...shadow },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  emptyCopy: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20, fontWeight: '700' }
});
