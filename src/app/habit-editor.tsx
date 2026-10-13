import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Bell, SearchX, Trash } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { IconBox } from '@/components/hud/IconBox';
import { IconPicker } from '@/components/hud/IconPicker';
import { HABIT_ICONS } from '@/components/hud/icons';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { PressableScale } from '@/components/ui/PressableScale';
import { ToggleRow } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { toast } from '@/components/ui/Toast';
import { NEW_HABIT_REWARD, REWARD_LIMITS } from '@/config/game';
import { ACCENTS, colors, radius, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import { WEEKDAYS_SHORT } from '@/domain/dates';
import { EVERY_DAY, maskIncludes } from '@/domain/schedule';
import { type Habit, type HabitInput, getHabit } from '@/repo/habits';
import { createHabit, deleteHabit, habitEarnings, setHabitArchived, updateHabit } from '@/repo/progress';
import { remindersSupported } from '@/services/notifications';
import { useGame } from '@/state/game';
import { remindersActive } from '@/state/selectors';
import { useLiveQuery } from '@/state/useLiveQuery';


const BLANK: HabitInput = {
  title: '',
  icon: 'target',
  description: '',
  question: '',
  accent: ACCENTS[0],
  daysMask: EVERY_DAY,
  xpReward: NEW_HABIT_REWARD.xp,
  coinReward: NEW_HABIT_REWARD.coins,
  reminderTime: null,
  reminderEnabled: false,
};

export default function HabitEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const load = useCallback((db: Db) => (id ? getHabit(db, id) : Promise.resolve(null)), [id]);
  const existing = useLiveQuery(load);
  if (existing === undefined) return <Screen header={<Header back title="Habit" />}>{null}</Screen>;
  if (id && !existing) {
    return (
      <Screen header={<Header back title="Habit" />}>
        <EmptyState icon={SearchX} title="Habit not found" message="It may have been deleted." />
      </Screen>
    );
  }
  return <HabitForm id={id} existing={existing} />;
}

function HabitForm({ id, existing }: { id: number | null; existing: Habit | null }) {
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const remindersOn = useGame(remindersActive);
  const [form, setForm] = useState<HabitInput>(() =>
    existing
      ? {
          title: existing.title,
          icon: existing.icon,
          description: existing.description,
          question: existing.question,
          accent: existing.accent,
          daysMask: existing.daysMask,
          xpReward: existing.xpReward,
          coinReward: existing.coinReward,
          reminderTime: existing.reminderTime,
          reminderEnabled: existing.reminderEnabled,
        }
      : BLANK,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof HabitInput>(key: K, value: HabitInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleDay = (day: number) => {
    const next = form.daysMask ^ (1 << day);
    if (next !== 0) set('daysMask', next);
  };

  const save = async () => {
    if (!form.title.trim()) return setError('Give the habit a name.');
    setSaving(true);
    try {
      const db = getDb();
      let habitId = id;
      if (id) await updateHabit(db, id, form, today);
      else habitId = await createHabit(db, form, today);
      await commit({ reminders: habitId ?? true });
      router.back();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const enableReminder = async (on: boolean) => {
    setForm((f) => ({ ...f, reminderEnabled: on, reminderTime: f.reminderTime ?? '20:30' }));
    // The switch in Settings is on but the OS hasn't allowed notifications yet: ask now.
    const state = useGame.getState();
    if (!on || !state.settings.reminders || remindersActive(state)) return;
    try {
      if ((await state.setRemindersEnabled(true)) === 'denied') {
        toast('Notifications are blocked. Allow them in Android settings to get reminders.', 'error');
      }
    } catch {
      toast('Could not turn on reminders. Try again.', 'error');
    }
  };

  const askDelete = async () => {
    if (!id) return;
    const earned = await habitEarnings(getDb(), id);
    setConfirmDelete(
      earned.count > 0
        ? `This permanently deletes ${earned.count} completions and removes the ${earned.xp} XP and ${earned.coins} coins they earned. Archive instead to keep the history.`
        : 'This habit has no history yet. It will be removed.',
    );
  };

  return (
    <Screen header={<Header back eyebrow={id ? 'Edit habit' : 'New habit'} title={form.title || 'Untitled'} />}>
      <View style={styles.preview}>
        <View style={styles.previewIcon}>
          <IconBox icon={form.icon} size={84} tone="active" color={colors.cyanBright} />
        </View>
      </View>

      <TextField
        label="Title"
        value={form.title}
        onChangeText={(t) => {
          setError(null);
          set('title', t);
        }}
        placeholder="e.g. The Iron Monarch"
        error={error}
        maxLength={60}
      />
      <TextField label="Description" value={form.description} onChangeText={(t) => set('description', t)} placeholder="Optional" maxLength={140} />
      <TextField label="Check-in question" value={form.question} onChangeText={(t) => set('question', t)} placeholder="Optional · shown in reminders" maxLength={160} />

      <SectionTitle title="Icon" />
      <IconPicker icons={HABIT_ICONS} value={form.icon} onChange={(icon) => set('icon', icon)} />

      <SectionTitle title="Accent" />
      <View style={styles.wrap}>
        {ACCENTS.map((accent) => (
          <PressableScale
            key={accent}
            onPress={() => set('accent', accent)}
            style={[styles.swatch, { backgroundColor: accent }, form.accent === accent && styles.swatchActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: form.accent === accent }}
            accessibilityLabel={`Accent ${accent}`}
          />
        ))}
      </View>

      <SectionTitle title="Schedule" />
      <View style={styles.days}>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const on = maskIncludes(form.daysMask, day);
          return (
            <PressableScale
              key={day}
              onPress={() => toggleDay(day)}
              style={[styles.day, on && styles.dayOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={WEEKDAYS_SHORT[day]}
            >
              <Text variant="label" color={on ? colors.text : colors.textMuted}>
                {WEEKDAYS_SHORT[day]}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.row}>
        <Button label="Every day" kind="secondary" compact onPress={() => set('daysMask', EVERY_DAY)} />
        <Button label="Weekdays" kind="secondary" compact onPress={() => set('daysMask', 0b0111110)} />
      </View>
      {id ? (
        <Text variant="caption" color={colors.textMuted}>
          Schedule changes apply from today. Past days keep the schedule they had.
        </Text>
      ) : null}

      <SectionTitle title="Rewards" />
      <View style={styles.stack}>
        <Stepper label="XP" value={form.xpReward} onChange={(v) => set('xpReward', v)} max={REWARD_LIMITS.maxHabitXp} color={colors.xp} />
        <Stepper label="Coins" value={form.coinReward} onChange={(v) => set('coinReward', v)} max={REWARD_LIMITS.maxHabitCoins} step={1} color={colors.coin} />
      </View>
      <Text variant="caption" color={colors.textMuted}>
        Past completions keep what they earned; new values apply to new completions.
      </Text>

      <SectionTitle title="Reminder" />
      <Card style={styles.card}>
        <ToggleRow icon={Bell} title="Remind me" subtitle="Skipped automatically once done" value={form.reminderEnabled} onChange={(on) => void enableReminder(on)} />
        {!remindersSupported ? (
          <Text variant="caption" color={colors.textMuted}>
            Saved now; delivered once you run the installed app (not Expo Go on Android or the web preview).
          </Text>
        ) : form.reminderEnabled && !remindersOn ? (
          <Text variant="caption" color={colors.textMuted}>
            Saved, but habit reminders are off in Settings, so this one won’t be sent.
          </Text>
        ) : null}
        {form.reminderEnabled ? (
          <TimeField label="Time" value={form.reminderTime ?? '20:30'} onChange={(t) => set('reminderTime', t)} />
        ) : null}
      </Card>

      <Button label={id ? 'Save changes' : 'Create habit'} busy={saving} onPress={() => void save()} />

      {id && existing ? (
        <View style={styles.danger}>
          <Button
            label={existing.archived ? 'Restore habit' : 'Archive habit'}
            kind="secondary"
            icon={existing.archived ? ArchiveRestore : Archive}
            onPress={async () => {
              try {
                await setHabitArchived(getDb(), id, !existing.archived, today);
                await commit({ reminders: true });
                toast(existing.archived ? 'Habit restored' : 'Archived. History kept.');
                router.back();
              } catch {
                toast('Could not update this habit. Try again.', 'error');
              }
            }}
          />
          <Button label="Delete habit" kind="ghost" icon={Trash} onPress={() => void askDelete()} />
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmDelete !== null}
        title={`Delete ${existing?.title ?? 'habit'}?`}
        message={confirmDelete ?? ''}
        confirmLabel="Delete forever"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!id) return;
          setConfirmDelete(null);
          try {
            await deleteHabit(getDb(), id, today);
            await commit({ reminders: true });
            router.dismissAll();
          } catch {
            toast('Could not delete this habit. Try again.', 'error');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: space.sm },
  previewIcon: { alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatch: { width: 36, height: 36, borderWidth: 2, borderColor: 'transparent', transform: [{ rotate: '45deg' }] },
  swatchActive: { borderColor: colors.text },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: 'row', gap: space.md },
  dayOn: { backgroundColor: 'rgba(79, 216, 255, 0.16)', borderColor: colors.cyan },
  stack: { gap: space.md },
  card: { gap: space.md, paddingVertical: space.sm },
  danger: { gap: space.sm, marginTop: space.lg },
});
