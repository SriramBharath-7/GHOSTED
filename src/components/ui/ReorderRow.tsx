import { ArrowDown, ArrowUp } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '@/config/theme';
import { HudPanel } from '../hud/HudPanel';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  onPress: () => void;
  onMove?: (direction: -1 | 1) => void;
  first?: boolean;
  last?: boolean;
  label: string;
}

/** A managed list row: tap to edit, arrows to reorder. */
export function ReorderRow({ children, onPress, onMove, first, last, label }: Props) {
  return (
    <HudPanel tone="dim" chamfer={6} padding={0} style={styles.row}>
      <PressableScale style={styles.body} scaleTo={0.98} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Edit ${label}`}>
        {children}
      </PressableScale>
      {onMove ? (
        <View style={styles.arrows}>
          <IconButton icon={ArrowUp} size={18} label={`Move ${label} up`} disabled={first} onPress={() => onMove(-1)} />
          <IconButton icon={ArrowDown} size={18} label={`Move ${label} down`} disabled={last} onPress={() => onMove(1)} />
        </View>
      ) : null}
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  arrows: { flexDirection: 'row' },
});
