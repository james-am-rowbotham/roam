import { Stack } from 'expo-router';

// The Journey Setup wizard (Figma 08–12). State lives in journeySetupStore;
// each step is its own route so back/forward navigation just works.
export default function SetupLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
