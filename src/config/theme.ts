/** GHOSTED: one small pixel world. Parchment, timber, forest and sunlight. */
export const colors = {
  bg: '#E8DABB', bgRaised: '#F5E8C8', scrim: 'rgba(15, 27, 24, 0.82)',
  panel: '#FFF3D3', panelStrong: '#FFF5DC', surface: '#F3E4C2',
  surfaceHigh: '#EBD5A8', surfacePressed: '#DCE9B8',
  line: '#D6BF94', lineStrong: '#B28A59', border: '#9D673C', borderActive: '#DCA451',
  text: '#292C27', textDim: '#5C5848', textMuted: '#756D57',
  cyan: '#23844D', cyanBright: '#1C5B3D', blue: '#397CA0', xp: '#23844D',
  coin: '#996017', success: '#23844D', danger: '#98552A', warning: '#996017', brand: '#23844D',
  wood: '#593822', woodDark: '#33271F', cream: '#FFF3D3', gold: '#E9B44C',
  forest: '#193B32', ink: '#202B26', sky: '#8CCCEC',
  // Crimson belongs only to the hidden room. Public destructive controls use amber.
  vault: '#C54A50', vaultText: '#FFF0C5', vaultDim: '#C3AA92', vaultPanel: '#242635', vaultBg: '#151B29',
} as const;
export const ACCENTS = ['#23844D', '#397CA0', '#B77A25', '#6E63A7', '#37877F', '#A95886', '#6C7D3A', '#94643C', '#52657B'] as const;
export const fonts = {
  wordmark: 'PixelTitle', display: 'PixelHeading', displaySemi: 'PixelHeading', displayMedium: 'PixelHeading',
  body: 'Exo2_400Regular', bodyMedium: 'Exo2_500Medium', bodySemi: 'Exo2_600SemiBold',
  number: 'Exo2_700Bold', numberHeavy: 'Exo2_800ExtraBold',
} as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 0, md: 2, lg: 4, xl: 6, pill: 999 } as const;
export const chamfer = { sm: 4, md: 6, lg: 8 } as const;
export const TOUCH = 48;
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}
export const motion = { press: 80, fast: 150, base: 220, slow: 420, stagger: 35, ceremony: 1400 } as const;
/** Crisp offset shadows replace neon bloom; existing text props remain compatible. */
export const glow = {
  text: { textShadowColor: '#BDA475', textShadowRadius: 0, textShadowOffset: { width: 0, height: 1 } },
  textSoft: { textShadowColor: 'transparent', textShadowRadius: 0, textShadowOffset: { width: 0, height: 0 } },
  textDanger: { textShadowColor: 'transparent', textShadowRadius: 0, textShadowOffset: { width: 0, height: 0 } },
  frame: { outer: 0, mid: 0, active: 0.3 },
} as const;
