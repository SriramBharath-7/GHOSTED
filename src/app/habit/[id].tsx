import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  ChartColumnIncreasing,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  FileText,
  Flame,
  SearchX,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/hud/AppHeader';
import { BottomNav, NAV_TABS } from '@/components/hud/BottomNav';
import { HudPanel, HudPressable } from '@/components/hud/HudPanel';
import { HudTabs } from '@/components/hud/HudTabs';
import { SystemButton } from '@/components/hud/SystemButton';
import { CalendarMonth } from '@/components/intel/CalendarMonth';
import { FrequencyBars } from '@/components/intel/FrequencyBars';
import { IntelHero } from '@/components/intel/IntelHero';
import { LineChart } from '@/components/intel/LineChart';
import { MonthBars } from '@/components/intel/MonthBars';
import { IntelStats, StreakTiles } from '@/components/intel/Overview';
import { StreakList } from '@/components/intel/StreakList';
import { SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal, Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { colors, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { type DateKey, formatLongDay, monthOf } from '@/domain/dates';
import {
  type HabitHistory,
  type ScoreRange,
  dayStatus,
  habitOverview,
  monthlyHistory,
  scoreSeries,
  streakSummary,
  weekdayFrequency,
} from '@/domain/stats';
import { getHabit, timelineOf } from '@/repo/habits';
import { completionDates } from '@/repo/progress';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';

type Tab = 'overview' | 'history' | 'calendar' | 'streaks' | 'frequency';

const TABS = [
  { value: 'overview', label: 'Overview', icon: ChartNoAxesColumnIncreasing },
  { value: 'history', label: 'History', icon: FileText },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'streaks', label: 'Streaks', icon: Flame },
  { value: 'frequency', label: 'Frequency', icon: ChartColumnIncreasing },
] as const;

const RANGES: { value: ScoreRange; label: string }[] = [
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 13 weeks' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

export default function HabitIntelScreen() {
  const params = useLocalSearchParams<{ id: string; y?: string }>();
  const id = Number(params.id);
  const fromY = params.y ? Number(params.y) : null;
  const insets = useSafeAreaInsets();
  const today = useGame((s) => s.today);
  const load = useCallback(
    async (db: Db) => ({ habit: await getHabit(db, id), completed: await completionDates(db, id) }),
    [id],
  );
  const data = useLiveQuery(load);
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<ScoreRange>('month');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(today));
  const [editing, setEditing] = useState<DateKey | null>(null);

  const habit = data?.habit ?? null;
  const history = useMemo<HabitHistory | null>(
    () => (habit && data ? { timeline: timelineOf(habit), completed: data.completed, today } : null),
    [habit, data, today],
  );
  const stats = useMemo(() => {
    if (!history) return null;
    return {
      overview: habitOverview(history),
      six: monthlyHistory(history, 6),
      twelve: monthlyHistory(history, 12),
      frequency: weekdayFrequency(history),
      streaks: streakSummary(history, 6),
      monthLine: scoreSeries(history, 'month').points,
      yearLine: scoreSeries(history, 'year').points,
    };
  }, [history]);
  const series = useMemo(() => (history ? scoreSeries(history, range) : null), [history, range]);

  const nav = (
    <BottomNav activeIndex={1} allowActivePress bottomInset={insets.bottom} onSelect={(i) => router.navigate(NAV_TABS[i].href)} />
  );

  if (!data) return <Screen header={<AppHeader back />} footer={nav}>{null}</Screen>;
  if (!habit || !history || !stats || !series) {
    return (
      <Screen header={<AppHeader back />} footer={nav}>
        <EmptyState icon={SearchX} title="Habit not found" message="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader back />} footer={nav}>
      <IntelHero
        habit={habit}
        fromY={fromY}
        onEdit={() => router.push({ pathname: '/habit-editor', params: { id: String(habit.id) } })}
      />
      <Reveal index={1}>
        <HudTabs options={TABS} value={tab} onChange={setTab} dense height={56} />
      </Reveal>

      {tab === 'overview' ? (
        <>
          <Reveal index={2}>
            <IntelStats data={stats.overview} month={stats.monthLine} year={stats.yearLine} />
          </Reveal>
          <Reveal index={3}>
            <HudPanel chamfer={12} style={styles.gap}>
              <SectionTitle
                icon={ChartNoAxesColumnIncreasing}
                title="Score trend"
                right={
                  <HudPressable tone="none" padding={space.xs} onPress={() => setRangeOpen(true)} accessibilityRole="button" accessibilityLabel="Change range" style={styles.range}>
                    <Text variant="label" style={styles.rangeLabel} numberOfLines={1} adjustsFontSizeToFit>{RANGES.find((r) => r.value === range)?.label}</Text>
                    <ChevronDown size={14} color={colors.textDim} />
                  </HudPressable>
                }
              />
              <LineChart points={series.points} />
              <Text variant="caption" color={colors.textMuted}>
                {series.caption}. Only scheduled days count.
              </Text>
            </HudPanel>
          </Reveal>
          <Reveal index={4}>
            <HudPanel chamfer={12} style={styles.gap}>
              <SectionTitle icon={ChartNoAxesColumnIncreasing} title="Monthly history" right="Last 6 months" />
              <MonthBars bars={stats.six} />
            </HudPanel>
          </Reveal>
          <Reveal index={5}>
            <StreakTiles current={stats.overview.currentStreak} best={stats.overview.bestStreak} />
          </Reveal>
        </>
      ) : null}

      {tab === 'history' ? (
        <HudPanel chamfer={12} style={styles.gap}>
          <SectionTitle icon={FileText} title="History" right="Last 12 months" />
          <MonthBars bars={stats.twelve} height={190} />
          <View style={styles.table}>
            {[...stats.twelve].reverse().filter((b) => b.scheduled > 0 || b.done > 0).map((b) => (
              <View key={b.month} style={styles.tableRow}>
                <Text variant="label" style={styles.tableMonth}>
                  {b.label} {b.month.slice(0, 4)}
                </Text>
                <Text variant="bodyStrong">{b.done}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  of {b.scheduled} scheduled
                </Text>
              </View>
            ))}
          </View>
        </HudPanel>
      ) : null}

      {tab === 'calendar' ? (
        <HudPanel chamfer={12}>
          <CalendarMonth history={history} month={month} onMonthChange={setMonth} onSelectDay={setEditing} />
        </HudPanel>
      ) : null}

      {tab === 'streaks' ? (
        <>
          <StreakTiles current={stats.overview.currentStreak} best={stats.overview.bestStreak} />
          <HudPanel chamfer={12} style={styles.gap}>
            <SectionTitle icon={Flame} title="Best streaks" />
            <StreakList runs={stats.streaks.top} today={today} liveEnd={stats.streaks.liveEnd} />
          </HudPanel>
        </>
      ) : null}

      {tab === 'frequency' ? (
        <HudPanel chamfer={12} style={styles.gap}>
          <SectionTitle icon={ChartColumnIncreasing} title="Frequency" />
          <FrequencyBars data={stats.frequency} />
          <Text variant="caption" color={colors.textMuted}>
            Completion rate by weekday, all time.
          </Text>
        </HudPanel>
      ) : null}

      <Sheet visible={rangeOpen} onClose={() => setRangeOpen(false)}>
        <Text variant="title">Score range</Text>
        {RANGES.map((r) => (
          <SystemButton
            key={r.value}
            label={r.label}
            kind={r.value === range ? 'primary' : 'outline'}
            compact
            onPress={() => {
              setRange(r.value);
              setRangeOpen(false);
            }}
          />
        ))}
      </Sheet>
      <DaySheet date={editing} history={history} habitId={habit.id} xp={habit.xpReward} onClose={() => setEditing(null)} />
    </Screen>
  );
}

const STATUS_COPY: Record<string, string> = {
  done: 'Completed',
  missed: 'Missed',
  pending: 'Open today',
  rest: 'Not scheduled',
  untracked: 'Before tracking started',
  future: 'Upcoming',
};

/** Inspect / correct one day from the calendar. */
function DaySheet({
  date,
  history,
  habitId,
  xp,
  onClose,
}: {
  date: DateKey | null;
  history: HabitHistory;
  habitId: number;
  xp: number;
  onClose: () => void;
}) {
  const setHabitDone = useGame((s) => s.setHabitDone);
  const [busy, setBusy] = useState(false);
  if (!date) return null;
  const status = dayStatus(history, date);
  const canComplete = status === 'missed' || status === 'pending' || status === 'untracked';

  const apply = async (done: boolean) => {
    setBusy(true);
    try {
      await setHabitDone(habitId, date, done);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update that day.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible onClose={onClose}>
      <Text variant="label" color={colors.cyan}>
        {STATUS_COPY[status]}
      </Text>
      <Text variant="title">{formatLongDay(date)}</Text>
      {status === 'done' ? (
        <SystemButton label="Remove completion" busy={busy} onPress={() => void apply(false)} />
      ) : canComplete ? (
        <>
          {status === 'untracked' ? (
            <Text variant="caption">Tracking will start from this day. Days after it count as scheduled.</Text>
          ) : null}
          <SystemButton label={date === history.today ? `Mark complete · +${xp} XP` : 'Mark complete'} kind="primary" busy={busy} onPress={() => void apply(true)} />
        </>
      ) : (
        <Text variant="caption">This day isn’t on the habit’s schedule.</Text>
      )}
      <Text variant="caption" color={colors.textMuted}>
        {date === history.today ? 'Today’s completion earns XP and Ghost Coins. Undo reverses its rewards.' : 'Historical edits update analytics without earning XP, Ghost Coins or daily bonuses.'}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  range: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 128, borderBottomWidth: 1, borderBottomColor: colors.lineStrong },
  rangeLabel: { fontSize: 9, letterSpacing: 0.8, flexShrink: 1 },
  table: { gap: 2 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tableMonth: { width: 86 },
});
