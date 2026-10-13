import { Check, Delete, FingerprintPattern } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import { PIN_LENGTH } from '@/services/vaultAuth';
import { haptics } from '@/services/haptics';
import { HudPressable } from '../hud/HudPanel';
import { PixelArt } from '../pixel/PixelArt';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

interface Props {
  title: string;
  subtitle?: string;
  error?: string | null;
  /** Non-zero shakes the dots on mount. Change the component `key` to clear the entry. */
  errorKey?: number;
  disabled?: boolean;
  onSubmit: (pin: string) => void;
  onBiometric?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

/** Quiet numeric keypad. Deliberately says nothing about what it protects. */
export function PinPad({ title, subtitle, error, errorKey = 0, disabled, onSubmit, onBiometric }: Props) {
  const [pin, setPin] = useState('');
  const shake = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!errorKey || reduced) return;
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [errorKey, reduced, shake]);

  const dots = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    haptics.tap();
    if (key === 'del') setPin((p) => p.slice(0, -1));
    else if (key === 'ok') {
      if (pin.length >= PIN_LENGTH.min) onSubmit(pin);
    } else if (pin.length < PIN_LENGTH.max) setPin((p) => p + key);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.lock}>
        <PixelArt name="chest" size={64} />
      </View>
      <View style={styles.head}>
        <Text variant="title" align="center" color={colors.vaultText}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" align="center" color={colors.vaultDim}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Animated.View style={[styles.dots, dots]} accessibilityLabel={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(PIN_LENGTH.min, pin.length) }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </Animated.View>
      <Text variant="caption" color={colors.vault} align="center" style={styles.error}>
        {error ?? ' '}
      </Text>
      <View style={styles.grid}>
        {KEYS.map((key) => {
          const quiet = key === 'del' || key === 'ok';
          return (
            <HudPressable
              key={key}
              scaleTo={0.9}
              tone={quiet ? 'none' : 'danger'}
              fill={colors.vaultPanel}
              chamfer={8}
              padding={0}
              disabled={disabled || (key === 'ok' && pin.length < PIN_LENGTH.min)}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key === 'ok' ? 'Confirm' : key}
              style={styles.key}
            >
              {key === 'del' ? (
                <Delete size={22} color={colors.vaultDim} />
              ) : key === 'ok' ? (
                <Check size={26} color={pin.length >= PIN_LENGTH.min ? colors.gold : colors.vaultDim} />
              ) : (
                <Text style={styles.digit}>{key}</Text>
              )}
            </HudPressable>
          );
        })}
      </View>
      {onBiometric ? (
        <PressableScale onPress={onBiometric} style={styles.bio} accessibilityRole="button" accessibilityLabel="Use fingerprint">
          <FingerprintPattern size={30} color={colors.gold} strokeWidth={1.5} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg },
  lock: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  head: { gap: space.xs, minHeight: 44 },
  dots: { flexDirection: 'row', gap: space.md, minHeight: 14 },
  dot: { width: 12, height: 12, borderWidth: 2, borderColor: colors.vaultDim },
  dotOn: { backgroundColor: colors.gold, borderColor: colors.vaultText },
  error: { minHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 282, gap: 16, justifyContent: 'center' },
  key: { width: 78, height: 64, alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: fonts.display, fontSize: 25, color: colors.vaultText },
  bio: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
