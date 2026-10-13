/** Deterministic pseudo-random in [0, 1). Keeps renders pure and demo data reproducible. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
