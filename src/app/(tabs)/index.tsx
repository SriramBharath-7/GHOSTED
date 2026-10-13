import { DailyPanel } from '@/components/daily/DailyPanel';
import { AppHeader } from '@/components/hud/AppHeader';
import { PlayerCard } from '@/components/player/PlayerCard';
import { StatsStrip } from '@/components/player/StatsStrip';
import { Reveal, Screen } from '@/components/ui/Screen';
import { useGame } from '@/state/game';

export default function PlayerScreen() {
  const player = useGame((s) => s.player);
  const name = useGame((s) => s.settings.playerName);
  const today = useGame((s) => s.today);

  return (
    <Screen header={<AppHeader />}>
      <Reveal index={0}>
        <PlayerCard player={player} name={name} />
      </Reveal>
      <Reveal index={1}>
        <StatsStrip />
      </Reveal>
      <Reveal index={2}>
        <DailyPanel date={today} />
      </Reveal>
    </Screen>
  );
}
