import { create } from 'zustand'
import { getNumber, postAction } from './api'

type State = {
  value: number
  targetValue: number
  updatedAt?: string
  version?: number
  loading: boolean
  syncing: boolean
  error?: string
  lastAction?: 'increment'|'decrement'
  pollIntervalMs: number
  animateTo: (next:number) => void
  fetchNow: () => Promise<void>
  increment: () => Promise<void>
  decrement: () => Promise<void>
  startPolling: () => void
}

const ANIMATION_MS = 500

export const useStore = create<State>((set, get) => ({
  value: 0,
  targetValue: 0,
  loading: true,
  syncing: false,
  pollIntervalMs: 2000,

  animateTo: (next:number) => {
    const { value } = get()
    if (next === value) {
      set({ targetValue: next, value: next })
      return
    }
    const delta = next - value
    const start = performance.now()
    const step = (t:number) => {
      const elapsed = t - start
      const p = Math.min(1, elapsed / ANIMATION_MS)
      const current = Math.round(value + delta * p)
      set({ value: current, targetValue: next })
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  },

  fetchNow: async () => {
    try {
      set({ syncing: true })
      const n = await getNumber()
      const cur = get().value
      if (Math.abs(n.value - cur) > 1) {
        get().animateTo(n.value)
      } else {
        set({ value: n.value })
      }
      set({ updatedAt: n.updatedAt, version: n.version, error: undefined })
    } catch (e:any) {
      set({ error: e.message || 'Fetch failed' })
    } finally {
      set({ syncing: false, loading: false })
    }
  },

  increment: async () => {
    try {
      set({ syncing: true, lastAction: 'increment' })
      const n = await postAction('increment')
      const cur = get().value
      if (Math.abs(n.value - cur) > 1) {
        get().animateTo(n.value)
      } else {
        set({ value: n.value })
      }
      set({ updatedAt: n.updatedAt, version: n.version, error: undefined })
    } catch (e:any) {
      set({ error: e.message || 'Increment failed' })
    } finally {
      set({ syncing: false })
    }
  },

  decrement: async () => {
    try {
      set({ syncing: true, lastAction: 'decrement' })
      const n = await postAction('decrement')
      const cur = get().value
      if (Math.abs(n.value - cur) > 1) {
        get().animateTo(n.value)
      } else {
        set({ value: n.value })
      }
      set({ updatedAt: n.updatedAt, version: n.version, error: undefined })
    } catch (e:any) {
      set({ error: e.message || 'Decrement failed' })
    } finally {
      set({ syncing: false })
    }
  },

  startPolling: () => {
    const { pollIntervalMs, fetchNow } = get()
    fetchNow()
    setInterval(fetchNow, pollIntervalMs)
  }
}))
