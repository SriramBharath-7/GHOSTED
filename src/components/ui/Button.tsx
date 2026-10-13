import type { LucideIcon } from 'lucide-react-native';
import { SystemButton } from '../hud/SystemButton';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: LucideIcon;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
}

/** App-wide button: a SystemButton under the older prop names. */
export function Button({ kind = 'primary', ...rest }: Props) {
  return <SystemButton {...rest} kind={kind === 'secondary' ? 'outline' : kind} />;
}
