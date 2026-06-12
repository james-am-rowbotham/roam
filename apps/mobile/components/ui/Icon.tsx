import {
  ArrowLeft,
  ArrowLeftRight,
  Backpack,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  X as Close,
  Cloud,
  Combine,
  Flag,
  Home,
  LocateFixed,
  Map as MapIcon,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Route,
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
  | 'chevron-up'
  | 'cloud'
  | 'locate'
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
  | 'close'
  | 'more'
  | 'flag'
  | 'robot'
  | 'route';

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
  'chevron-up': ChevronUp,
  cloud: Cloud,
  locate: LocateFixed,
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
  more: MoreHorizontal,
  flag: Flag,
  robot: Bot,
  route: Route,
};

export function Icon({ name, size = 24, color = colors.text.primary }: Props) {
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={1.5} />;
}
