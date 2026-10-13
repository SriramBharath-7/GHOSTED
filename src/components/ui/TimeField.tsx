import DateTimePicker from '@react-native-community/datetimepicker';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { type DateKey, formatClock, formatDate, isDateKey, keyToLocalDate, toDateKey } from '@/domain/dates';
import { HudPressable } from '../hud/HudPanel';
import { Text } from './Text';

const pad = (n: number) => String(n).padStart(2, '0');

function FieldButton({ children, onPress, label, grow }: { children: ReactNode; onPress: () => void; label: string; grow?: boolean }) {
  return (
    <HudPressable
      onPress={onPress}
      tone="dim"
      chamfer={6}
      padding={0}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.field, grow && styles.grow]}
    >
      {children}
    </HudPressable>
  );
}

/** Opens the native time picker; value is 'HH:MM'. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h, m] = value.split(':').map(Number);
  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <FieldButton onPress={() => setOpen(true)} label={`${label}: ${formatClock(value)}`}>
        <Text variant="number" glow>
          {formatClock(value)}
        </Text>
      </FieldButton>
      {open ? (
        <DateTimePicker
          mode="time"
          value={new Date(2000, 0, 1, h, m)}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
          }}
        />
      ) : null}
    </View>
  );
}

/** Opens the native date picker; value is a DateKey or null. */
export function DateField({
  label,
  value,
  onChange,
  today,
  clearable = true,
}: {
  label: string;
  value: DateKey | null;
  onChange: (v: DateKey | null) => void;
  today: DateKey;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        <FieldButton grow onPress={() => setOpen(true)} label={`${label}: ${value ?? 'none'}`}>
          <Text variant="body" color={value ? colors.text : colors.textMuted}>
            {value && isDateKey(value) ? formatDate(value, today) : 'No date'}
          </Text>
        </FieldButton>
        {value && clearable ? (
          <FieldButton onPress={() => onChange(null)} label="Clear date">
            <Text variant="label">Clear</Text>
          </FieldButton>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          mode="date"
          value={value ? keyToLocalDate(value) : keyToLocalDate(today)}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) onChange(toDateKey(date));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
  field: { minHeight: 50, paddingHorizontal: space.lg, justifyContent: 'center' },
});
