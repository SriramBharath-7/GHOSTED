import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import { Text } from '../ui/Text';
import { PixelArt, type PixelArtName } from './PixelArt';

type World = 'home' | 'daily' | 'missions' | 'shop' | 'inventory' | 'intel' | 'vault' | 'settings';
interface Props { variant?: World; title?: string; subtitle?: string; height?: number; compact?: boolean }

const SCENES: Record<World, { place: string; prop: PixelArtName }> = {
  home: { place: 'A brighter tomorrow', prop: 'hero' },
  daily: { place: 'The daily trail', prop: 'hero' },
  missions: { place: 'Beyond the horizon', prop: 'hero' },
  shop: { place: 'The village market', prop: 'merchant' },
  inventory: { place: 'Your travel pack', prop: 'backpack' },
  intel: { place: 'The field journal', prop: 'hero' },
  vault: { place: 'A quiet place', prop: 'chest' },
  settings: { place: 'Base camp', prop: 'lantern' },
};

/** A tiny diorama, assembled from prepared sprites. Only the foreground motes move.
 * The single native animation stops on blur/background and obeys Reduce Motion.
 */
export function WorldScene({ variant = 'home', title, subtitle, height, compact = false }: Props) {
  const night = variant === 'vault';
  const scene = SCENES[variant];
  const sceneHeight = height ?? (compact ? 118 : 190);
  const reduced = useReducedMotion();
  const breeze = useSharedValue(0);
  useFocusEffect(useCallback(() => {
    const update = (state: string | null) => {
      cancelAnimation(breeze);
      if (!reduced && state !== 'background' && state !== 'inactive') {
        breeze.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
      } else breeze.set(0);
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener('change', update);
    return () => { subscription.remove(); cancelAnimation(breeze); };
  }, [breeze, reduced]));
  const drift = useAnimatedStyle(() => ({ opacity: 0.4 + breeze.get() * 0.45, transform: [{ translateY: breeze.get() * -5 }] }));
  const companion = useAnimatedStyle(() => ({ transform: [{ translateY: breeze.get() * -4 }] }));
  const showGhost = scene.prop !== 'hero';
  return (
    <View style={[styles.frame, { minHeight: sceneHeight, backgroundColor: night ? colors.vaultBg : colors.sky }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PixelArt name={night ? 'night' : 'dawn'} resizeMode="cover" style={styles.landscape} />
        <PixelArt name="tree" width={85} height={sceneHeight * 0.9} style={[styles.tree, night && { opacity: 0.55 }]} />
        <View style={[styles.ground, { backgroundColor: night ? '#212D32' : '#325C36' }]} />
        <View style={styles.earth} />
        <PixelArt name={scene.prop} width={compact ? 110 : 158} height={sceneHeight * 0.76} style={styles.prop} />
        {showGhost ? <Animated.View style={[styles.companion, companion]}><PixelArt name="ghost" size={compact ? 34 : 48} /></Animated.View> : null}
        <Animated.View style={[styles.motes, drift]}>
          {[0,1,2,3,4].map((i) => <View key={i} style={[styles.mote, { left: `${12 + i * 19}%`, top: 14 + (i % 3) * 24 }]} />)}
        </Animated.View>
      </View>
      <View style={[styles.sign, compact && styles.compactSign]}>
        <Text style={styles.place}>{scene.place}</Text>
        {title ? <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View pointerEvents="none" style={styles.topEdge} />
      <View pointerEvents="none" style={styles.cornerLeft} />
      <View pointerEvents="none" style={styles.cornerRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 3, borderColor: colors.woodDark, overflow: 'hidden', justifyContent: 'center', marginBottom: 3 },
  landscape: { position: 'absolute', width: '100%', height: '100%' },
  tree: { position: 'absolute', right: -25, bottom: 9 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, borderTopWidth: 4, borderColor: '#8BA94B' },
  earth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, backgroundColor: colors.wood },
  prop: { position: 'absolute', right: 2, bottom: 9 },
  companion: { position: 'absolute', right: 116, bottom: 13 },
  sign: { width: '57%', backgroundColor: '#3F3024ED', borderWidth: 2, borderColor: '#B9874F', padding: space.md, margin: space.md, gap: 6 },
  compactSign: { width: '62%', padding: space.sm, margin: space.sm, gap: 4 },
  place: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 14, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.cream },
  compactTitle: { fontSize: 15, lineHeight: 20 },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: '#F7DEAD' },
  motes: { position: 'absolute', left: 0, right: 0, top: 8, height: 80 },
  mote: { position: 'absolute', width: 3, height: 3, backgroundColor: '#FFF6B9' },
  topEdge: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: '#FFF5C780' },
  cornerLeft: { position: 'absolute', left: 2, top: 2, width: 4, height: 4, backgroundColor: colors.gold },
  cornerRight: { position: 'absolute', right: 2, top: 2, width: 4, height: 4, backgroundColor: colors.gold },
});
