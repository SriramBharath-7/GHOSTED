import { type ReactNode, useState } from 'react';
import {
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { motion, space } from '@/config/theme';
import { haptics } from '@/services/haptics';
import { PressableScale } from '../ui/PressableScale';
import { type FrameTone, HudFrame } from './HudFrame';

/** Measures its own box so the SVG frame can match it. */
export function useBox() {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b && Math.abs(b.w - width) < 0.5 && Math.abs(b.h - height) < 0.5 ? b : { w: width, h: height }));
  };
  return { box, onLayout };
}

interface PanelProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: FrameTone;
  chamfer?: number;
  double?: boolean;
  fill?: string;
  padding?: number;
}

/** A translucent HUD panel. The base surface for every screen. */
export function HudPanel({ children, style, tone = 'cyan', chamfer = 12, double, fill, padding = space.lg }: PanelProps) {
  const { box, onLayout } = useBox();
  return (
    <View style={[{ padding, zIndex: 0 }, style]} onLayout={onLayout}>
      {box ? <HudFrame width={box.w} height={box.h} chamfer={chamfer} tone={tone} double={double} fill={fill} /> : null}
      {children}
    </View>
  );
}

interface HudPressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: FrameTone;
  chamfer?: number;
  fill?: string;
  padding?: number;
  /** Light tick on press. */
  feedback?: boolean;
  scaleTo?: number;
}

/** Pressable HUD panel: sinks slightly and its border lights up while pressed. */
export function HudPressable({
  children,
  style,
  tone = 'dim',
  chamfer = 8,
  fill,
  padding = space.md,
  feedback = false,
  scaleTo = 0.98,
  onPressIn,
  onPressOut,
  ...rest
}: HudPressableProps) {
  const { box, onLayout } = useBox();
  const highlight = useSharedValue(0);
  return (
    <PressableScale
      {...rest}
      scaleTo={scaleTo}
      onLayout={onLayout}
      onPressIn={(e) => {
        highlight.set(withTiming(1, { duration: motion.press }));
        if (feedback) haptics.tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        highlight.set(withTiming(0, { duration: motion.base }));
        onPressOut?.(e);
      }}
      style={[{ padding, zIndex: 0 }, style]}
    >
      {box ? <HudFrame width={box.w} height={box.h} chamfer={chamfer} tone={tone} fill={fill} highlight={highlight} /> : null}
      {children}
    </PressableScale>
  );
}
