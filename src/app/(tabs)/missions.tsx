import { router } from 'expo-router';
import { CircleCheck, Clock, Crosshair, MountainSnow, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/hud/AppHeader';
import { HudPanel } from '@/components/hud/HudPanel';
import { HudTabs } from '@/components/hud/HudTabs';
import { SystemButton } from '@/components/hud/SystemButton';
import { MissionRow } from '@/components/missions/MissionRow';
import { SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal, Screen } from '@/components/ui/Screen';
import { toast } from '@/components/ui/Toast';
import { getDb } from '@/db/database';
import { type Goal, type GoalHorizon, advanceGoal, isUpcoming, listGoals } from '@/repo/goals';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';
import { space } from '@/config/theme';

const HORIZONS = [
  { value: 'short', label: 'Short term', icon: Crosshair },
  { value: 'long', label: 'Long term', icon: MountainSnow },
] as const;

export default function MissionsScreen() {
  const goals = useLiveQuery(listGoals);
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const [horizon, setHorizon] = useState<GoalHorizon>('short');
  const advancing = useRef(new Set<number>());
  const visible = (goals ?? []).filter((g) => g.horizon === horizon);
  const upcoming = visible.filter((g) => isUpcoming(g, today));
  const active = visible.filter((g) => g.status === 'active' && !isUpcoming(g, today));
  const closed = visible.filter((g) => g.status !== 'active');
  const create = () => router.push({ pathname: '/mission-editor', params: { horizon } });
  const advance = async (goal: Goal) => {
    if (advancing.current.has(goal.id)) return;
    advancing.current.add(goal.id);
    try {
      await advanceGoal(getDb(), goal);
      await commit();
    } catch {
      toast('Could not update this mission. Try again.', 'error');
    } finally {
      advancing.current.delete(goal.id);
    }
  };

  return (
    <Screen header={<AppHeader ghost />}>
      <Reveal index={0}>
        <HudTabs options={HORIZONS} value={horizon} onChange={setHorizon} height={58} />
      </Reveal>

      {goals && visible.length === 0 ? (
        <Reveal index={1}>
          <EmptyState
            icon={Crosshair}
            title="No missions yet"
            message={
              horizon === 'short'
                ? 'Missions are outcomes you’re working toward in the coming weeks. They stay separate from your daily habits.'
                : 'The bigger outcomes. Months, not days.'
            }
            action={{ label: 'New mission', onPress: create }}
          />
        </Reveal>
      ) : (
        <>
          <Reveal index={1}>
            <HudPanel double chamfer={14} style={styles.panel}>
              <SectionTitle icon={Crosshair} title="Active missions" right={`${active.length} / ${active.length + upcoming.length} active`} />
              {active.length === 0 ? (
                <SystemButton label="Start a mission" icon={Plus} compact onPress={create} />
              ) : (
                active.map((goal) => <MissionRow key={goal.id} goal={goal} today={today} onAdvance={(g) => void advance(g)} />)
              )}
            </HudPanel>
          </Reveal>
          {upcoming.length > 0 ? (
            <Reveal index={2}>
              <HudPanel double chamfer={14} style={styles.panel}>
                <SectionTitle icon={Clock} title="Upcoming missions" right={`${upcoming.length} scheduled`} />
                {upcoming.map((goal) => (
                  <MissionRow key={goal.id} goal={goal} today={today} onAdvance={(g) => void advance(g)} />
                ))}
              </HudPanel>
            </Reveal>
          ) : null}
          {closed.length > 0 ? (
            <Reveal index={3}>
              <HudPanel chamfer={12} tone="dim" style={styles.panel}>
                <SectionTitle icon={CircleCheck} title="Closed" right={`${closed.length}`} />
                {closed.map((goal) => (
                  <MissionRow key={goal.id} goal={goal} today={today} onAdvance={() => undefined} />
                ))}
              </HudPanel>
            </Reveal>
          ) : null}
          <Reveal index={4}>
            <View>
              <SystemButton label="New mission" icon={Plus} compact onPress={create} />
            </View>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.sm },
});
