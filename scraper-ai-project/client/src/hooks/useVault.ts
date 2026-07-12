import { useState, useEffect, useCallback } from 'react'

export interface VaultEntry {
  id: string
  title: string
  username: string | null
  url: string | null
  notes: string | null
  category: string
  created_at: string
  updated_at: string
}

export interface VaultFormData {
  title: string
  username?: string
  password: string
  url?: string
  notes?: string
  category?: string
}

const BASE = '/api/vault'

export default function useVault() {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(BASE)
      if (!res.ok) throw new Error('Failed to load vault')
      setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addEntry = useCallback(async (data: VaultFormData) => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const entry: VaultEntry = await res.json()
    setEntries(prev => [entry, ...prev])
  }, [])

  const updateEntry = useCallback(async (id: string, data: Partial<VaultFormData>) => {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated: VaultEntry = await res.json()
    setEntries(prev => prev.map(e => e.id === id ? updated : e))
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    await fetch(`${BASE}/${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const revealPassword = useCallback(async (id: string): Promise<string> => {
    const res = await fetch(`${BASE}/${id}/reveal`)
    if (!res.ok) return ''
    const { password } = await res.json()
    return password as string
  }, [])

  return { entries, loading, addEntry, updateEntry, deleteEntry, revealPassword, reload: load }
}
