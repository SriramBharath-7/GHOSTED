import { Image, Platform, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';

/** Individually cropped art: Metro bundles only these small images, never an atlas. */
export const pixelSources = {
  dawn: require('../../../assets/pixel/dawn.png'),
  night: require('../../../assets/pixel/night.png'),
  ghost: require('../../../assets/pixel/ghost.png'),
  ghostCelebrate: require('../../../assets/pixel/ghostCelebrate.png'),
  player: require('../../../assets/pixel/player.png'),
  hero: require('../../../assets/pixel/hero.png'),
  merchant: require('../../../assets/pixel/merchant.png'),
  chest: require('../../../assets/pixel/chest.png'),
  backpack: require('../../../assets/pixel/backpack.png'),
  lantern: require('../../../assets/pixel/lantern.png'),
  tree: require('../../../assets/pixel/tree.png'),
  brain: require('../../../assets/pixel/brain.png'),
  dumbbell: require('../../../assets/pixel/dumbbell.png'),
  book: require('../../../assets/pixel/book.png'),
  flame: require('../../../assets/pixel/flame.png'),
  apple: require('../../../assets/pixel/apple.png'),
  coin: require('../../../assets/pixel/coin.png'),
  crown: require('../../../assets/pixel/crown.png'),
  trophy: require('../../../assets/pixel/trophy.png'),
  star: require('../../../assets/pixel/star.png'),
  burger: require('../../../assets/pixel/burger.png'),
  popcorn: require('../../../assets/pixel/popcorn.png'),
  gamepad: require('../../../assets/pixel/gamepad.png'),
  shirt: require('../../../assets/pixel/shirt.png'),
  bed: require('../../../assets/pixel/bed.png'),
  coffee: require('../../../assets/pixel/coffee.png'),
  gift: require('../../../assets/pixel/gift.png'),
  map: require('../../../assets/pixel/map.png'),
  mountain: require('../../../assets/pixel/mountain.png'),
  flag: require('../../../assets/pixel/flag.png'),
  home: require('../../../assets/pixel/home.png'),
  calendar: require('../../../assets/pixel/calendar.png'),
  swords: require('../../../assets/pixel/swords.png'),
  shop: require('../../../assets/pixel/shop.png'),
  settings: require('../../../assets/pixel/settings.png'),
  bell: require('../../../assets/pixel/bell.png'),
} as const;

export type PixelArtName = keyof typeof pixelSources;
export const pixelArtNames = Object.keys(pixelSources) as PixelArtName[];

interface PixelArtProps {
  name: PixelArtName;
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  accessibilityLabel?: string;
}

const crispWebPixels = Platform.OS === 'web'
  ? ({ imageRendering: 'pixelated' } as ImageStyle)
  : undefined;

/** Decorative by default; give meaningful stand-alone art an accessibility label. */
export function PixelArt({ name, size = 48, width = size, height = size, style, resizeMode = 'contain', accessibilityLabel }: PixelArtProps) {
  return (
    <Image
      source={pixelSources[name]}
      style={[{ width, height }, crispWebPixels, style]}
      resizeMode={resizeMode}
      fadeDuration={0}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no'}
    />
  );
}
