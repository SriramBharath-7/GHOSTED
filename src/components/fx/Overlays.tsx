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
import { PixelArt } from '../pixel/PixelArt';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';
import { ParticleBurst } from './ParticleBurst';

/** Shows queued milestones one at a time in the adventure log. Tap to skip. */
export function FxHost() {
  const current = useFx((s) => s.queue[0]);
  const dismiss = useFx((s) => s.dismiss);
  const cue = useFx((s) => s.cue);
  const reduced = useReducedMotion();

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
    <Animated.View key={current.id} entering={reduced ? undefined : FadeIn.duration(180)} exiting={reduced ? undefined : FadeOut.duration(200)} style={styles.root}>
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
          <PixelArt name="trophy" size={80} />
          <Text style={styles.big}>Mission complete!</Text>
          <HoloArt name={event.icon} size={40} />
          <Text variant="heading" align="center">{event.name}</Text>
          <Text variant="caption" align="center" color={colors.textDim}>Another adventure, conquered.</Text>
        </SystemWindow>
      );
  }
}

/** Parchment celebration window with a timber title bar. */
function SystemWindow({ children, flash = true }: { children: ReactNode; flash?: boolean }) {
  const reduced = useReducedMotion();
  const { box, onLayout } = useBox();
  const pop = useSharedValue(reduced ? 1 : 0.92);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pop.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.4)) }));
    if (flash) glow.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 420 })));
  }, [flash, glow, pop, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <Animated.View style={[styles.window, style]} onLayout={onLayout}>
      {box ? <HudFrame width={box.w} height={box.h} chamfer={14} tone="cyan" fill={colors.panel} double highlight={glow} /> : null}
      <View style={styles.header}>
        <PixelArt name="star" size={22} />
        <Text variant="title" style={styles.headerText}>
          Adventure log
        </Text>
      </View>
      {children}
      <Text variant="caption" color={colors.textMuted}>Tap to continue</Text>
      <ParticleBurst burstKey={reduced ? 0 : 1} color={colors.success} count={22} radius={150} duration={900} />
    </Animated.View>
  );
}

function LevelUp({ level, rankId }: { level: number; rankId: string | null }) {
  const reduced = useReducedMotion();
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
      <PixelArt name="crown" size={80} />
      <Text style={styles.big}>
        {rank ? 'Rank up!' : 'Level up!'}
      </Text>
      <Text variant="body" color={colors.textDim} align="center">
        You have reached{' '}
        <Text variant="bodyStrong" color={colors.success}>
          Level {level}
        </Text>
        .
      </Text>
      <View style={styles.bar}>
        <ProgressBar progress={bar} height={8} />
      </View>
      {rank ? (
        <Animated.View entering={reduced ? undefined : FadeIn.delay(400)} style={styles.center}>
          <Text variant="label">New title · {ROMAN[rankIndex]}</Text>
          <Text variant="title" color={colors.success} align="center">
            {rank.name}
          </Text>
          <Text variant="caption" align="center">{rank.motto}</Text>
        </Animated.View>
      ) : null}
    </SystemWindow>
  );
}

function PerfectDay({ done, xp, coins }: { done: number; xp: number; coins: number }) {
  const reduced = useReducedMotion();
  return (
    <SystemWindow>
      <PixelArt name="ghostCelebrate" size={88} />
      <Text style={styles.big}>
        Perfect day!
      </Text>
      <Text style={styles.count}>
        {done} / {done}
      </Text>
      <Text variant="caption">Every quest complete. That’s a day well spent.</Text>
      <Animated.View entering={reduced ? undefined : FadeIn.delay(250)} style={styles.earned}>
        <Text variant="number" color={colors.success}>
          +{xp} XP
        </Text>
        <View style={styles.coin}>
          <CoinRing size={20} />
          <Text variant="number" color={colors.coin}>+{coins}</Text>
        </View>
      </Animated.View>
      <Animated.View entering={reduced ? undefined : FadeIn.delay(700)}>
        <Text variant="caption" align="center" color={colors.textDim} style={styles.motto}>
          A better you. Every day.
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
      <Text style={styles.big}>
        Item acquired!
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
          <Text variant="bodyStrong" color={colors.coin}>−{cost.toLocaleString('en-US')} GC</Text>
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
  window: { width: '100%', maxWidth: 380, alignItems: 'center', gap: space.md, padding: space.xl, zIndex: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, alignSelf: 'stretch', padding: space.sm, backgroundColor: colors.wood, borderBottomWidth: 3, borderBottomColor: colors.gold },
  headerText: { fontSize: 11, letterSpacing: 0, color: colors.cream },
  big: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: colors.success, textTransform: 'uppercase', textAlign: 'center' },
  count: { fontFamily: fonts.numberHeavy, fontSize: 40, lineHeight: 46, color: colors.text },
  bar: { alignSelf: 'stretch' },
  center: { alignItems: 'center', gap: space.xs },
  earned: { flexDirection: 'row', gap: space.xl, alignItems: 'center' },
  coin: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  motto: { marginTop: space.sm },
});
