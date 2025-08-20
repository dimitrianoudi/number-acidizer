import { Box, Center, VStack, Alert, AlertIcon, Spinner } from '@chakra-ui/react'
import NumberDisplay from './components/NumberDisplay'
import Controls from './components/Controls'
import { useEffect } from 'react'
import { useStore } from './store'

export default function App() {
  const { startPolling, loading, error } = useStore()

  useEffect(() => {
    startPolling()
  }, [startPolling])

  return (
    <Center minH="70vh">
      <VStack spacing={8}>
        {loading ? <Spinner size="xl" /> : <NumberDisplay />}
        <Controls />
        {error && <Alert status="error"><AlertIcon />{error}</Alert>}
      </VStack>
    </Center>
  )
}
