import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AuthScreen } from './features/auth/AuthScreen';
import { ChangePasswordScreen } from './features/auth/ChangePasswordScreen';
import { ChatScreen } from './features/chat/ChatScreen';
import { useChatSocket } from './features/chat/socket';
import { HomeScreen } from './features/contacts/HomeScreen';
import { MessagesTab } from './features/messages/MessagesTab';
import { AddFriendPanel } from './features/nfc/AddFriendPanel';
import { NfcInviteLaunchDialog } from './features/nfc/NfcInviteLaunchDialog';
import { useNfcInviteLaunch } from './features/nfc/useNfcInviteLaunch';
import { MeTab } from './features/profile/MeTab';
import { ProfileSettingsScreen } from './features/profile/ProfileSettingsScreen';
import { AppShell, AppTab } from './features/shell/AppShell';
import { hydrateAppStore, useAppStore } from './state/appStore';
import { colors, layout, spacing } from './ui/theme';
import { getModalKeyboardAvoidingBehavior, modalStyles } from './ui/modal';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('messages');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const authStatus = useAppStore((state) => state.authStatus);
  const frameSize = usePhoneFrameSize();
  const statusBarPadding = useStatusBarPadding();
  const keyboardHeight = useKeyboardHeight();
  const phoneFrameStyle = [styles.phoneFrame, frameSize, { paddingTop: statusBarPadding }];
  const nfcInviteLaunch = useNfcInviteLaunch();
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
  const addFriendSheetMaxHeight = Math.floor(frameSize.height * (keyboardHeight > 0 ? 0.52 : 0.72));
  const addFriendSheetBottomInset = Math.min(keyboardHeight, Math.floor(frameSize.height * 0.42));

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
        <NfcInviteLaunchDialog {...nfcInviteLaunch} />
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
        <NfcInviteLaunchDialog {...nfcInviteLaunch} />
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
        <NfcInviteLaunchDialog {...nfcInviteLaunch} />
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
        <NfcInviteLaunchDialog {...nfcInviteLaunch} />
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
        <NfcInviteLaunchDialog {...nfcInviteLaunch} />
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
        <View style={modalStyles.backdrop}>
          <Pressable accessibilityLabel="关闭添加好友面板" style={modalStyles.scrim} onPress={() => setShowAddFriend(false)} />
          <View testID="modal-frame" style={[styles.modalPhoneFrame, frameSize]}>
            <KeyboardAvoidingView style={styles.modalKeyboardAvoider} behavior={getModalKeyboardAvoidingBehavior()}>
              <View style={[modalStyles.sheetWrap, { paddingBottom: spacing.md + addFriendSheetBottomInset }]}>
                <View style={[modalStyles.sheetSurface, { maxHeight: addFriendSheetMaxHeight }]}>
                  <View style={modalStyles.handle} />
                  <View style={modalStyles.header}>
                    <View style={modalStyles.titleGroup}>
                      <Text style={modalStyles.title}>添加伙伴</Text>
                      <Text style={modalStyles.copy}>扫描 NFC 卡片，或输入 username、ID、手机号。</Text>
                    </View>
                    <Pressable accessibilityLabel="关闭" style={modalStyles.closeButton} onPress={() => setShowAddFriend(false)}>
                      <Text style={modalStyles.closeText}>×</Text>
                    </Pressable>
                  </View>
                  <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetScroll}>
                    <AddFriendPanel onDone={() => setShowAddFriend(false)} />
                  </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
      <NfcInviteLaunchDialog {...nfcInviteLaunch} />
    </SafeAreaView>
  );
}

function useStatusBarPadding() {
  return Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0;
}

function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
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
  modalPhoneFrame: { justifyContent: 'flex-end', overflow: 'hidden' },
  modalKeyboardAvoider: { flex: 1, justifyContent: 'flex-end' },
  sheetScroll: { paddingBottom: spacing.xs }
});
