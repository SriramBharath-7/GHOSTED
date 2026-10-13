import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, space } from '@/config/theme';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { Text } from './Text';

interface ToastState {
  message: { id: number; text: string; tone: 'info' | 'error' } | null;
  show: (text: string, tone?: 'info' | 'error') => void;
  clear: () => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (text, tone = 'info') => set({ message: { id: nextId++, text, tone } }),
  clear: () => set({ message: null }),
}));

/** Brief, non-blocking confirmation ("Backup saved"). */
export const toast = (text: string, tone?: 'info' | 'error') => useToastStore.getState().show(text, tone);

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const clear = useToastStore((s) => s.clear);
  const insets = useSafeAreaInsets();
  const { box, onLayout } = useBox();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 2400);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;
  return (
    <Animated.View
      key={message.id}
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      onLayout={onLayout}
      style={[styles.toast, { bottom: insets.bottom + 104 }]}
      accessibilityLiveRegion="polite"
    >
      {box ? (
        <HudFrame width={box.w} height={box.h} chamfer={8} tone={message.tone === 'error' ? 'danger' : 'active'} fill={colors.panelStrong} />
      ) : null}
      <Text variant="bodyStrong" align="center" color={message.tone === 'error' ? colors.danger : colors.text}>
        {message.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
});
