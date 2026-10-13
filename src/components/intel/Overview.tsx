import { CalendarDays, ChevronDown, ChevronUp, Crosshair, Database, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, space } from '@/config/theme';
import type { HabitOverview, SeriesPoint } from '@/domain/stats';
import { HudPanel } from '../hud/HudPanel';
import { PixelArt } from '../pixel/PixelArt';
import { StatBlock } from '../hud/StatBlock';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

function Sparkline({ points, color }: { points: SeriesPoint[]; color: string }) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const h = 22;
  const path = points
    .map(({ value }, i) => value === null ? '' : `${i === 0 || points[i - 1].value === null ? 'M' : 'L'}${((i / Math.max(1, points.length - 1)) * (width - 4) + 2).toFixed(1)},${(2 + (1 - value) * (h - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <Animated.View entering={reduced ? undefined : FadeIn.duration(280)} style={{ height: h }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && path.trim() ? (
        <Svg width={width} height={h}>
          <Path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      ) : null}
    </Animated.View>
  );
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <Text variant="number" color={colors.textMuted} style={styles.value}>
        —
      </Text>
    );
  }
  const points = Math.round(delta * 100);
  const up = points >= 0;
  const color = points === 0 ? colors.textDim : up ? colors.success : colors.danger;
  const Arrow = up ? ChevronUp : ChevronDown;
  return (
    <View style={styles.delta}>
      <Arrow size={18} color={color} strokeWidth={3} />
      <Text variant="number" color={color} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {up ? '+' : ''}
        {points}%
      </Text>
    </View>
  );
}

/** Score, rolling-period changes and total, using the concept's stat strip. */
export function IntelStats({
  data,
  month,
  year,
}: {
  data: HabitOverview;
  month: SeriesPoint[];
  year: SeriesPoint[];
}) {
  const monthColor = (data.month.delta ?? 0) < 0 ? colors.danger : colors.success;
  const yearColor = (data.year.delta ?? 0) < 0 ? colors.danger : colors.success;
  return (
    <View style={styles.strip}>
      <HudPanel padding={space.md} style={styles.statCard}>
      <StatBlock icon={Crosshair} label="Score" value={pct(data.score30.rate)} accessibilityLabel={`30-day score ${pct(data.score30.rate)}`}>
        <ProgressBar progress={data.score30.rate ?? 0} height={6} glow={false} />
      </StatBlock>
      </HudPanel>
      <HudPanel padding={space.md} style={styles.statCard}>
        <StatBlock icon={Database} label="Total completions" value={String(data.total)} accessibilityLabel={`${data.total} total completions`} />
      </HudPanel>
      <HudPanel padding={space.md} style={styles.statCard}>
      <StatBlock icon={CalendarDays} label="Last 30d" value={<Delta delta={data.month.delta} />} accessibilityLabel="Last 30 days, change versus prior 30 days">
        <Sparkline points={month} color={monthColor} />
      </StatBlock>
      </HudPanel>
      <HudPanel padding={space.md} style={styles.statCard}>
      <StatBlock icon={TrendingUp} label="Last 365d" value={<Delta delta={data.year.delta} />} accessibilityLabel="Last 365 days, change versus prior 365 days">
        <Sparkline points={year} color={yearColor} />
      </StatBlock>
      </HudPanel>
    </View>
  );
}

function Tile({ art, label, value }: { art: 'flame' | 'crown'; label: string; value: number }) {
  return (
    <HudPanel chamfer={12} style={styles.tile} padding={space.md}>
      <PixelArt name={art} size={36} />
      <View style={styles.tileText} accessible accessibilityLabel={`${label} ${value} days`}>
        <Text variant="label" style={styles.tileLabel}>
          {label}
        </Text>
        <View style={styles.tileValue}>
          <Text variant="hero" glow style={styles.tileNumber} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          <Text style={styles.days}>days</Text>
        </View>
      </View>
    </HudPanel>
  );
}

export function StreakTiles({ current, best }: { current: number; best: number }) {
  return (
    <View style={styles.tiles}>
      <Tile art="flame" label="Current streak" value={current} />
      <Tile art="crown" label="Best streak" value={best} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  statCard: { width: '47%', flexGrow: 1, minHeight: 116 },
  value: { fontSize: 20, lineHeight: 26 },
  delta: { flexDirection: 'row', alignItems: 'center' },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tileText: { flex: 1, gap: 2 },
  tileLabel: { fontSize: 9, lineHeight: 14, letterSpacing: 0 },
  tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tileNumber: { fontSize: 32, lineHeight: 38, flexShrink: 1 },
  days: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDim },
});
