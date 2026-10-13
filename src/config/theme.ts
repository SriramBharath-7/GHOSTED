/**
 * GHOSTED "System" design tokens. Components never hard-code colors, fonts,
 * spacing or timings. The app is cyan/blue; red belongs to the private Vault.
 */

export const colors = {
  // Backdrop
  bg: '#03070D',
  bgRaised: '#06101C',
  scrim: 'rgba(1, 4, 9, 0.86)',

  // Translucent HUD surfaces (layered over the textured backdrop)
  panel: 'rgba(5, 16, 30, 0.72)',
  panelStrong: 'rgba(6, 20, 36, 0.9)',
  surface: 'rgba(8, 26, 46, 0.55)',
  surfaceHigh: 'rgba(14, 42, 68, 0.6)',
  surfacePressed: 'rgba(32, 96, 140, 0.32)',

  // Lines
  line: 'rgba(79, 216, 255, 0.14)',
  lineStrong: 'rgba(79, 216, 255, 0.32)',
  border: 'rgba(79, 216, 255, 0.58)',
  borderActive: '#8BEAFF',

  // Ink
  text: '#EAF7FF',
  textDim: '#A6C1D4',
  textMuted: '#6F8DA5',

  // Signal
  cyan: '#4FD8FF',
  cyanBright: '#C2F4FF',
  blue: '#2A8CFF',
  xp: '#4FD8FF',
  coin: '#EAF7FF',
  success: '#45E3A8',
  danger: '#FF3B4E',
  warning: '#FFB547',
  brand: '#4FD8FF',
  vault: '#FF3B4E',
} as const;

/** Per-habit accents: kept subtle (a thin tick), the UI itself stays cyan. */
export const ACCENTS = [
  '#4FD8FF',
  '#2A8CFF',
  '#7FB4FF',
  '#3DE0D0',
  '#45E3A8',
  '#B49CFF',
  '#FF8FB1',
  '#FFB547',
  '#EAF7FF',
] as const;

export const fonts = {
  /** Wordmark only. */
  wordmark: 'Orbitron_900Black',
  /** Section titles: "DAILY DISCIPLINE". */
  display: 'Orbitron_700Bold',
  displaySemi: 'Orbitron_600SemiBold',
  /** Small caps labels: "GHOST COINS". */
  displayMedium: 'Orbitron_500Medium',
  body: 'Exo2_400Regular',
  bodyMedium: 'Exo2_500Medium',
  bodySemi: 'Exo2_600SemiBold',
  /** Values: levels, coins, percentages. */
  number: 'Exo2_700Bold',
  numberHeavy: 'Exo2_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** HUD shapes are sharp: chamfers instead of round corners. */
export const radius = { sm: 3, md: 4, lg: 6, xl: 10, pill: 999 } as const;
export const chamfer = { sm: 6, md: 10, lg: 14 } as const;

/** Standard Android touch target. */
export const TOUCH = 48;

/** '#RRGGBB' + 0..1 alpha → '#RRGGBBAA'. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}

/** Durations (ms). Everyday interactions stay under ~300ms. */
export const motion = {
  press: 90,
  fast: 160,
  base: 240,
  slow: 420,
  stagger: 45,
  /** Big moments only. */
  ceremony: 1400,
} as const;

/** Glow is reserved for active states, XP, completion and big moments. */
export const glow = {
  text: { textShadowColor: 'rgba(79, 216, 255, 0.85)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  textSoft: { textShadowColor: 'rgba(79, 216, 255, 0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  textDanger: { textShadowColor: 'rgba(255, 59, 78, 0.7)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
  /** Stroke opacities for the layered SVG glow around frames. */
  frame: { outer: 0.07, mid: 0.14, active: 0.3 },
} as const;
