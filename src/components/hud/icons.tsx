import {
  Ban,
  Beer,
  Bike,
  BookOpen,
  Brain,
  BedDouble,
  CakeSlice,
  ChartNoAxesColumnIncreasing,
  CigaretteOff,
  CloudCog,
  Code,
  Coffee,
  Cpu,
  Droplet,
  Dumbbell,
  Film,
  Footprints,
  Gamepad2,
  Gift,
  Hamburger,
  Headphones,
  HeartPulse,
  IceCreamCone,
  Laptop,
  Leaf,
  type LucideIcon,
  MountainSnow,
  Music,
  PenLine,
  Pill,
  Pizza,
  Plane,
  Popcorn,
  Rocket,
  Salad,
  Shield,
  Shirt,
  ShoppingBag,
  Sofa,
  Sparkles,
  Target,
  Timer,
  TreePalm,
  Trophy,
  Tv,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/config/theme';
import { PixelArt, type PixelArtName } from '../pixel/PixelArt';
import { RewardArt } from '../shop/RewardArt';
import { Text } from '../ui/Text';

/** Line icons by key. Stored in the database so the art survives restyles. */
const ICONS: Record<string, LucideIcon> = {
  brain: Brain,
  dumbbell: Dumbbell,
  laptop: Laptop,
  chart: ChartNoAxesColumnIncreasing,
  droplet: Droplet,
  book: BookOpen,
  leaf: Leaf,
  run: Footprints,
  footprints: Footprints,
  pill: Pill,
  bed: BedDouble,
  salad: Salad,
  pen: PenLine,
  'no-smoking': CigaretteOff,
  target: Target,
  code: Code,
  cloud: CloudCog,
  heart: HeartPulse,
  music: Music,
  bike: Bike,
  mountain: MountainSnow,
  timer: Timer,
  cpu: Cpu,
  shield: Shield,
  trophy: Trophy,
  rocket: Rocket,
  burger: Hamburger,
  pizza: Pizza,
  film: Film,
  popcorn: Popcorn,
  tv: Tv,
  gamepad: Gamepad2,
  shirt: Shirt,
  coffee: Coffee,
  cake: CakeSlice,
  headphones: Headphones,
  plane: Plane,
  gift: Gift,
  sparkles: Sparkles,
  beer: Beer,
  bag: ShoppingBag,
  palm: TreePalm,
  sofa: Sofa,
  'ice-cream': IceCreamCone,
};

/** Stored keys stay unchanged; only their visual representation changes. */
const PIXEL_ICONS: Partial<Record<string, PixelArtName>> = {
  brain: 'brain', dumbbell: 'dumbbell', book: 'book', 'no-junk': 'apple', laptop: 'book', chart: 'flame',
  leaf: 'apple', trophy: 'trophy', mountain: 'mountain',
  burger: 'burger', film: 'popcorn', popcorn: 'popcorn', tv: 'popcorn',
  gamepad: 'gamepad', shirt: 'shirt', coffee: 'coffee', gift: 'gift',
  sparkles: 'star', bed: 'bed', bag: 'backpack', palm: 'tree',
};

export const HABIT_ICONS = [
  'brain', 'dumbbell', 'laptop', 'chart', 'no-junk', 'droplet', 'book', 'leaf', 'run',
  'pill', 'bed', 'salad', 'pen', 'no-smoking', 'target', 'heart', 'timer', 'code',
] as const;

export const MISSION_ICONS = [
  'target', 'code', 'run', 'cloud', 'book', 'dumbbell', 'brain', 'laptop', 'heart',
  'bike', 'mountain', 'rocket', 'trophy', 'shield', 'pen', 'music',
] as const;

export const REWARD_ICONS = [
  'burger', 'pizza', 'film', 'popcorn', 'tv', 'gamepad', 'shirt', 'coffee', 'cake',
  'headphones', 'plane', 'gift', 'sparkles', 'beer', 'bag', 'palm', 'bed', 'book', 'sofa', 'ice-cream',
] as const;

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Renders a line icon by key; anything unknown (an emoji) is drawn as text. */
export function LineIcon({ name, size = 22, color = colors.cyan, strokeWidth = 1.7 }: IconProps) {
  const pixel = PIXEL_ICONS[name];
  if (pixel) return <PixelArt name={pixel} size={size} />;
  if (name === 'no-junk') {
    return (
      <View style={{ width: size, height: size }}>
        <View style={styles.center}>
          <Hamburger size={size * 0.55} color={color} strokeWidth={strokeWidth} />
        </View>
        <Ban size={size} color={color} strokeWidth={strokeWidth} />
      </View>
    );
  }
  const Icon = ICONS[name];
  if (!Icon) {
    return (
      <Text style={{ fontSize: size * 0.82, lineHeight: size * 1.05 }} accessibilityElementsHidden>
        {name}
      </Text>
    );
  }
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

/**
 * Large "hologram" rendering of an icon for Shop and Inventory art: a soft
 * glow pass, the crisp line pass and faint scanlines. Static, cheap.
 */
export function HoloArt({ name, size = 84, lite = false }: { name: string; size?: number; lite?: boolean }) {
  if (['burger', 'film', 'tv', 'popcorn', 'gamepad', 'shirt', 'bed', 'palm', 'coffee', 'gift', 'bag', 'book', 'sparkles'].includes(name)) {
    return (
      <View style={styles.holo} accessibilityElementsHidden>
        <RewardArt name={name} width={size * 1.5} height={size * 1.15} />
      </View>
    );
  }
  return (
    <View style={[styles.holo, { width: size * 1.5, height: size * 1.15 }]} accessibilityElementsHidden>
      <View style={styles.center}>
        <LineIcon name={name} size={size * (lite ? 0.85 : 1)} color={colors.wood} strokeWidth={2.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  holo: { alignSelf: 'center' },
});
