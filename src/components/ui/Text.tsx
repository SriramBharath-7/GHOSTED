import { Text as RNText, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { colors, fonts, glow as glowTokens } from '@/config/theme';

export type TextVariant =
  | 'hero'
  | 'title'
  | 'heading'
  | 'label'
  | 'number'
  | 'body'
  | 'bodyStrong'
  | 'caption';

interface Props extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Soft cyan light around the glyphs. Use for values that matter, not prose. */
  glow?: boolean | 'strong' | 'danger';
}

/** All app text goes through here so type stays consistent. */
export function Text({ variant = 'body', color, align, glow, style, ...rest }: Props) {
  const glowStyle =
    glow === 'strong' ? glowTokens.text : glow === 'danger' ? glowTokens.textDanger : glow ? glowTokens.textSoft : null;
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'hero' || variant === 'title' ? 1.2 : 1.4}
      {...rest}
      style={[styles[variant], glowStyle, color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}

/** Text that always glows (values, active labels). */
export function GlowText(props: Omit<Props, 'glow'> & { strength?: 'soft' | 'strong' | 'danger' }) {
  const { strength = 'soft', ...rest } = props;
  return <Text {...rest} glow={strength === 'soft' ? true : strength} />;
}

const styles = StyleSheet.create({
  hero: {
    fontFamily: fonts.numberHeavy,
    fontSize: 56,
    lineHeight: 62,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: fonts.bodySemi,
    fontSize: 19,
    lineHeight: 24,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.displayMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  number: {
    fontFamily: fonts.number,
    fontSize: 22,
    lineHeight: 27,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  bodyStrong: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textDim,
  },
});
