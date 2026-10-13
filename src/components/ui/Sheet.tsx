import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/config/theme';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { SystemButton } from '../hud/SystemButton';
import { Text } from './Text';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  tone?: 'cyan' | 'danger';
}

/** Bottom HUD sheet. Tapping the scrim or Back closes it. */
export function Sheet({ visible, onClose, children, tone = 'cyan' }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { box, onLayout } = useBox();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        entering={SlideInDown.duration(240)}
        style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}
        onLayout={onLayout}
      >
        {box ? <HudFrame width={box.w} height={box.h + 20} chamfer={14} tone={tone} fill={colors.panelStrong} double /> : null}
        <View style={[styles.handle, tone === 'danger' && { backgroundColor: colors.danger }]} />
        {children}
      </Animated.View>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  /** Vault styling (red). */
  tone?: 'cyan' | 'danger';
}

export function ConfirmSheet({ visible, title, message, confirmLabel, onConfirm, onCancel, destructive, tone }: ConfirmProps) {
  return (
    <Sheet visible={visible} onClose={onCancel} tone={tone}>
      <Text variant="title" color={tone === 'danger' ? colors.danger : colors.text}>
        {title}
      </Text>
      <Text variant="body" color={colors.textDim}>
        {message}
      </Text>
      <View style={styles.actions}>
        <SystemButton label={confirmLabel} kind={destructive || tone === 'danger' ? 'danger' : 'primary'} onPress={onConfirm} />
        <SystemButton label="Cancel" kind="ghost" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 2,
    backgroundColor: colors.cyan,
    opacity: 0.7,
    marginBottom: space.sm,
  },
  actions: { gap: space.sm, marginTop: space.sm },
});
