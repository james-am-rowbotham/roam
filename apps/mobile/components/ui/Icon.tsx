import {
  ArrowLeft,
  ArrowLeftRight,
  Backpack,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  X as Close,
  Cloud,
  Combine,
  Compass,
  Flag,
  Home,
  LocateFixed,
  Map as MapIcon,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCw,
  Route,
  Search,
  TriangleAlert,
  User,
  WifiOff,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

// All stroke icons: 24 grid, 2.0px stroke, round caps/joins.
const STROKE_WIDTH = 2;

interface GlyphProps {
  size?: number;
  color?: string;
}

// Custom glyphs from the Figma icon masters (icon/stay 602:51,
// icon/water-bottle 145:64, icon/food 170:78) — not in lucide.
function makeGlyph(paths: string[]) {
  return function Glyph({ size = 24, color = colors.text.primary }: GlyphProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {paths.map((d) => (
          <Path
            key={d}
            d={d}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    );
  };
}

// Hut with door.
const Stay = makeGlyph(['M4.4 10.6L12 4.6L19.6 10.6M6.4 9.2V19H17.6V9.2M10.4 19V14.4H13.6V19']);

// Droplet with interior ripple arc.
const WaterBottle = makeGlyph([
  'M12 3.8C12 3.8 7 9.8 7 13.2C7 14.526 7.527 15.798 8.464 16.736C9.402 17.673 10.674 18.2 12 18.2C13.326 18.2 14.598 17.673 15.536 16.736C16.473 15.798 17 14.526 17 13.2C17 9.8 12 3.8 12 3.8Z',
  'M10.8 13.6C10.8 14.237 11.053 14.847 11.503 15.297C11.953 15.747 12.564 16 13.2 16',
]);

// Camp pot with two steam curls.
const Food = makeGlyph([
  'M4.8 10.4H19.2M6 10.4V14.6C6 15.125 6.103 15.645 6.304 16.131C6.505 16.616 6.8 17.057 7.172 17.428C7.922 18.179 8.939 18.6 10 18.6H14C15.061 18.6 16.078 18.179 16.828 17.428C17.579 16.678 18 15.661 18 14.6V10.4M9.7 7.6C9.7 6.4 10.7 6.4 10.7 5.2M13.5 7.6C13.5 6.4 14.5 6.4 14.5 5.2',
]);

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
  | 'stay'
  | 'water'
  | 'food'
  | 'close'
  | 'more'
  | 'flag'
  | 'guide'
  | 'route'
  | 'alert'
  | 'retry'
  | 'wifi-off';

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
  stay: Stay,
  water: WaterBottle,
  food: Food,
  close: Close,
  more: MoreHorizontal,
  flag: Flag,
  guide: Compass,
  route: Route,
  alert: TriangleAlert,
  retry: RotateCw,
  'wifi-off': WifiOff,
};

export function Icon({ name, size = 24, color = colors.text.primary }: Props) {
  const Component = icons[name];
  return <Component size={size} color={color} strokeWidth={STROKE_WIDTH} />;
}
