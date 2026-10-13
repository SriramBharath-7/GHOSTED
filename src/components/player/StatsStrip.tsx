import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { useGame } from '@/state/game';
import { dayProgress } from '@/state/selectors';
import { HudPanel } from '../hud/HudPanel';
import { PixelArt } from '../pixel/PixelArt';
import { Text } from '../ui/Text';

const pct = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;

/** The three useful travel stats; the passport already shows the level. */
export function StatsStrip() {
  const player = useGame((s) => s.player);
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const today = useGame((s) => s.today);
  const progress = dayProgress(habits, recent, today);
  const stats = [
    { art: 'star' as const, label: 'Today', value: `${progress.done}/${progress.total}`, hint: `Today ${progress.done} of ${progress.total} complete` },
    { art: 'flame' as const, label: 'Day streak', value: String(player.perfectStreak), hint: `${player.perfectStreak} Perfect Days in a row` },
    { art: 'trophy' as const, label: '30-day score', value: pct(player.score30), hint: `30-day completion ${pct(player.score30)}` },
  ];
  return (
    <View style={styles.strip}>
      {stats.map((stat) => (
        <HudPanel key={stat.label} padding={space.sm} style={styles.tile}>
          <View accessible accessibilityLabel={stat.hint} style={styles.content}>
            <PixelArt name={stat.art} size={26} />
            <Text style={styles.value}>{stat.value}</Text>
            <Text variant="caption" style={styles.label} numberOfLines={1} adjustsFontSizeToFit>{stat.label}</Text>
          </View>
        </HudPanel>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, minWidth: 0 },
  content: { alignItems: 'center', gap: 3 },
  value: { fontFamily: fonts.number, fontSize: 23, lineHeight: 27, color: colors.text },
  label: { fontSize: 11, lineHeight: 15 },
});
