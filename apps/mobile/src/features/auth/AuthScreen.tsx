import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, api } from '../../api/client';
import { login, registerPhone, registerUsername } from '../../state/appStore';
import { colors, fonts, radius, shadow, spacing } from '../../ui/theme';

type AuthMode = 'login' | 'username' | 'phone';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('alice');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [code, setCode] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        assertPasswordMatch(password, confirmPassword);
        if (mode === 'username') {
          await registerUsername({ username, password, displayName });
        } else {
          await registerPhone({ phone, code, password, displayName });
        }
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async () => {
    if (!phone.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.requestMockSms({ phone });
      setMockCode(result.code);
      setCode(result.code);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>次聊</Text>
          <Text style={styles.title}>和二次元伙伴，贴卡开聊。</Text>
          <Text style={styles.copy}>本地账号、NFC 加好友、一对一文字聊天。先登录，再进入你的伙伴频道。</Text>
        </View>

        <View style={styles.tabs}>
          <Tab active={mode === 'login'} label="登录" onPress={() => setMode('login')} />
          <Tab active={mode === 'username'} label="用户名注册" onPress={() => setMode('username')} />
          <Tab active={mode === 'phone'} label="手机号注册" onPress={() => setMode('phone')} />
        </View>

        <View style={styles.card}>
          {mode === 'login' ? (
            <>
              <Label text="用户名或手机号" />
              <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" style={styles.input} />
            </>
          ) : null}

          {mode === 'username' ? (
            <>
              <Label text="用户名" />
              <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.input} />
              <Label text="昵称" />
              <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />
            </>
          ) : null}

          {mode === 'phone' ? (
            <>
              <Label text="手机号" />
              <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
              <Pressable style={styles.secondaryButton} onPress={requestCode} disabled={loading || !phone.trim()}>
                <Text style={styles.secondaryText}>获取本地验证码</Text>
              </Pressable>
              {mockCode ? <Text style={styles.mockCode}>本地验证码：{mockCode}</Text> : null}
              <Label text="验证码" />
              <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" style={styles.input} />
              <Label text="昵称" />
              <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />
            </>
          ) : null}

          <Label text="密码" />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
          {mode !== 'login' ? (
            <>
              <Label text="确认密码" />
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>{mode === 'login' ? '进入次聊' : '注册并进入'}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function assertPasswordMatch(password: string, confirmPassword: string) {
  if (password !== confirmPassword) {
    throw new Error('两次输入的密码不一致。');
  }
}

function getErrorMessage(cause: unknown) {
  if (cause instanceof ApiError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return '操作失败，请检查后端是否已启动。';
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, overflow: 'hidden', backgroundColor: '#f9f1ff' },
  scrollContent: { flexGrow: 1, gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  orbA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#c7f3ff', top: -78, right: -62, opacity: 0.92 },
  orbB: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#ffd2df', bottom: -54, left: -58, opacity: 0.86 },
  hero: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.ink, overflow: 'hidden', ...shadow },
  kicker: { color: colors.lemon, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: spacing.sm, color: colors.paper, fontFamily: fonts.display, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  copy: { marginTop: spacing.sm, color: '#e8ddff', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tab: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: 'rgba(255,255,255,0.9)' },
  activeTab: { backgroundColor: colors.coral },
  tabText: { color: colors.ink, fontWeight: '900' },
  activeTabText: { color: 'white' },
  card: { gap: spacing.sm, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.94)', overflow: 'hidden', ...shadow },
  label: { color: colors.muted, fontWeight: '900' },
  input: { minWidth: 0, borderRadius: radius.md, backgroundColor: '#f8f1ff', padding: spacing.md, borderWidth: 2, borderColor: colors.line, color: colors.ink, fontWeight: '800' },
  primaryButton: { minHeight: 48, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.lemon, fontWeight: '900' },
  secondaryButton: { borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.coral, alignItems: 'center' },
  secondaryText: { color: 'white', fontWeight: '900' },
  mockCode: { color: colors.lavender, fontWeight: '900' },
  error: { color: colors.danger, fontWeight: '800' }
});
