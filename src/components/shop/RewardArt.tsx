import { PixelArt, type PixelArtName } from '../pixel/PixelArt';

const REWARD_ART: Record<string, PixelArtName> = {
  burger: 'burger',
  film: 'popcorn',
  tv: 'popcorn',
  popcorn: 'popcorn',
  gamepad: 'gamepad',
  shirt: 'shirt',
  bed: 'bed',
  palm: 'mountain',
  coffee: 'coffee',
  book: 'book',
  gift: 'gift',
  bag: 'backpack',
};

/** Individual illustrated rewards; the full source sheet is never rendered. */
export function RewardArt({ name, width, height }: { name: string; width: number; height: number }) {
  return <PixelArt name={REWARD_ART[name] ?? 'chest'} width={width} height={height} />;
}