import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MapScreen } from './screens/MapScreen'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapScreen />
    </QueryClientProvider>
  )
}
