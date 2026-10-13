import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { colors } from '@/config/theme';

/** Static paper grain / stone blocks. No timers, full-screen images or blur layers. */
export const HudBackground = memo(function HudBackground({ tint }: { tint?: string }) {
  const vault = tint === colors.vault;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: vault ? colors.vaultBg : colors.bg }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={vault ? 'stone' : 'paper'} width={64} height={64} patternUnits="userSpaceOnUse">
            {vault ? <Path d="M0 0H64 M0 32H64 M32 0V32 M12 32V64" stroke="#57606A" strokeWidth={2} opacity={0.13} /> : <Path d="M8 9h3v3H8z M40 38h2v2h-2z M56 18h4v2h-4z M20 54h2v2h-2z" fill={colors.border} opacity={0.1} />}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${vault ? 'stone' : 'paper'})`} />
      </Svg>
    </View>
  );
});
