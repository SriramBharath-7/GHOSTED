import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

/** Framed HUD input; the frame lights up while focused. */
export function TextField({ label, hint, error, style, multiline, onFocus, onBlur, ...rest }: Props) {
  const { box, onLayout } = useBox();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label">{label}</Text>
      <View onLayout={onLayout} style={{ zIndex: 0 }}>
        {box ? (
          <HudFrame
            width={box.w}
            height={box.h}
            chamfer={6}
            tone={error ? 'danger' : focused ? 'active' : 'dim'}
            fill={colors.panelStrong}
            corners={focused}
          />
        ) : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.cyan}
          cursorColor={colors.cyan}
          accessibilityLabel={label}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          style={[styles.input, multiline && styles.multiline, style]}
        />
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.textMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    minHeight: 50,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
