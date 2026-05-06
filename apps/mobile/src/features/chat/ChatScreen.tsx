import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { ChatMessage, UserProfile } from '../../api/types';
import { useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { colors, radius, shadow, spacing } from '../../ui/theme';
import { formatBeijingTime } from '../../ui/time';
import { sendSocketMessage } from './socket';

type ChatScreenProps = {
  contactId: string;
  onBack: () => void;
};

const EMPTY_MESSAGES: ChatMessage[] = [];

export function ChatScreen({ contactId, onBack }: ChatScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const contacts = useAppStore((state) => state.contacts);
  const messages = useAppStore((state) => state.messagesByContact[contactId] ?? EMPTY_MESSAGES);
  const setMessages = useAppStore((state) => state.setMessages);
  const addMessage = useAppStore((state) => state.addMessage);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const contact = useMemo<UserProfile | undefined>(() => contacts.find((item) => item.id === contactId), [contactId, contacts]);

  useEffect(() => {
    if (!currentUser || !contactId) return;
    api
      .messages(contactId)
      .then((result) => setMessages(contactId, result.messages))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法加载聊天记录。'));
  }, [contactId, currentUser, setMessages]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const send = async () => {
    if (!currentUser || !contactId || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setError(null);
    setSending(true);
    try {
      let message: ChatMessage;
      try {
        message = await sendSocketMessage({ recipientId: contactId, text });
      } catch {
        const result = await api.sendMessage(contactId, text);
        message = result.message;
      }
      addMessage(message, currentUser.id);
    } catch (cause) {
      setDraft(text);
      setError(cause instanceof Error ? cause.message : '消息发送失败，请检查后端或网络。');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.backdropA} />
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <View style={styles.backChevron} />
        </Pressable>
        <Avatar label={contact?.avatar || contact?.displayName || contactId} imageUrl={contact?.avatarUrl} size={48} accent="lavender" />
        <View style={styles.headerText}>
          <Text style={styles.title}>{contact?.displayName ?? contactId}</Text>
          <Text style={styles.subtitle}>一对一文字聊天</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>还没有聊天记录，发一句打个招呼吧。</Text>}
        renderItem={({ item }) => {
          const mine = item.senderId === currentUser?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={mine ? styles.mineText : styles.theirsText}>{item.text}</Text>
              <Text style={mine ? styles.mineTime : styles.theirsTime}>{formatMessageTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="输入消息"
          placeholderTextColor="#9a8caf"
          style={styles.input}
          editable={!sending}
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.disabledButton]} onPress={send} disabled={!draft.trim() || sending}>
          <Text style={styles.sendText}>{sending ? '...' : '发送'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatMessageTime(value: string) {
  return formatBeijingTime(value);
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, overflow: 'hidden', backgroundColor: '#f9f1ff' },
  backdropA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#c7f3ff', top: -82, right: -60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.md, overflow: 'hidden' },
  backButton: { flexShrink: 0, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, ...shadow },
  backChevron: {
    width: 13,
    height: 13,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: colors.lemon,
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 2, fontWeight: '700' },
  error: { color: colors.danger, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { flexGrow: 1, gap: spacing.sm, padding: spacing.md },
  empty: { marginTop: spacing.xl, textAlign: 'center', color: colors.muted, fontWeight: '800' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, padding: spacing.md, ...shadow },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.coral },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.panel },
  mineText: { color: 'white', fontSize: 16, fontWeight: '700' },
  theirsText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  mineTime: { color: '#ffeaf0', fontSize: 11, marginTop: 4, fontWeight: '800' },
  theirsTime: { color: colors.muted, fontSize: 11, marginTop: 4, fontWeight: '800' },
  composer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.82)', borderTopWidth: 1, borderTopColor: colors.line, overflow: 'hidden' },
  input: { flex: 1, minWidth: 0, borderRadius: radius.lg, backgroundColor: 'white', paddingHorizontal: spacing.md, minHeight: 46, color: colors.ink, fontWeight: '800' },
  sendButton: { flexShrink: 0, borderRadius: radius.lg, backgroundColor: colors.ink, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  sendText: { color: colors.lemon, fontWeight: '900' }
});
