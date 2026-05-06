import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AuthScreen } from './features/auth/AuthScreen';
import { ChangePasswordScreen } from './features/auth/ChangePasswordScreen';
import { ChatScreen } from './features/chat/ChatScreen';
import { useChatSocket } from './features/chat/socket';
import { HomeScreen } from './features/contacts/HomeScreen';
import { MessagesTab } from './features/messages/MessagesTab';
import { AddFriendPanel } from './features/nfc/AddFriendPanel';
import { MeTab } from './features/profile/MeTab';
import { ProfileSettingsScreen } from './features/profile/ProfileSettingsScreen';
import { AppShell, AppTab } from './features/shell/AppShell';
import { hydrateAppStore, useAppStore } from './state/appStore';
import { colors, layout, radius, shadow, spacing } from './ui/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('messages');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const authStatus = useAppStore((state) => state.authStatus);
  const frameSize = usePhoneFrameSize();
  const statusBarPadding = useStatusBarPadding();
  const phoneFrameStyle = [styles.phoneFrame, frameSize, { paddingTop: statusBarPadding }];
  useChatSocket();

  useEffect(() => {
    void hydrateAppStore();
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setActiveContactId(null);
      setShowChangePassword(false);
      setShowProfileSettings(false);
      setShowAddFriend(false);
      setActiveTab('messages');
    }
  }, [authStatus]);

  const shellCopy = useMemo(() => getShellCopy(activeTab), [activeTab]);

  if (authStatus === 'hydrating') {
    return (
      <SafeAreaView style={styles.stage}>
        <StatusBar style="dark" />
        <View testID="app-frame" style={phoneFrameStyle}>
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>正在恢复登录状态...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (authStatus === 'anonymous') {
    return (
      <SafeAreaView style={styles.stage}>
        <StatusBar style="dark" />
        <View testID="app-frame" style={phoneFrameStyle}>
          <AuthScreen />
        </View>
      </SafeAreaView>
    );
  }

  if (showChangePassword) {
    return (
      <SafeAreaView style={styles.stage}>
        <StatusBar style="dark" />
        <View testID="app-frame" style={phoneFrameStyle}>
          <ChangePasswordScreen onBack={() => setShowChangePassword(false)} />
        </View>
      </SafeAreaView>
    );
  }

  if (showProfileSettings) {
    return (
      <SafeAreaView style={styles.stage}>
        <StatusBar style="dark" />
        <View testID="app-frame" style={phoneFrameStyle}>
          <ProfileSettingsScreen onBack={() => setShowProfileSettings(false)} />
        </View>
      </SafeAreaView>
    );
  }

  if (activeContactId) {
    return (
      <SafeAreaView style={styles.stage}>
        <StatusBar style="dark" />
        <View testID="app-frame" style={phoneFrameStyle}>
          <ChatScreen contactId={activeContactId} onBack={() => setActiveContactId(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.stage}>
      <StatusBar style="dark" />
      <View testID="app-frame" style={phoneFrameStyle}>
        <AppShell
          activeTab={activeTab}
          title={shellCopy.title}
          subtitle={shellCopy.subtitle}
          onTabChange={setActiveTab}
          onAddFriend={() => setShowAddFriend(true)}
        >
          {activeTab === 'messages' ? (
            <MessagesTab onOpenChat={setActiveContactId} onAddFriend={() => setShowAddFriend(true)} />
          ) : activeTab === 'contacts' ? (
            <HomeScreen onOpenChat={setActiveContactId} onAddFriend={() => setShowAddFriend(true)} />
          ) : (
            <MeTab onChangePassword={() => setShowChangePassword(true)} onProfileSettings={() => setShowProfileSettings(true)} />
          )}
        </AppShell>
      </View>
      <Modal visible={showAddFriend} transparent animationType="fade" onRequestClose={() => setShowAddFriend(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityLabel="关闭添加好友面板" style={styles.dismissLayer} onPress={() => setShowAddFriend(false)} />
          <View testID="modal-frame" style={[styles.modalPhoneFrame, frameSize]}>
            <Pressable accessibilityLabel="关闭添加好友面板" style={styles.dismissLayer} onPress={() => setShowAddFriend(false)} />
            <View style={styles.sheetWrap}>
            <View style={[styles.addFriendSheet, { maxHeight: Math.floor(frameSize.height * 0.86) }]}> 
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleGroup}>
                  <Text style={styles.sheetTitle}>添加伙伴</Text>
                  <Text style={styles.sheetCopy}>扫描 NFC 卡片，或粘贴邀请内容。</Text>
                </View>
                <Pressable accessibilityLabel="关闭" style={styles.closeButton} onPress={() => setShowAddFriend(false)}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                <AddFriendPanel onDone={() => setShowAddFriend(false)} />
              </ScrollView>
            </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function useStatusBarPadding() {
  return Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0;
}

function getShellCopy(tab: AppTab) {
  if (tab === 'contacts') {
    return { title: '通讯录', subtitle: '伙伴图鉴和开聊入口' };
  }
  if (tab === 'me') {
    return { title: '我的', subtitle: '账号、密码和会话设置' };
  }
  return { title: '消息', subtitle: '从最近的伙伴开始聊天' };
}

function usePhoneFrameSize() {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => ({
      width: Math.floor(Math.min(width, layout.phoneMaxWidth)),
      height: Math.floor(Math.min(height, layout.phoneMaxHeight))
    }),
    [height, width]
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#efe7ff' },
  phoneFrame: {
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: '#f9f1ff'
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.ink, fontWeight: '900' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,24,47,0.42)' },
  dismissLayer: { ...StyleSheet.absoluteFillObject },
  modalPhoneFrame: { justifyContent: 'flex-end', overflow: 'hidden' },
  sheetWrap: { width: '100%', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  addFriendSheet: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: '#fff9ff',
    ...shadow
  },
  sheetHandle: { alignSelf: 'center', width: 54, height: 5, borderRadius: radius.pill, marginBottom: spacing.md, backgroundColor: '#dbc9ef' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  sheetTitleGroup: { flex: 1, minWidth: 0 },
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  sheetCopy: { color: colors.muted, marginTop: 3, fontWeight: '700', lineHeight: 20 },
  sheetScroll: { paddingBottom: spacing.xs },
  closeButton: { flexShrink: 0, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  closeText: { color: colors.paper, fontSize: 26, lineHeight: 30, fontWeight: '900' }
});
