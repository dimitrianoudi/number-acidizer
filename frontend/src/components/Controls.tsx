import { Button, ButtonGroup } from '@chakra-ui/react'
import { useStore } from '../store'

export default function Controls() {
  const { increment, decrement, syncing } = useStore()
  return (
    <ButtonGroup isAttached variant="outline">
      <Button onClick={decrement} isDisabled={syncing}>decrement</Button>
      <Button onClick={increment} isDisabled={syncing}>increment</Button>
    </ButtonGroup>
  )
}
