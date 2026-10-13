import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import type { Reward } from '@/repo/rewards';
import { HudPanel } from '../hud/HudPanel';
import { CoinRing } from '../hud/StatBlock';
import { SystemButton } from '../hud/SystemButton';
import { HoloArt } from '../hud/icons';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

interface Props {
  reward: Reward;
  balance: number;
  onBuy: () => Promise<boolean>;
  onEdit: () => void;
  busy?: boolean;
}

/**
 * A reward you defined for yourself. BUY arms on the first tap ("CONFIRM")
 * and buys on the second, so a stray tap never spends coins.
 */
export function RewardCard({ reward, balance, onBuy, onEdit, busy }: Props) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [acquired, setAcquired] = useState(false);
  const purchasing = useRef(false);
  const scale = useSharedValue(1);
  const soldOut = reward.stock !== null && reward.stock <= 0;
  const short = Math.max(0, reward.cost - balance);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  useEffect(() => {
    if (!acquired) return;
    if (!reduced) scale.set(withSequence(withTiming(0.975, { duration: 110 }), withTiming(1, { duration: 200 })));
    const timer = setTimeout(() => setAcquired(false), 1100);
    return () => clearTimeout(timer);
  }, [acquired, reduced, scale]);
  const feedback = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const buy = async () => {
    if (purchasing.current || busy) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    purchasing.current = true;
    setArmed(false);
    try {
      if (await onBuy()) setAcquired(true);
    } finally {
      purchasing.current = false;
    }
  };

  const label = acquired ? 'Acquired!' : soldOut ? 'Sold out' : short ? `Need ${short}` : armed ? 'Confirm' : 'Buy';
  const artSize = Math.min(90, (Math.min(width, 520) - space.lg * 2 - space.md - space.md * 4) / 3);
  return (
    <Animated.View style={[styles.flex, feedback]}>
    <HudPanel double tone={acquired ? 'active' : 'cyan'} padding={space.md} style={styles.card}>
      <PressableScale
        scaleTo={0.98}
        onLongPress={onEdit}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel={`${reward.name}, ${reward.cost} coins. Long press to edit`}
        style={styles.body}
      >
        <Text style={styles.name} numberOfLines={2}>
          {reward.name}
        </Text>
        <View style={[styles.art, acquired && styles.artAcquired]}><HoloArt name={reward.icon} size={artSize} /></View>
        {reward.category ? <Text variant="caption" style={styles.category} numberOfLines={1}>{reward.category}</Text> : null}
        {reward.description ? (
          <Text variant="caption" numberOfLines={2} style={styles.desc}>
            {reward.description}
          </Text>
        ) : null}
      </PressableScale>
      <View style={styles.rule} />
      <View style={styles.price}>
        <CoinRing size={24} />
        <Text variant="number" color={colors.coin} style={styles.cost} numberOfLines={1} adjustsFontSizeToFit>
          {reward.cost.toLocaleString('en-US')}
        </Text>
        {reward.stock !== null && !soldOut ? (
          <Text variant="label" style={styles.stock}>
            {reward.stock} left
          </Text>
        ) : null}
      </View>
      <SystemButton
        label={label}
        compact
        kind="primary"
        disabled={acquired || soldOut || short > 0}
        busy={busy}
        accessibilityHint={armed ? `Spend ${reward.cost} Ghost Coins` : 'Tap once to review, then confirm the purchase'}
        onPress={() => void buy()}
      />
    </HudPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: space.sm },
  flex: { flex: 1 },
  body: { gap: space.sm, flex: 1 },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 100, backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.line, paddingVertical: space.sm },
  artAcquired: { backgroundColor: '#D4E7AE' },
  category: { fontSize: 10, lineHeight: 13, color: colors.textMuted },
  name: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 22, minHeight: 44, color: colors.text },
  desc: { minHeight: 34, fontSize: 12, lineHeight: 17 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  price: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  cost: { fontSize: 24, flexShrink: 1 },
  stock: { marginLeft: 'auto', fontSize: 9, letterSpacing: 0 },
});
