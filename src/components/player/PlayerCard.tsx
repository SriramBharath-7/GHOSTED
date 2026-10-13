import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { levelInfo, rankFor } from '@/domain/progression';
import type { PlayerSnapshot } from '@/state/game';
import { HudPanel } from '../hud/HudPanel';
import { CoinRing } from '../hud/StatBlock';
import { PixelArt } from '../pixel/PixelArt';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

/** A compact adventurer passport. Progression is read from the existing engine. */
export function PlayerCard({ player, name }: { player: PlayerSnapshot; name: string }) {
  const level = levelInfo(player.totalXp);
  const rank = rankFor(level.level, player.perfectDays);

  return (
    <HudPanel double padding={space.md} style={styles.card}>
      <View style={styles.identity}>
        <View style={styles.portrait}><PixelArt name="player" size={74} /></View>
        <View style={styles.info}>
          <Text variant="label" style={styles.eyebrow}>Adventurer</Text>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
          <Text variant="caption" numberOfLines={1}>{rank.rank.name}</Text>
        </View>
        <View style={styles.level} accessible accessibilityLabel={`Level ${level.level}`}>
          <Text variant="label">Level</Text>
          <AnimatedNumber value={level.level} variant="hero" style={styles.levelNumber} />
        </View>
      </View>
      <View style={styles.progress} accessible accessibilityLabel={`${level.xpIntoLevel} of ${level.xpForNext} XP to level ${level.level + 1}`}>
        <View style={styles.progressLabels}>
          <Text variant="label" color={colors.success}>Experience</Text>
          <Text variant="caption">{level.xpIntoLevel} / {level.xpForNext} XP</Text>
        </View>
        <ProgressBar progress={level.progress} height={10} color={colors.xp} />
      </View>
      <View style={styles.footer}>
        <Text variant="caption">Next stop: level {level.level + 1}</Text>
        <View style={styles.coins} accessible accessibilityLabel={`${player.coins} Ghost Coins`}>
          <CoinRing size={22} />
          <AnimatedNumber value={player.coins} variant="number" style={styles.coinValue} color={player.coins < 0 ? colors.danger : colors.coin} />
          <Text variant="caption">GC</Text>
        </View>
      </View>
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  portrait: { width: 78, height: 78, backgroundColor: colors.sky, borderWidth: 2, borderColor: colors.wood, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  info: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: { fontSize: 9 },
  name: { fontFamily: fonts.display, fontSize: 23, lineHeight: 30, color: colors.text },
  level: { alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.lineStrong, paddingLeft: space.md },
  levelNumber: { fontSize: 37, lineHeight: 43 },
  progress: { gap: 5 },
  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coinValue: { fontSize: 21, lineHeight: 25 },
});
