import { CalendarDays, Flame, Lock, RotateCw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import { MONTHS_SHORT, addDays, dayOfMonth, formatDate } from '@/domain/dates';
import { listRuns, resetRun, runLength, setCurrentStart, startRun, summarizeVault } from '@/repo/vault';
import { haptics } from '@/services/haptics';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';
import { HudFrame } from '../hud/HudFrame';
import { HudPanel } from '../hud/HudPanel';
import { StatBlock } from '../hud/StatBlock';
import { SystemButton } from '../hud/SystemButton';
import { SectionTitle } from '../ui/Card';
import { Reveal } from '../ui/Screen';
import { ConfirmSheet } from '../ui/Sheet';
import { Stepper } from '../ui/Stepper';
import { Text } from '../ui/Text';
import { DateField } from '../ui/TimeField';
import { VaultGauge } from './VaultGauge';

/** The private counter. Calm on purpose: a long game, not a pressure meter. */
export const VAULT_TITLE = 'Now Or Never';

function VaultTitle() {
  return (
    <View style={styles.titleRow}>
      <View style={styles.lockBox}>
        <HudFrame width={58} height={58} chamfer={6} tone="cyan" />
        <Lock size={26} color={colors.cyanBright} strokeWidth={1.6} />
      </View>
      <View style={styles.flex}>
        <Text variant="title" glow style={styles.title}>
          Private Vault
        </Text>
        <Text style={styles.subtitle}>{VAULT_TITLE}</Text>
      </View>
    </View>
  );
}

export function VaultHome() {
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const load = useCallback((db: Db) => listRuns(db), []);
  const runs = useLiveQuery(load);
  const [confirmReset, setConfirmReset] = useState(false);
  const [initialDays, setInitialDays] = useState(0);

  if (!runs) return null;
  const summary = summarizeVault(runs, today);

  if (!summary.current) {
    return (
      <Reveal>
        <HudPanel double chamfer={16} style={styles.panel}>
          <VaultTitle />
          <Text variant="body" color={colors.textDim}>
            Count the days you hold the line. Nothing here leaves this screen.
          </Text>
          <Stepper label="Days already in this run" value={initialDays} onChange={setInitialDays} max={3650} step={1} />
          <SystemButton
            label="Begin"
            kind="primary"
            onPress={async () => {
              await startRun(getDb(), addDays(today, -initialDays));
              await commit();
            }}
          />
        </HudPanel>
      </Reveal>
    );
  }

  const next = summary.nextMilestone;
  const toNext = next ? (summary.days - summary.previousMilestone) / (next - summary.previousMilestone) : 1;
  const start = summary.current.startDate;

  return (
    <View style={styles.home}>
      <Reveal index={0}>
        <HudPanel double chamfer={16} style={styles.panel}>
          <VaultTitle />
          <View style={styles.gauge}>
            <VaultGauge days={summary.days} progress={toNext} />
          </View>
          <Text variant="label" align="center" color={colors.textMuted}>
            {next ? `Next marker · ${next} days · ${next - summary.days} to go` : 'Every marker passed'}
          </Text>
          {summary.reachedToday ? (
            <Text variant="caption" align="center" color={colors.cyanBright}>
              Day {summary.reachedToday}. Quietly done.
            </Text>
          ) : null}
          <HudPanel chamfer={12} padding={space.md} style={styles.stats}>
            <StatBlock icon={Flame} label="Best streak" value={String(summary.best)} unit="days" align="center" />
            <View style={styles.sep} />
            <StatBlock icon={CalendarDays} label="Total days" value={String(summary.total)} unit="days" align="center" />
            <View style={styles.sep} />
            <StatBlock
              icon={CalendarDays}
              label="Start date"
              align="center"
              accessibilityLabel={`Started ${start}`}
              value={
                <View style={styles.date}>
                  <Text style={styles.dateMain} glow numberOfLines={1} adjustsFontSizeToFit>
                    {dayOfMonth(start)} {MONTHS_SHORT[Number(start.slice(5, 7)) - 1].toUpperCase()}
                  </Text>
                  <Text style={styles.year}>{start.slice(0, 4)}</Text>
                </View>
              }
            />
          </HudPanel>
          <SystemButton label="Reset vault" kind="danger" icon={RotateCw} onPress={() => setConfirmReset(true)} />
        </HudPanel>
      </Reveal>

      {summary.past.length > 0 ? (
        <Reveal index={1}>
          <HudPanel chamfer={12} tone="dim" style={styles.list}>
            <SectionTitle title="History" />
            {summary.past.map((run) => (
              <View key={run.id} style={styles.historyRow}>
                <Text variant="caption" style={styles.flex}>
                  {formatDate(run.startDate, today)} – {run.endDate ? formatDate(run.endDate, today) : ''}
                </Text>
                <Text variant="bodyStrong" color={colors.textDim}>
                  {runLength(run, today)} d
                </Text>
              </View>
            ))}
          </HudPanel>
        </Reveal>
      ) : null}

      <Reveal index={2}>
        <HudPanel chamfer={12} tone="dim" style={styles.list}>
          <SectionTitle title="Correct the start" />
          <DateField
            label="Current run started"
            value={start}
            today={today}
            clearable={false}
            onChange={async (d) => {
              if (!d || d > today) return;
              await setCurrentStart(getDb(), d);
              await commit();
            }}
          />
        </HudPanel>
      </Reveal>

      <ConfirmSheet
        visible={confirmReset}
        title="Start a new run?"
        message={`Your ${summary.days} ${summary.days === 1 ? 'day' : 'days'} stay in your history. The counter starts again today.`}
        confirmLabel="Start again"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetRun(getDb(), today);
          haptics.tap();
          await commit();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  home: { gap: space.md },
  panel: { gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  lockBox: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontSize: 19, letterSpacing: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, letterSpacing: 4, color: colors.textDim, marginTop: 2 },
  gauge: { alignItems: 'center' },
  stats: { flexDirection: 'row' },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginVertical: space.xs },
  date: { alignItems: 'center' },
  dateMain: { fontFamily: fonts.number, fontSize: 22, lineHeight: 27, color: colors.text },
  year: { fontFamily: fonts.displayMedium, fontSize: 11, letterSpacing: 2, color: colors.textDim },
  list: { gap: space.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
