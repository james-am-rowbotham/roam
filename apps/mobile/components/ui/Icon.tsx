import {
  ArrowLeft,
  ArrowLeftRight,
  Backpack,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  X as Close,
  Home,
  Map as MapIcon,
  Mic,
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
  | 'search'
  | 'microphone'
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
  search: Search,
  microphone: Mic,
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
