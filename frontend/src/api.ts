import { v4 as uuidv4 } from 'uuid'

const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || ''

export type ApiNumber = { value:number; updatedAt:string; version:number }

export async function getNumber(): Promise<ApiNumber> {
  const res = await fetch(`${BASE}/number`, { method: 'GET' })
  if (!res.ok) throw new Error('Failed to fetch number')
  return res.json()
}

export async function postAction(action: 'increment'|'decrement', idemKey?: string): Promise<ApiNumber & {idempotent?:boolean}> {
  const key = idemKey || uuidv4()
  const res = await fetch(`${BASE}/number`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ action })
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body?.error || 'Request failed'), { detail: body })
  }
  return res.json()
}
