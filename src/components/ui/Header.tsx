import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title?: string;
  /** Small caps line above the title. */
  eyebrow?: string;
  back?: boolean;
  right?: ReactNode;
}

/** Secondary-screen header (editors, settings): back, title, actions. */
export function Header({ title, eyebrow, back, right }: Props) {
  return (
    <View style={styles.row}>
      {back ? <IconButton icon={ChevronLeft} label="Back" filled onPress={() => router.back()} /> : null}
      <View style={styles.titles}>
        {eyebrow ? (
          <Text variant="label" color={colors.gold}>
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit color={colors.cream} style={styles.title}>
            {title}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.md,
  },
  titles: { flex: 1, gap: 2 },
  title: { fontSize: 18, letterSpacing: 0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
