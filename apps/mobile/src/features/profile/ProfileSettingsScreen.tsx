import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '../../api/client';
import { updateProfile, uploadAvatar, useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { colors, fonts, radius, shadow, spacing } from '../../ui/theme';

type ProfileSettingsScreenProps = {
  onBack: () => void;
};

export function ProfileSettingsScreen({ onBack }: ProfileSettingsScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [signature, setSignature] = useState(currentUser?.signature ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile({ displayName: displayName.trim(), signature: signature.trim() });
      setSuccessVisible(true);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : '保存失败。');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async () => {
    if (uploading) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要相册权限', '请选择允许访问相册后再上传头像。');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.88,
        allowsEditing: true,
        aspect: [1, 1]
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      await uploadAvatar({
        uri: asset.uri,
        name: asset.fileName ?? `avatar.${extensionFromMime(asset.mimeType)}`,
        type: asset.mimeType ?? 'image/jpeg'
      });
      setMessage('头像已更新。');
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : '头像上传失败。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="返回" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>账户资料</Text>
          <Text style={styles.subtitle}>昵称、个性签名和头像</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <Avatar label={currentUser?.avatar || displayName || '次聊'} imageUrl={currentUser?.avatarUrl} size={82} accent="sky" />
          <Pressable style={styles.secondaryButton} onPress={pickAvatar} disabled={uploading}>
            <Text style={styles.secondaryText}>{uploading ? '上传中...' : '更换头像'}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>昵称</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} maxLength={40} />

        <Text style={styles.label}>个性签名</Text>
        <TextInput
          value={signature}
          onChangeText={setSignature}
          style={[styles.input, styles.signatureInput]}
          maxLength={80}
          multiline
          textAlignVertical="top"
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
          <Text style={styles.primaryText}>{saving ? '保存中...' : '保存资料'}</Text>
        </Pressable>
      </View>

      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={onBack}>
        <View style={styles.modalBackdrop}>
          <View style={styles.successDialog}>
            <Text style={styles.successTitle}>保存成功</Text>
            <Text style={styles.successCopy}>账户资料已更新。</Text>
            <Pressable style={styles.successButton} onPress={onBack}>
              <Text style={styles.successButtonText}>确定</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function extensionFromMime(mimeType?: string | null) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9f1ff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, paddingTop: spacing.xl, backgroundColor: colors.ink },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#382a54' },
  backText: { color: colors.paper, fontSize: 34, lineHeight: 36, fontWeight: '900' },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: colors.paper, fontFamily: fonts.display, fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#ddccff', marginTop: 2, fontWeight: '800' },
  card: { gap: spacing.sm, margin: spacing.lg, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, ...shadow },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  label: { color: colors.ink, fontWeight: '900', marginTop: spacing.xs },
  input: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: '#fffaff', fontWeight: '800' },
  signatureInput: { minHeight: 92 },
  primaryButton: { alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, backgroundColor: colors.ink },
  primaryText: { color: colors.paper, fontWeight: '900' },
  secondaryButton: { flexShrink: 0, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.lemon },
  secondaryText: { color: colors.ink, fontWeight: '900' },
  message: { color: colors.success, fontWeight: '900' },
  error: { color: colors.danger, fontWeight: '900' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(32,24,47,0.42)' },
  successDialog: { width: '100%', maxWidth: 320, borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.panel, ...shadow },
  successTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  successCopy: { color: colors.muted, marginTop: spacing.sm, lineHeight: 20, fontWeight: '800' },
  successButton: { alignItems: 'center', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, backgroundColor: colors.ink },
  successButtonText: { color: colors.paper, fontWeight: '900' }
});
