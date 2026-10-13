import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { colors } from '@/config/theme';
import { FloatUp } from '../fx/FloatUp';
import { AnimatedNumber } from '../ui/AnimatedNumber';

/** Wallet count with a brief deduction receipt after a purchase commits. */
export function CoinBalance({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const previous = useRef(value);
  const reduced = useReducedMotion();
  const [spent, setSpent] = useState({ nonce: 0, amount: 0 });
  useEffect(() => {
    if (value < previous.current && !reduced) {
      const amount = previous.current - value;
      setSpent((last) => ({ nonce: last.nonce + 1, amount }));
    }
    previous.current = value;
  }, [reduced, value]);
  return (
    <View style={styles.balance}>
      <AnimatedNumber value={value} variant="hero" style={style} color={value < 0 ? colors.danger : colors.coin} />
      <FloatUp nonce={spent.nonce} text={`−${spent.amount} GC`} color={colors.coin} duration={650} offset={8} />
    </View>
  );
}

const styles = StyleSheet.create({ balance: { flexShrink: 1 } });
