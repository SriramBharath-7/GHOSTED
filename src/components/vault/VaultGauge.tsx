import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { PixelArt } from '../pixel/PixelArt';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

/** A quiet day marker and treasure chest; progress is supplied by the Vault summary. */
export function VaultGauge({ days, progress, size = 264 }: { days: number; progress: number; size?: number }) {
  return (
    <View style={[styles.marker, { maxWidth: size, minHeight: size }]} accessible accessibilityLabel={`${days} days`}>
      <View style={styles.chest}>
        <PixelArt name="chest" size={92} />
      </View>
      <Text variant="label" color={colors.vaultDim}>Current streak</Text>
      <View style={styles.valueRow}>
        <Text style={styles.days} numberOfLines={1} adjustsFontSizeToFit>{days}</Text>
        <Text style={styles.unit}>{days === 1 ? 'day' : 'days'}</Text>
      </View>
      <View style={styles.track}>
        <ProgressBar progress={progress} color={colors.gold} height={10} />
      </View>
      <Text variant="caption" color={colors.vaultDim}>One day at a time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg },
  chest: { alignItems: 'center', marginBottom: space.xs },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  days: { fontFamily: fonts.numberHeavy, fontSize: 64, lineHeight: 70, color: colors.gold, maxWidth: '80%' },
  unit: { fontFamily: fonts.display, fontSize: 12, color: colors.vaultText },
  track: { width: '100%', marginVertical: space.xs },
});
