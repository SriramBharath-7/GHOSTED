import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, space } from '@/config/theme';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { PixelArt } from '../pixel/PixelArt';
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
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 2400);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;
  return (
    <Animated.View
      key={message.id}
      entering={reduced ? undefined : FadeInDown.duration(180)}
      exiting={reduced ? undefined : FadeOutDown.duration(180)}
      pointerEvents="none"
      onLayout={onLayout}
      style={[styles.toast, { bottom: insets.bottom + 104 }]}
      accessibilityLiveRegion="polite"
    >
      {box ? (
        <HudFrame width={box.w} height={box.h} chamfer={8} tone="cyan" fill={colors.panel} />
      ) : null}
      {message.tone === 'error' ? (
        <View style={styles.notice}><Text variant="bodyStrong" color={colors.cream}>!</Text></View>
      ) : <PixelArt name="ghost" size={32} />}
      <Text variant="bodyStrong" style={styles.message} color={message.tone === 'error' ? colors.danger : colors.text}>
        {message.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    zIndex: 0,
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  message: { flex: 1 },
  notice: { width: 28, height: 28, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.wood },
});
