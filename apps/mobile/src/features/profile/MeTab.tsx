import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logout, useAppStore } from '../../state/appStore';
import { Avatar } from '../../ui/Avatar';
import { colors, fonts, radius, shadow, spacing } from '../../ui/theme';

type MeTabProps = {
  onChangePassword: () => void;
  onProfileSettings: () => void;
};

export function MeTab({ onChangePassword, onProfileSettings }: MeTabProps) {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <View style={styles.root}>
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          <Avatar label={currentUser?.avatar || currentUser?.displayName || '次聊'} imageUrl={currentUser?.avatarUrl} size={76} accent="sky" />
          <View style={styles.profileText}>
            <Text numberOfLines={1} style={styles.name}>{currentUser?.displayName ?? '未命名伙伴'}</Text>
            <Text numberOfLines={1} style={styles.handle}>{currentUser?.username ? `@${currentUser.username}` : currentUser?.phone ?? currentUser?.id}</Text>
          </View>
        </View>
        <Text style={styles.note}>{currentUser?.signature || '还没有个性签名。'}</Text>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>账号设置</Text>
        <Pressable style={styles.actionRow} onPress={onProfileSettings}>
          <Text style={styles.actionIcon}>◎</Text>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>账户资料</Text>
            <Text style={styles.actionCopy}>修改昵称、个性签名和头像。</Text>
          </View>
        </Pressable>
        <Pressable style={styles.actionRow} onPress={onChangePassword}>
          <Text style={styles.actionIcon}>✦</Text>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>修改密码</Text>
            <Text style={styles.actionCopy}>保持当前登录态，旧密码会失效。</Text>
          </View>
        </Pressable>
        <Pressable style={styles.actionRow} onPress={() => void logout()}>
          <Text style={styles.actionIcon}>↪</Text>
          <View style={styles.actionBody}>
            <Text style={styles.actionTitle}>退出登录</Text>
            <Text style={styles.actionCopy}>回到登录页，并清理本地会话。</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.md, minWidth: 0 },
  profileCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: colors.ink, overflow: 'hidden', ...shadow },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1, minWidth: 0 },
  name: { color: colors.paper, fontFamily: fonts.display, fontSize: 26, fontWeight: '900' },
  handle: { color: '#c9bcff', marginTop: 4, fontWeight: '800' },
  note: { color: '#f5e7ff', marginTop: spacing.md, lineHeight: 20, fontWeight: '700' },
  actionCard: { borderRadius: radius.xl, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.94)', overflow: 'hidden', ...shadow },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm, backgroundColor: '#f8f1ff', overflow: 'hidden' },
  actionIcon: { flexShrink: 0, width: 34, height: 34, borderRadius: 17, textAlign: 'center', textAlignVertical: 'center', lineHeight: 34, backgroundColor: colors.lemon, color: colors.ink, fontSize: 18, fontWeight: '900' },
  actionBody: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.ink, fontWeight: '900' },
  actionCopy: { color: colors.muted, marginTop: 2, fontWeight: '700' }
});
