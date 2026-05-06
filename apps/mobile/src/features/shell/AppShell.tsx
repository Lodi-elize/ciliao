import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../../ui/theme';

export type AppTab = 'messages' | 'contacts' | 'me';

type TabItem = {
  id: AppTab;
  label: string;
  glyph: string;
};

const tabs: TabItem[] = [
  { id: 'messages', label: '消息', glyph: '✦' },
  { id: 'contacts', label: '通讯录', glyph: '☄' },
  { id: 'me', label: '我的', glyph: '♡' }
];

type AppShellProps = {
  activeTab: AppTab;
  title: string;
  subtitle: string;
  onTabChange: (tab: AppTab) => void;
  onAddFriend: () => void;
  children: ReactNode;
};

export function AppShell({ activeTab, title, subtitle, onTabChange, onAddFriend, children }: AppShellProps) {
  return (
    <View style={styles.root}>
      <View style={styles.backdropA} />
      <View style={styles.backdropB} />
      <View style={styles.topBar}>
        <View style={styles.titleGroup}>
          <Text style={styles.brand}>次聊</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable accessibilityLabel="添加好友" style={styles.plusButton} onPress={onAddFriend}>
          <Text style={styles.plusText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable key={tab.id} style={[styles.tabItem, active && styles.activeTab]} onPress={() => onTabChange(tab.id)}>
              <Text style={[styles.tabGlyph, active && styles.activeTabText]}>{tab.glyph}</Text>
              <Text style={[styles.tabLabel, active && styles.activeTabText]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, overflow: 'hidden', backgroundColor: '#f9f1ff' },
  backdropA: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: '#c7f3ff', top: -62, right: -62, opacity: 0.9 },
  backdropB: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#ffd2df', bottom: 28, left: -58, opacity: 0.75 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  titleGroup: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  brand: { color: colors.lavender, fontFamily: fonts.body, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, fontWeight: '900', marginTop: 3 },
  subtitle: { color: colors.muted, fontWeight: '700', marginTop: 3 },
  plusButton: { flexShrink: 0, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, ...shadow },
  plusText: { color: colors.lemon, fontSize: 32, lineHeight: 36, fontWeight: '900' },
  content: { flex: 1, minWidth: 0, paddingHorizontal: spacing.md },
  tabBar: { flexDirection: 'row', gap: spacing.sm, margin: spacing.md, padding: spacing.sm, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.88)', ...shadow },
  tabItem: { flex: 1, borderRadius: radius.lg, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: colors.ink },
  tabGlyph: { color: colors.muted, fontSize: 18, fontWeight: '900' },
  tabLabel: { color: colors.muted, fontWeight: '900', marginTop: 2 },
  activeTabText: { color: colors.paper }
});
