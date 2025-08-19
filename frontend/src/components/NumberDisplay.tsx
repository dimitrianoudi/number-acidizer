import { Heading, Text, VStack, Badge } from '@chakra-ui/react'
import { useStore } from '../store'

export default function NumberDisplay() {
  const { value, syncing, updatedAt, version } = useStore()
  return (
    <VStack spacing={2}>
      <Heading size="3xl" textAlign="center">{value.toLocaleString()}</Heading>
      <Text fontSize="sm" color="gray.500">
        updated {updatedAt ? new Date(updatedAt).toLocaleString() : '—'} · v{version ?? 0}
      </Text>
      {syncing && <Badge colorScheme="blue">syncing…</Badge>}
    </VStack>
  )
}
