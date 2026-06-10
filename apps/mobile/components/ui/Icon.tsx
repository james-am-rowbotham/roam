import {
  ArrowLeft,
  ArrowLeftRight,
  Backpack,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  X as Close,
  Combine,
  Home,
  Map as MapIcon,
  Mic,
  Pause,
  Play,
  Plus,
  Search,
  User,
  UtensilsCrossed,
  Waves,
} from 'lucide-react-native';
import { colors } from '../../theme';

export type IconName =
  | 'home'
  | 'map'
  | 'backpack'
  | 'user'
  | 'arrow-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'swap'
  | 'check'
  | 'combine'
  | 'search'
  | 'microphone'
  | 'play'
  | 'pause'
  | 'plus'
  | 'calendar'
  | 'water'
  | 'food'
  | 'close';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

const icons: Record<IconName, React.ElementType> = {
  home: Home,
  map: MapIcon,
  backpack: Backpack,
  user: User,
  'arrow-left': ArrowLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  swap: ArrowLeftRight,
  check: Check,
  combine: Combine,
  search: Search,
  microphone: Mic,
  play: Play,
  pause: Pause,
  plus: Plus,
  calendar: Calendar,
  water: Waves,
  food: UtensilsCrossed,
  close: Close,
};

export function Icon({ name, size = 24, color = colors.text.primary }: Props) {
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={1.5} />;
}
