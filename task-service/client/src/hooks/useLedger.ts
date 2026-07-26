import { useState, useCallback } from 'react'

export interface LedgerSummary {
  by_person: { person_name: string; total_amount: number; count: number }[]
  by_item: { item: string; total_amount: number; count: number }[]
  totals: Record<string, number>
}

const BASE = '/api'

export default function useLedger() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(async (projectId: string | null, dateFrom?: string, dateTo?: string) => {
    if (!projectId) { setSummary(null); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ project_id: projectId })
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await fetch(`${BASE}/ledger/summary?${params}`)
      if (!res.ok) throw new Error('Failed to load summary')
      setSummary(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const ask = useCallback(async (projectId: string | null, question: string, dateFrom?: string, dateTo?: string) => {
    const res = await fetch(`${BASE}/ledger/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, question, date_from: dateFrom, date_to: dateTo }),
    })
    if (!res.ok) throw new Error('Failed to get answer')
    const data = await res.json()
    return data.reply as string
  }, [])

  return { summary, loading, fetchSummary, ask }
}
