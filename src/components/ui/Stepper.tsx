import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  step?: number;
  color?: string;
}

/** Number input with −/+ for quick tuning (XP, coins, cost, steps). */
export function Stepper({ label, value, onChange, min = 0, max, step = 5, color = colors.cyanBright }: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  // While typing, show exactly what was typed (even empty); clamp once editing ends.
  const [draft, setDraft] = useState<string | null>(null);
  const { box, onLayout } = useBox();
  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        <IconButton icon={Minus} label={`Decrease ${label}`} filled onPress={() => onChange(clamp(value - step))} disabled={value <= min} />
        <View style={styles.field} onLayout={onLayout}>
          {box ? <HudFrame width={box.w} height={box.h} chamfer={6} tone="dim" corners={false} /> : null}
          <TextInput
            value={draft ?? String(value)}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              setDraft(digits);
              if (digits) onChange(clamp(Number(digits)));
            }}
            onBlur={() => setDraft(null)}
            keyboardType="number-pad"
            accessibilityLabel={label}
            style={[styles.input, { color }]}
            selectTextOnFocus
          />
        </View>
        <IconButton icon={Plus} label={`Increase ${label}`} filled onPress={() => onChange(clamp(value + step))} disabled={value >= max} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  field: { flex: 1, zIndex: 0 },
  input: {
    minHeight: 48,
    textAlign: 'center',
    fontFamily: fonts.number,
    fontSize: 22,
  },
});
