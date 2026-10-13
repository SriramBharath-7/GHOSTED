import { RotateCw } from 'lucide-react-native';
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
import { HudPanel } from '../hud/HudPanel';
import { PixelArt } from '../pixel/PixelArt';
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
        <PixelArt name="lantern" size={58} />
      </View>
      <View style={styles.flex}>
        <Text variant="title" style={styles.title}>
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
        <HudPanel tone="danger" double chamfer={16} style={styles.panel}>
          <VaultTitle />
          <Text variant="body" color={colors.vaultDim}>
            Count the days you hold the line. Nothing here leaves this screen.
          </Text>
          <HudPanel tone="dim">
            <Stepper label="Days already in this run" value={initialDays} onChange={setInitialDays} max={3650} step={1} />
          </HudPanel>
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
        <HudPanel tone="danger" double chamfer={16} style={styles.panel}>
          <VaultTitle />
          <View style={styles.gauge}>
            <VaultGauge days={summary.days} progress={toNext} />
          </View>
          <Text variant="caption" align="center" color={colors.vaultDim}>
            {next ? `Next marker · ${next} ${next === 1 ? 'day' : 'days'} · ${next - summary.days} to go` : 'Every marker passed'}
          </Text>
          {summary.reachedToday ? (
            <Text variant="caption" align="center" color={colors.gold}>
              Day {summary.reachedToday}. Quietly done.
            </Text>
          ) : null}
          <View style={styles.stats}>
            <View style={styles.stat} accessible accessibilityLabel={`Best streak ${summary.best} days`}>
              <PixelArt name="crown" size={30} />
              <Text variant="number" color={colors.gold}>{summary.best}</Text>
              <Text variant="caption" color={colors.vaultDim} align="center">Best streak</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.stat} accessible accessibilityLabel={`Total days ${summary.total}`}>
              <PixelArt name="star" size={30} />
              <Text variant="number" color={colors.gold}>{summary.total}</Text>
              <Text variant="caption" color={colors.vaultDim} align="center">Total days</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.stat} accessible accessibilityLabel={`Started ${start}`}>
              <Text style={styles.year}>{start.slice(0, 4)}</Text>
              <Text style={styles.dateMain} numberOfLines={1} adjustsFontSizeToFit>
                {dayOfMonth(start)} {MONTHS_SHORT[Number(start.slice(5, 7)) - 1].toUpperCase()}
              </Text>
              <Text variant="caption" color={colors.vaultDim}>Started</Text>
            </View>
          </View>
          <Text variant="caption" align="center" color={colors.vaultText}>Not everyone knows. That’s the point.</Text>
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
  title: { fontSize: 16, letterSpacing: 0, color: colors.vaultText },
  subtitle: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 0, color: colors.gold, marginTop: 6 },
  gauge: { alignItems: 'center' },
  stats: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.wood, paddingVertical: space.md },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  sep: { width: 2, backgroundColor: colors.wood, marginVertical: space.xs },
  dateMain: { fontFamily: fonts.number, fontSize: 21, lineHeight: 27, color: colors.gold },
  year: { fontFamily: fonts.displayMedium, fontSize: 11, color: colors.vaultDim },
  list: { gap: space.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
