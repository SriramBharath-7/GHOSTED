import { HudTabs } from '../hud/HudTabs';

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Two-to-four option switch; the HUD tab control under a simpler name. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return <HudTabs options={options} value={value} onChange={onChange} height={46} />;
}
