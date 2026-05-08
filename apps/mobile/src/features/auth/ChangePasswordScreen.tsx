import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, api } from '../../api/client';

type ChangePasswordScreenProps = {
  onBack: () => void;
};

export function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('两次输入的新密码不一致。');
      }
      await api.changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('密码已修改，下次登录请使用新密码。');
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : '修改密码失败。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={getKeyboardAvoidingBehavior()}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>修改密码</Text>
        <Text style={styles.subtitle}>先确认当前密码，再设置至少 8 位的新密码。</Text>
      </View>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>当前密码</Text>
          <TextInput value={oldPassword} onChangeText={setOldPassword} secureTextEntry style={styles.input} />
          <Text style={styles.label}>新密码</Text>
          <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} />
          <Text style={styles.label}>确认新密码</Text>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryButton} onPress={submit} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? '保存中' : '保存新密码'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getKeyboardAvoidingBehavior() {
  return Platform.OS === 'ios' ? 'padding' : 'height';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7efe1' },
  header: { padding: 20, paddingTop: 28, backgroundColor: '#2e3559' },
  backButton: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10, backgroundColor: '#495174' },
  backText: { color: 'white', fontWeight: '800' },
  title: { color: 'white', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#ffddb7', marginTop: 4 },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },
  card: { gap: 10, margin: 18, borderRadius: 24, padding: 18, backgroundColor: '#fff7df' },
  label: { color: '#6c5a45', fontWeight: '800' },
  input: { borderRadius: 14, backgroundColor: 'white', padding: 12, borderWidth: 1, borderColor: '#eeddb6' },
  primaryButton: { borderRadius: 16, padding: 14, backgroundColor: '#2e3559', alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: '900' },
  message: { color: '#067647', fontWeight: '800' },
  error: { color: '#b42318', fontWeight: '800' }
});
