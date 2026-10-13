import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { HudPressable } from './HudPanel';
import { LineIcon } from './icons';

/** Grid of line icons; the chosen one is framed and lit. */
export function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {icons.map((icon) => {
        const active = icon === value;
        return (
          <HudPressable
            key={icon}
            onPress={() => onChange(icon)}
            tone={active ? 'active' : 'dim'}
            chamfer={5}
            padding={0}
            scaleTo={0.9}
            feedback
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Icon ${icon}`}
            style={styles.cell}
          >
            <LineIcon name={icon} size={30} color={active ? colors.cyanBright : colors.textDim} />
          </HudPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
});
