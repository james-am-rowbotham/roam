import { Tabs } from 'expo-router';
import { Icon, type IconName } from '../../components/ui';
import { colors, type } from '../../theme';

// Active tab reads as the darkest text; inactive is muted. No pill/highlight —
// the colour step alone carries the state, and the accent never reaches it.
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Icon name={name} size={22} color={focused ? colors.text.primary : colors.text.secondary} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: { backgroundColor: colors.bg.surface },
        tabBarLabelStyle: { ...type.tab },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: 'Journeys',
          tabBarIcon: ({ focused }) => <TabIcon name="backpack" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
