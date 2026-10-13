import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/config/theme';

/** Small, original vector illustrations: no raster assets or permanent effects. */
export function RewardArt({ name, width, height }: { name: string; width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 112" accessibilityElementsHidden>
      <Ellipse cx="80" cy="103" rx="61" ry="4" fill={colors.cyan} opacity={0.09} />
      <G stroke={colors.cyanBright} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" fill={colors.bgRaised}>
        {name === 'burger' ? (
          <>
            <Path d="M119 30h25l-4 58h-17z" fill={colors.surfaceHigh} />
            <Path d="M116 30h31v5h-31zM130 30l6-22h10" />
            <Path d="M17 66l-3-30 6-1 5 30m0 0 1-37 6 1-1 35m4 0 5-29 6 2-6 30" stroke={colors.cyan} strokeWidth={3} />
            <Path d="m12 61 9 34h23l8-34z" fill={colors.surfaceHigh} />
            <Path d="M44 67c1-22 15-34 36-34s36 12 38 34z" fill={colors.surfaceHigh} />
            <Path d="m44 71 13 4 12-4 12 4 12-4 12 4 13-4M44 80h74" stroke={colors.cyan} strokeWidth={3} />
            <Path d="M43 85h77v7c-12 11-64 11-77 0z" fill={colors.surfaceHigh} />
            <Path d="m55 82 20 7 11-7" fill={colors.cyan} fillOpacity={0.3} />
            <Path d="m65 48 3-2m9 8 3-2m9-7 3 2m9 9 3 1M24 72l3 16m10-16-2 16" strokeOpacity={0.7} />
          </>
        ) : name === 'film' || name === 'tv' || name === 'popcorn' ? (
          <>
            <Rect x="12" y="24" width="112" height="65" rx="2" fill={colors.surfaceHigh} />
            <Rect x="17" y="29" width="102" height="54" strokeOpacity={0.35} />
            <Path d="m58 44 24 14-24 14z" fill={colors.cyan} stroke={colors.cyan} />
            <Path d="M59 90v9H42m35-9v9h16M39 101h57" />
            <Path d="m111 67 6 33h25l6-33z" fill={colors.surfaceHigh} />
            <Path d="m119 69 4 28m7-28v28m11-28-4 28" stroke={colors.cyan} strokeWidth={3} />
            <Path d="M113 66c-8-5-3-13 3-11-2-9 7-12 11-5 3-10 14-7 13 1 9-3 15 9 6 15z" fill={colors.cyanBright} fillOpacity={0.65} />
            <Path d="m120 57 4 3m8-7-1 5m7 4 4-2" stroke={colors.bgRaised} />
          </>
        ) : name === 'gamepad' ? (
          <>
            <Path d="M43 32c-11 1-17 8-22 24L12 88c-3 15 13 20 22 6l12-17h68l12 17c9 14 25 9 22-6l-9-32c-5-16-11-23-22-24z" fill={colors.surfaceHigh} strokeWidth={2} />
            <Rect x="58" y="35" width="44" height="24" rx="3" strokeOpacity={0.5} />
            <Path d="M39 43h8v8h8v8h-8v8h-8v-8h-8v-8h8z" />
            <Circle cx="61" cy="73" r="10" /><Circle cx="99" cy="73" r="10" />
            <Circle cx="61" cy="73" r="5" strokeOpacity={0.35} /><Circle cx="99" cy="73" r="5" strokeOpacity={0.35} />
            <Circle cx="118" cy="44" r="4" /><Circle cx="129" cy="55" r="4" />
            <Circle cx="118" cy="66" r="4" /><Circle cx="107" cy="55" r="4" />
            <Path d="m26 85 7-11m99 11-7-11M76 68h8" stroke={colors.cyan} />
          </>
        ) : name === 'bed' ? (
          <>
            <Path d="M20 48v48m0-32 112-1v33M20 83h112M30 62V49c0-8 30-8 30 0v13" strokeWidth={3} />
            <Path d="M62 54h58c7 0 12 5 12 12v13H24V66h38z" fill={colors.surfaceHigh} strokeWidth={2} />
            <Path d="M71 56v22m46-17h9M22 97h-5m119 0h-7" strokeOpacity={0.45} />
            <Path d="M76 25h12L76 39h12m11-33h18L99 26h18m9-8h13l-13 15h13" stroke={colors.cyan} strokeWidth={2} />
          </>
        ) : name === 'palm' ? (
          <>
            <Path d="M29 99c15-17 34-17 49-12 17-5 37-2 51 12z" fill={colors.surfaceHigh} />
            <Path d="M77 88c11-19 15-41 11-59l8-2c8 25 0 48-5 61z" fill={colors.surfaceHigh} strokeWidth={2} />
            <Path d="M89 30C63 9 42 28 38 44c17-9 32-16 51-14zM91 28C71 6 85 1 98 5c13 4 19 13 24 25-13-7-21-8-31-2zM92 31c24-16 48-2 53 17-16-11-35-15-53-17zM89 32C62 26 56 47 54 64c9-12 17-24 35-32zM94 32c16 0 28 16 23 36-5-17-13-28-23-36z" fill={colors.surfaceHigh} />
            <Path d="m84 43 11 3m-12 8 11 3m-13 8 11 3m-15 9 12 3M40 103h80" stroke={colors.cyan} strokeOpacity={0.7} />
            <Circle cx="89" cy="33" r="4" /><Circle cx="96" cy="35" r="4" />
          </>
        ) : (
          <>
            <Path d="m57 19-22 9-20 26 23 16 10-13-2 44h68l-2-44 10 13 23-16-20-26-22-9c-9 9-37 9-46 0z" fill={colors.surfaceHigh} strokeWidth={2} />
            <Path d="M59 21c4 20 38 20 43 0M37 31l13 24m73-24-13 24M49 95h62" strokeOpacity={0.45} />
            <Path d="m80 45 17 10v19L80 84 63 74V55z" stroke={colors.cyan} />
            <Path d="m80 51 11 7v13l-11 7-11-7V58zM76 60h8m-8 5h8m-4 0v7" stroke={colors.cyanBright} />
          </>
        )}
      </G>
      <Path d="M13 105h134" stroke={colors.cyan} opacity={0.35} />
    </Svg>
  );
}
