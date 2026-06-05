import { Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter'
import { SplashScreen, Stack } from 'expo-router'
import { useEffect } from 'react'
import { colors } from '../theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold })

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync()
  }, [loaded, error])

  if (!loaded && !error) return null

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.app },
      }}
    />
  )
}
