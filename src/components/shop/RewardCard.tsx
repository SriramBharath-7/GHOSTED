import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import type { Reward } from '@/repo/rewards';
import { HudPanel } from '../hud/HudPanel';
import { IconBox } from '../hud/IconBox';
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

  const label = acquired ? 'Acquired' : soldOut ? 'Sold out' : short ? `Need ${short}` : armed ? 'Confirm' : 'Buy';
  const artSize = Math.min(88, (Math.min(width, 520) - space.lg * 2 - space.md - space.md * 4) / 3);
  return (
    <Animated.View style={[styles.flex, feedback]}>
    <HudPanel chamfer={12} tone={acquired ? 'active' : 'cyan'} padding={space.md} style={styles.card}>
      <PressableScale
        scaleTo={0.98}
        onLongPress={onEdit}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel={`${reward.name}, ${reward.cost} coins. Long press to edit`}
        style={styles.body}
      >
        <View style={styles.tags}>
          <IconBox icon={reward.icon} size={28} />
          {reward.category ? (
            <View style={styles.tag}>
              <Text variant="label" style={styles.tagText} numberOfLines={1}>
                {reward.category}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {reward.name}
        </Text>
        <HoloArt name={reward.icon} size={artSize} />
        {reward.description ? (
          <Text variant="caption" numberOfLines={2} style={styles.desc}>
            {reward.description}
          </Text>
        ) : null}
      </PressableScale>
      <View style={styles.rule} />
      <View style={styles.price}>
        <CoinRing size={24} />
        <Text variant="number" glow={!short && !soldOut}>
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
        kind={armed || acquired ? 'primary' : 'outline'}
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
  tags: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tag: { flexShrink: 1, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { fontSize: 8.5, letterSpacing: 1.4 },
  name: { fontFamily: fonts.bodySemi, fontSize: 19, lineHeight: 24, minHeight: 48, color: colors.text },
  desc: { minHeight: 36 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  price: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stock: { marginLeft: 'auto', fontSize: 9 },
});
