import { TriangleAlert } from 'lucide-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { RANKS } from '@/config/ranks';
import { colors, fonts, space } from '@/config/theme';
import { ROMAN, levelInfo } from '@/domain/progression';
import { haptics } from '@/services/haptics';
import { playSound } from '@/services/sound';
import { type FxEvent, useFx } from '@/state/fx';
import { useGame } from '@/state/game';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { CoinRing } from '../hud/StatBlock';
import { HoloArt } from '../hud/icons';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';
import { ParticleBurst } from './ParticleBurst';

/** Shows queued big moments one at a time, as System notifications. Tap to skip. */
export function FxHost() {
  const current = useFx((s) => s.queue[0]);
  const dismiss = useFx((s) => s.dismiss);
  const cue = useFx((s) => s.cue);

  useEffect(() => {
    if (!current) return;
    if (current.type === 'levelUp') {
      haptics.heavy();
      playSound('levelUp');
      cue('levelUp');
    } else if (current.type === 'perfectDay') {
      haptics.success();
      playSound('perfectDay');
      cue('victory');
    } else if (current.type === 'acquired') {
      haptics.success();
      playSound('purchase');
      cue('celebrate');
    } else {
      haptics.success();
      playSound('complete');
      cue('victory');
    }
    const timer = setTimeout(dismiss, current.type === 'acquired' ? 1400 : 1800);
    return () => clearTimeout(timer);
  }, [current, cue, dismiss]);

  if (!current) return null;
  return (
    <Animated.View key={current.id} entering={FadeIn.duration(180)} exiting={FadeOut.duration(200)} style={styles.root}>
      <Pressable style={styles.fill} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Moment event={current} />
      </Pressable>
    </Animated.View>
  );
}

function Moment({ event }: { event: FxEvent }) {
  switch (event.type) {
    case 'levelUp':
      return <LevelUp level={event.level} rankId={event.newRank?.id ?? null} />;
    case 'perfectDay':
      return <PerfectDay done={event.done} xp={event.xp} coins={event.coins} />;
    case 'acquired':
      return <Acquired name={event.name} icon={event.icon} cost={event.cost} />;
    case 'missionComplete':
      return (
        <SystemWindow>
          <Text style={styles.big} glow="strong">Mission complete</Text>
          <HoloArt name={event.icon} size={64} />
          <Text variant="heading" align="center">{event.name}</Text>
          <Text variant="label" align="center" color={colors.textMuted}>Objective achieved</Text>
        </SystemWindow>
      );
  }
}

/** The System window: framed panel with the "! NOTIFICATION" header. */
function SystemWindow({ children, flash = true }: { children: ReactNode; flash?: boolean }) {
  const reduced = useReducedMotion();
  const { box, onLayout } = useBox();
  const pop = useSharedValue(reduced ? 1 : 0.92);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.4)) }));
    if (flash) glow.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 900 })));
  }, [flash, glow, pop, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <Animated.View style={[styles.window, style]} onLayout={onLayout}>
      {box ? <HudFrame width={box.w} height={box.h} chamfer={14} tone="active" fill={colors.bgRaised} double highlight={glow} /> : null}
      <View style={styles.header}>
        <View style={styles.alert}>
          <TriangleAlert size={16} color={colors.cyanBright} strokeWidth={2} />
        </View>
        <Text variant="title" style={styles.headerText}>
          Notification
        </Text>
      </View>
      <View style={styles.rule} />
      {children}
      <ParticleBurst burstKey={reduced ? 0 : 1} color={colors.cyan} count={26} radius={170} duration={1200} />
    </Animated.View>
  );
}

function LevelUp({ level, rankId }: { level: number; rankId: string | null }) {
  const progress = levelInfo(useGame.getState().player.totalXp).progress;
  // The bar fills to the top, then resets into the new level.
  const [bar, setBar] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setBar(progress), 750);
    return () => clearTimeout(t);
  }, [progress]);
  const rankIndex = RANKS.findIndex((r) => r.id === rankId);
  const rank = rankIndex >= 0 ? RANKS[rankIndex] : null;
  return (
    <SystemWindow>
      <Text style={styles.big} glow="strong">
        {rank ? 'Rank up' : 'Level up'}
      </Text>
      <Text variant="body" color={colors.textDim} align="center">
        You have reached{' '}
        <Text variant="bodyStrong" color={colors.cyanBright}>
          Level {level}
        </Text>
        .
      </Text>
      <View style={styles.bar}>
        <ProgressBar progress={bar} height={8} />
      </View>
      {rank ? (
        <Animated.View entering={FadeIn.delay(400)} style={styles.center}>
          <Text variant="label">New title · {ROMAN[rankIndex]}</Text>
          <Text variant="title" glow color={colors.cyanBright}>
            {rank.name}
          </Text>
          <Text variant="caption">{rank.motto}</Text>
        </Animated.View>
      ) : null}
    </SystemWindow>
  );
}

function PerfectDay({ done, xp, coins }: { done: number; xp: number; coins: number }) {
  return (
    <SystemWindow>
      <Text style={styles.big} glow="strong">
        Day complete
      </Text>
      <Text style={styles.count} glow>
        {done} / {done}
      </Text>
      <Animated.View entering={FadeIn.delay(250)} style={styles.earned}>
        <Text variant="number" color={colors.cyanBright} glow>
          +{xp} XP
        </Text>
        <View style={styles.coin}>
          <CoinRing size={20} />
          <Text variant="number">+{coins}</Text>
        </View>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(700)}>
        <Text variant="label" align="center" color={colors.textMuted} style={styles.motto}>
          Disappear. Build. Return.
        </Text>
      </Animated.View>
    </SystemWindow>
  );
}

/** Confirmation, then the item art flies down into the Inventory tab. */
function Acquired({ name, icon, cost }: { name: string; icon: string; cost?: number }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const fly = useSharedValue(0);
  useEffect(() => {
    if (!reduced) fly.set(withDelay(750, withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) })));
  }, [fly, reduced]);
  const art = useAnimatedStyle(() => ({
    opacity: 1 - fly.get() * 0.9,
    transform: [
      { translateX: fly.get() * width * 0.36 },
      { translateY: fly.get() * height * 0.42 },
      { scale: 1 - fly.get() * 0.8 },
    ],
  }));
  return (
    <SystemWindow>
      <Text style={styles.big} glow="strong">
        Item acquired
      </Text>
      <Animated.View style={art}>
        <HoloArt name={icon} size={72} />
      </Animated.View>
      <Text variant="heading" align="center">
        {name}
      </Text>
      {cost !== undefined ? (
        <View style={styles.coin}>
          <CoinRing size={18} />
          <Text variant="bodyStrong" color={colors.cyanBright}>−{cost.toLocaleString('en-US')} GC</Text>
        </View>
      ) : null}
      <Text variant="label" align="center" color={colors.textMuted}>
        Moved to Inventory
      </Text>
    </SystemWindow>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, zIndex: 50 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  window: { width: '100%', maxWidth: 380, alignItems: 'center', gap: space.md, padding: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch' },
  alert: { width: 30, height: 30, borderWidth: 1, borderColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 15, letterSpacing: 5 },
  rule: { alignSelf: 'stretch', height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  big: { fontFamily: fonts.wordmark, fontSize: 30, lineHeight: 38, letterSpacing: 3, color: colors.cyanBright, textTransform: 'uppercase', textAlign: 'center' },
  count: { fontFamily: fonts.numberHeavy, fontSize: 48, lineHeight: 56, color: colors.text },
  bar: { alignSelf: 'stretch' },
  center: { alignItems: 'center', gap: space.xs },
  earned: { flexDirection: 'row', gap: space.xl, alignItems: 'center' },
  coin: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  motto: { marginTop: space.sm },
});
