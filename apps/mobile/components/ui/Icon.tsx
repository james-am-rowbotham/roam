import {
  ArrowLeft,
  Backpack,
  Calendar,
  ChevronRight,
  Home,
  Map as MapIcon,
  Mic,
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
  | 'search'
  | 'microphone'
  | 'calendar'
  | 'water'
  | 'food';

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
  search: Search,
  microphone: Mic,
  calendar: Calendar,
  water: Waves,
  food: UtensilsCrossed,
};

export function Icon({ name, size = 24, color = colors.text.primary }: Props) {
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={1.5} />;
}
