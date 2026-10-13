import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, formatDate } from '@/domain/dates';
import type { StreakRun } from '@/domain/stats';
import { Text } from '../ui/Text';

/** Longest runs as proportional bars, like a leaderboard against yourself. */
export function StreakList({ runs, today, liveEnd }: { runs: StreakRun[]; today: DateKey; liveEnd: DateKey | null }) {
  if (runs.length === 0) {
    return <Text variant="caption">No streaks yet. Two completed days in a row starts one.</Text>;
  }
  const best = runs[0].length;
  return (
    <View style={styles.list}>
      {runs.map((run) => {
        const live = run.end === liveEnd;
        return (
          <View key={run.start} style={styles.row} accessible accessibilityLabel={`${run.length} days from ${run.start} to ${run.end}${live ? ', ongoing' : ''}`}>
            <Text variant="caption" style={styles.date}>
              {formatDate(run.start, today)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${Math.max(10, (run.length / best) * 100)}%` }, live ? styles.live : styles.past]}>
                <Text style={[styles.count, { color: live ? colors.bg : colors.cyanBright }]}>{run.length}</Text>
              </View>
            </View>
            <Text variant="caption" style={[styles.date, styles.end]}>
              {formatDate(run.end, today)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  date: { width: 62, fontSize: 12 },
  end: { textAlign: 'right' },
  track: { flex: 1 },
  bar: { height: 24, justifyContent: 'center', paddingHorizontal: 8, minWidth: 30, borderWidth: 1 },
  live: { backgroundColor: colors.cyan, borderColor: colors.cyanBright },
  past: { backgroundColor: 'rgba(79, 216, 255, 0.12)', borderColor: colors.lineStrong },
  count: { fontFamily: fonts.number, fontSize: 13 },
});
