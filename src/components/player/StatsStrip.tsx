import { ChartNoAxesColumnIncreasing, ChevronsUp, Crosshair, Flame } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { levelInfo } from '@/domain/progression';
import { useGame } from '@/state/game';
import { dayProgress, overallScore } from '@/state/selectors';
import { HudPanel } from '../hud/HudPanel';
import { StatBlock } from '../hud/StatBlock';
import { ProgressBar } from '../ui/ProgressBar';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

/** Today's progress · Perfect Day streak · 30-day score · level. */
export function StatsStrip() {
  const player = useGame((s) => s.player);
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const today = useGame((s) => s.today);
  const progress = dayProgress(habits, recent, today);
  const todayRate = progress.total ? progress.done / progress.total : 0;
  const score = overallScore(habits, recent, today);

  return (
    <HudPanel chamfer={12} padding={space.sm} style={styles.strip}>
      <StatBlock
        icon={ChartNoAxesColumnIncreasing}
        label="Today's progress"
        align="center"
        value={pct(todayRate)}
        accessibilityLabel={`Today ${progress.done} of ${progress.total} complete`}
      >
        <ProgressBar progress={todayRate} height={4} glow={false} />
      </StatBlock>
      <View style={styles.sep} />
      <StatBlock
        icon={Flame}
        label="Day streak"
        align="center"
        value={String(player.perfectStreak)}
        accessibilityLabel={`${player.perfectStreak} Perfect Days in a row`}
      />
      <View style={styles.sep} />
      <StatBlock
        icon={Crosshair}
        label="Overall score"
        align="center"
        value={pct(score)}
        accessibilityLabel={`30-day completion ${pct(score)}`}
      />
      <View style={styles.sep} />
      <StatBlock icon={ChevronsUp} label="Level" align="center" value={String(levelInfo(player.totalXp).level)} />
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'stretch' },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginVertical: space.xs },
});
