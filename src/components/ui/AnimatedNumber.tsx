import { useEffect, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Text, type TextVariant } from './Text';

interface Props {
  value: number;
  variant?: TextVariant;
  color?: string;
  duration?: number;
  format?: (n: number) => string;
  glow?: boolean | 'strong';
  style?: StyleProp<TextStyle>;
}

export const formatNumber = (n: number) => Math.round(n).toLocaleString('en-US');

/** Counts from the previous value to the new one (ease-out). */
export function AnimatedNumber({ value, variant = 'number', color, duration = 320, format = formatNumber, glow, style }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (reduced || start === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const began = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - began) / duration);
      const next = start + (value - start) * (1 - Math.pow(1 - t, 3));
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <Text variant={variant} color={color} glow={glow} style={style} accessibilityLabel={format(value)}>
      {format(shown)}
    </Text>
  );
}
