import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { levelInfo, rankFor } from '@/domain/progression';
import type { PlayerSnapshot } from '@/state/game';
import { GhostAvatar } from '../hud/GhostAvatar';
import { HudPanel } from '../hud/HudPanel';
import { CoinRing } from '../hud/StatBlock';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

/** The player card: Ghost on the left, identity and progression on the right. */
export function PlayerCard({ player, name }: { player: PlayerSnapshot; name: string }) {
  const { width } = useWindowDimensions();
  const level = levelInfo(player.totalXp);
  const rank = rankFor(level.level, player.perfectDays);
  const inner = Math.min(width, 520) - space.lg * 2 - space.md * 2;
  const avatarW = Math.round(inner * 0.46);
  const avatarH = Math.round(avatarW * 1.32);

  return (
    <HudPanel double chamfer={16} padding={space.md} style={styles.card}>
      <GhostAvatar width={avatarW} height={avatarH} />
      <View style={styles.info}>
        <Field label="Name">
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {name}
          </Text>
        </Field>
        <Field label="Level">
          <AnimatedNumber
            value={level.level}
            variant="hero"
            format={(n) => String(Math.round(n)).padStart(2, '0')}
            glow
          />
        </Field>
        <Field label="Title" divider={false}>
          <View style={styles.titleBox}>
            <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit>
              {rank.rank.name}
            </Text>
          </View>
        </Field>
        <Field label="Ghost Coins" divider={false}>
          <View style={styles.coins} accessible accessibilityLabel={`${player.coins} Ghost Coins`}>
            <CoinRing size={26} />
            <AnimatedNumber value={player.coins} variant="number" style={styles.coinValue} color={player.coins < 0 ? colors.danger : colors.text} />
          </View>
        </Field>
        <View style={styles.xp} accessible accessibilityLabel={`${level.xpIntoLevel} of ${level.xpForNext} XP to level ${level.level + 1}`}>
          <Text variant="label" style={styles.xpLabel}>
            XP
          </Text>
          <View style={styles.xpRow}>
            <View style={styles.flex}>
              <ProgressBar progress={level.progress} height={6} />
            </View>
            <Text style={styles.xpText} numberOfLines={1}>
              {level.xpIntoLevel} / {level.xpForNext}
            </Text>
          </View>
        </View>
      </View>
    </HudPanel>
  );
}

function Field({ label, children, divider = true }: { label: string; children: ReactNode; divider?: boolean }) {
  return (
    <View style={[styles.field, divider && styles.divider]}>
      <Text variant="label" style={styles.fieldLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md },
  info: { flex: 1, justifyContent: 'space-between', gap: 2 },
  field: { gap: 1, paddingBottom: 4 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineStrong },
  fieldLabel: { fontSize: 9.5, letterSpacing: 2 },
  name: { fontFamily: fonts.number, fontSize: 28, lineHeight: 34, color: colors.text },
  titleBox: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    marginTop: 2,
  },
  titleText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  coins: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coinValue: { fontSize: 26, lineHeight: 31 },
  xp: { gap: 3 },
  xpLabel: { fontSize: 9.5 },
  xpRow: { gap: 4 },
  flex: { width: '100%' },
  xpText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textDim, fontVariant: ['tabular-nums'] },
});
