import { router } from 'expo-router';
import { Check, Plus, SlidersHorizontal, Store } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/hud/AppHeader';
import { HudPanel, HudPressable } from '@/components/hud/HudPanel';
import { CoinRing } from '@/components/hud/StatBlock';
import { SystemButton } from '@/components/hud/SystemButton';
import { LineIcon } from '@/components/hud/icons';
import { WorldScene } from '@/components/pixel/WorldScene';
import { RewardCard } from '@/components/shop/RewardCard';
import { CoinBalance } from '@/components/shop/CoinBalance';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReorderRow } from '@/components/ui/ReorderRow';
import { Reveal, Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { colors, space } from '@/config/theme';
import { getDb } from '@/db/database';
import { moved, saveOrder } from '@/repo/order';
import { type Reward, listRewards, purchaseReward } from '@/repo/rewards';
import { haptics } from '@/services/haptics';
import { useFx } from '@/state/fx';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';

/** One-tap starting points; they only prefill the editor. */
const SUGGESTIONS = [
  { name: 'Cheat Meal', icon: 'burger', cost: 150, category: 'Food & Lifestyle' },
  { name: 'Movie Night', icon: 'film', cost: 200, category: 'Entertainment' },
  { name: 'Gaming Session', icon: 'gamepad', cost: 120, category: 'Gaming' },
  { name: 'Buy a T-Shirt', icon: 'shirt', cost: 600, category: 'Merch' },
];

export default function ShopScreen() {
  const rewards = useLiveQuery(listRewards);
  const coins = useGame((s) => s.player.coins);
  const commit = useGame((s) => s.commit);
  const push = useFx((s) => s.push);
  const [managing, setManaging] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const purchasePending = useRef(false);

  const buy = async (reward: Reward) => {
    if (purchasePending.current) return false;
    purchasePending.current = true;
    setBuying(reward.id);
    try {
      const result = await purchaseReward(getDb(), reward.id);
      if (result.ok) {
        await commit();
        push({ type: 'acquired', name: reward.name, icon: reward.icon, cost: reward.cost });
        return true;
      } else {
        haptics.error();
        toast(
          result.reason === 'insufficient'
            ? `Not enough Ghost Coins. ${result.shortBy} more to go.`
            : result.reason === 'out_of_stock'
              ? 'Sold out.'
              : 'That reward no longer exists.',
          'error',
        );
      }
      return false;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not buy this reward. Please try again.', 'error');
      return false;
    } finally {
      purchasePending.current = false;
      setBuying(null);
    }
  };

  const edit = (reward: Reward) => router.push({ pathname: '/reward-editor', params: { id: String(reward.id) } });
  const list = rewards ?? [];
  const pairs: Reward[][] = [];
  for (let i = 0; i < list.length; i += 2) pairs.push(list.slice(i, i + 2));

  return (
    <Screen header={<AppHeader />}>
      <Reveal index={0}>
        <WorldScene variant="shop" title="The reward shop" subtitle="Small rewards. A brighter you." height={164} />
      </Reveal>
      <Reveal index={1}>
        <HudPanel double padding={space.md} style={styles.wallet}>
          <CoinRing size={40} />
          <View style={styles.walletText}>
            <Text variant="label">Ghost Coins</Text>
            <Text variant="caption">Earned in real life. Yours to spend.</Text>
          </View>
          <View accessible accessibilityLabel={`${coins} Ghost Coins`}><CoinBalance value={coins} style={styles.balanceNumber} /></View>
        </HudPanel>
      </Reveal>

      {rewards && list.length === 0 ? (
        <Reveal index={2}>
          <View style={styles.gap}>
            <EmptyState
              icon={Store}
              title="Stock your little shop"
              message="Pick something worth working toward. Buy it with the Ghost Coins you earn from your habits."
              action={{ label: 'Create a reward', onPress: () => router.push('/reward-editor') }}
            />
            <Text variant="label">Quick start</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <HudPressable
                  key={s.name}
                  style={styles.suggestion}
                  chamfer={6}
                  onPress={() =>
                    router.push({
                      pathname: '/reward-editor',
                      params: { name: s.name, icon: s.icon, cost: String(s.cost), category: s.category },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Create ${s.name}`}
                >
                  <LineIcon name={s.icon} size={22} />
                  <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                    {s.name}
                  </Text>
                </HudPressable>
              ))}
            </View>
          </View>
        </Reveal>
      ) : managing ? (
        <View style={styles.gap}>
          {list.map((reward, i) => (
            <ReorderRow
              key={reward.id}
              label={reward.name}
              onPress={() => edit(reward)}
              onMove={async (d) => {
                await saveOrder(getDb(), 'rewards', moved(list.map((r) => r.id), i, d));
                await commit();
              }}
              first={i === 0}
              last={i === list.length - 1}
            >
              <LineIcon name={reward.icon} size={22} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {reward.name}
                </Text>
                <Text variant="caption">{reward.cost} coins</Text>
              </View>
            </ReorderRow>
          ))}
        </View>
      ) : (
        <View style={styles.gap}>
          {pairs.map((pair, row) => (
            <Reveal key={pair[0].id} index={2 + row}>
              <View style={styles.pair}>
                {pair.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    balance={coins}
                    busy={buying === reward.id}
                    onBuy={() => buy(reward)}
                    onEdit={() => edit(reward)}
                  />
                ))}
                {pair.length === 1 ? <View style={styles.flex} /> : null}
              </View>
            </Reveal>
          ))}
        </View>
      )}

      {list.length > 0 ? (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <SystemButton label="New reward" icon={Plus} compact onPress={() => router.push('/reward-editor')} />
          </View>
          <View style={styles.flex}>
            <SystemButton
              label={managing ? 'Done' : 'Manage'}
              icon={managing ? Check : SlidersHorizontal}
              compact
              onPress={() => setManaging((m) => !m)}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  walletText: { flex: 1, gap: space.xs },
  balanceNumber: { fontSize: 30, lineHeight: 38, flexShrink: 1, color: colors.coin },
  gap: { gap: space.md },
  pair: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  suggestion: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52 },
  actions: { flexDirection: 'row', gap: space.md },
});
