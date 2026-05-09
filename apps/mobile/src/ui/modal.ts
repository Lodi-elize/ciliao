import { Platform, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

export function getModalKeyboardAvoidingBehavior() {
  return Platform.OS === 'ios' ? 'padding' : 'height';
}

export const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(32,24,47,0.46)'
  },
  centeredBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  scrim: {
    ...StyleSheet.absoluteFillObject
  },
  frame: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  sheetWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md
  },
  sheetSurface: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.panel,
    ...shadow
  },
  dialogSurface: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.panel,
    ...shadow
  },
  handle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
    backgroundColor: '#dbc9ef'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md
  },
  titleGroup: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900'
  },
  copy: {
    color: colors.muted,
    marginTop: 3,
    fontWeight: '700',
    lineHeight: 20
  },
  closeButton: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink
  },
  closeText: {
    color: colors.paper,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '900'
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md
  },
  buttonDark: {
    backgroundColor: colors.ink
  },
  buttonAccent: {
    backgroundColor: colors.coral
  },
  buttonTextPaper: {
    color: colors.paper,
    fontWeight: '900'
  }
});
