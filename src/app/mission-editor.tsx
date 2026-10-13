import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, RotateCcw, Trash, X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ParticleBurst } from '@/components/fx/ParticleBurst';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/hud/IconPicker';
import { IconBox } from '@/components/hud/IconBox';
import { HudPanel } from '@/components/hud/HudPanel';
import { MISSION_ICONS } from '@/components/hud/icons';
import { SectionTitle } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { Text } from '@/components/ui/Text';
import { DateField } from '@/components/ui/TimeField';
import { toast } from '@/components/ui/Toast';
import { colors, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import {
  type Goal,
  type GoalHorizon,
  type GoalInput,
  type GoalStatus,
  createGoal,
  deleteGoal,
  getGoal,
  setGoalStatus,
  updateGoal,
} from '@/repo/goals';
import { haptics } from '@/services/haptics';
import { useFx } from '@/state/fx';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';

type ProgressMode = 'none' | 'steps' | 'percent';
const MODES = [
  { value: 'none', label: 'None' },
  { value: 'steps', label: 'Steps' },
  { value: 'percent', label: 'Percent' },
] as const;

const HORIZONS = [
  { value: 'short', label: 'Short-term' },
  { value: 'long', label: 'Long-term' },
] as const;

export default function MissionEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; horizon?: GoalHorizon }>();
  const id = params.id ? Number(params.id) : null;
  const load = useCallback((db: Db) => (id ? getGoal(db, id) : Promise.resolve(null)), [id]);
  const existing = useLiveQuery(load);
  if (existing === undefined) return <Screen header={<Header back title="Mission" />}>{null}</Screen>;
  return (
    <MissionForm
      id={existing ? id : null}
      existing={existing}
      horizon={params.horizon === 'long' ? 'long' : 'short'}
    />
  );
}

function MissionForm({
  id,
  existing,
  horizon,
}: {
  id: number | null;
  existing: Goal | null;
  horizon: GoalHorizon;
}) {
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const [form, setForm] = useState<GoalInput>(() =>
    existing
      ? {
          title: existing.title,
          description: existing.description,
          horizon: existing.horizon,
          icon: existing.icon,
          category: existing.category,
          startDate: existing.startDate,
          targetDate: existing.targetDate,
          stepsTotal: existing.stepsTotal,
          stepsDone: existing.stepsDone,
          progress: existing.progress,
          notes: existing.notes,
        }
      : {
          title: '',
          description: '',
          horizon,
          icon: 'target',
          category: '',
          startDate: null,
          targetDate: null,
          stepsTotal: null,
          stepsDone: 0,
          progress: null,
          notes: '',
        },
  );
  const mode: ProgressMode = form.stepsTotal ? 'steps' : form.progress !== null ? 'percent' : 'none';
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [burst, setBurst] = useState(0);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof GoalInput>(key: K, value: GoalInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return setError('Name the mission.');
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const db = getDb();
      if (id) await updateGoal(db, id, form);
      else await createGoal(db, form);
      await commit();
      router.back();
    } catch {
      toast('Could not save this mission. Your edits are still here.', 'error');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const setStatus = async (status: GoalStatus) => {
    if (!id || pending.current) return;
    if (!form.title.trim()) return setError('Name the mission.');
    pending.current = true;
    setBusy(true);
    try {
      const db = getDb();
      await updateGoal(db, id, form);
      await setGoalStatus(db, id, status);
      await commit();
      if (status === 'done') {
        haptics.success();
        setBurst((n) => n + 1);
        useFx.getState().push({ type: 'missionComplete', name: form.title.trim(), icon: form.icon });
      }
      router.back();
    } catch {
      toast('Could not update this mission. Try again.', 'error');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Screen header={<Header back eyebrow={id ? 'Mission' : 'New mission'} title={form.title || 'Untitled'} />}>
      <HudPanel style={styles.preview}>
        <IconBox icon={form.icon} size={64} tone="active" />
        <View style={styles.previewCopy}>
          <Text variant="heading">Chart a new adventure</Text>
          <Text variant="caption">Set your destination. Make the next step count.</Text>
        </View>
      </HudPanel>
      <Segmented options={HORIZONS} value={form.horizon} onChange={(v) => set('horizon', v)} />
      <TextField
        label="Mission"
        value={form.title}
        onChangeText={(t) => {
          setError(null);
          set('title', t);
        }}
        placeholder="e.g. Run a sub-25 5K"
        error={error}
        maxLength={80}
      />
      <TextField label="Description" value={form.description} onChangeText={(t) => set('description', t)} placeholder="Optional" multiline maxLength={400} />
      <TextField label="Tags" value={form.category} onChangeText={(t) => set('category', t)} placeholder="e.g. Learning · Programming" maxLength={60} />
      <SectionTitle title="Icon" />
      <IconPicker icons={MISSION_ICONS} value={form.icon} onChange={(icon) => set('icon', icon)} />
      <DateField label="Starts (later = upcoming)" value={form.startDate} onChange={(d) => set('startDate', d)} today={today} />
      <DateField label="Target date" value={form.targetDate} onChange={(d) => set('targetDate', d)} today={today} />

      <SectionTitle title="Progress" />
      <Segmented
        options={MODES}
        value={mode}
        onChange={(m) =>
          setForm((f) => ({
            ...f,
            stepsTotal: m === 'steps' ? (f.stepsTotal ?? 5) : null,
            progress: m === 'percent' ? (f.progress ?? 0) : null,
          }))
        }
      />
      {mode === 'steps' ? (
        <>
          <Stepper label="Steps in total" value={form.stepsTotal ?? 1} onChange={(v) => set('stepsTotal', v)} min={1} max={999} step={1} />
          <Stepper label="Steps done" value={form.stepsDone} onChange={(v) => set('stepsDone', v)} max={form.stepsTotal ?? 1} step={1} />
        </>
      ) : mode === 'percent' ? (
        <Stepper label="Progress %" value={form.progress ?? 0} onChange={(v) => set('progress', v)} max={100} step={5} />
      ) : null}

      <TextField label="Notes" value={form.notes} onChangeText={(t) => set('notes', t)} placeholder="Anything worth remembering" multiline maxLength={2000} />

      <View>
        <Button label={id ? 'Save' : 'Create mission'} busy={busy} onPress={() => void save()} />
        <ParticleBurst burstKey={burst} color={colors.success} count={24} radius={120} />
      </View>

      {id && existing ? (
        <View style={styles.actions}>
          {existing.status === 'active' ? (
            <>
              <Button label="Mark complete" kind="secondary" icon={CircleCheck} disabled={busy} onPress={() => void setStatus('done')} />
              <Button label="Drop mission" kind="ghost" icon={X} disabled={busy} onPress={() => void setStatus('dropped')} />
            </>
          ) : (
            <Button label="Reopen" kind="secondary" icon={RotateCcw} disabled={busy} onPress={() => void setStatus('active')} />
          )}
          <Button label="Delete" kind="ghost" icon={Trash} disabled={busy} onPress={() => setConfirmDelete(true)} />
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this mission?"
        message="It will be removed permanently. Use Drop to keep a record instead."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!id) return;
          setConfirmDelete(false);
          try {
            await deleteGoal(getDb(), id);
            await commit();
            router.back();
          } catch {
            toast('Could not delete this mission. Try again.', 'error');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  previewCopy: { flex: 1, gap: space.xs },
  actions: { gap: space.sm, marginTop: space.md },
});
