import { useState, useEffect, useCallback } from 'react'

export type NoteKind     = 'text' | 'voice'
export type NoteCategory = 'general' | 'site_log' | 'labor' | 'purchase' | 'expense' | 'reminder'
export type EntryType    = 'labor_payment' | 'purchase' | 'expense' | 'income' | 'other'

export interface LedgerEntry {
  id: string
  note_id: string
  project_id: string | null
  entry_type: EntryType
  person_name: string | null
  item: string | null
  amount: number | null
  occurred_at: string
}

export interface Note {
  id: string
  project_id: string | null
  kind: NoteKind
  category: NoteCategory
  content: string
  note_date: string
  created_at: string
  ledger_entries: LedgerEntry[]
}

const BASE = '/api'

export default function useNotes(projectId: string | null) {
  const [notes, setNotes]     = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) { setNotes([]); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/notes?project_id=${encodeURIComponent(projectId)}`)
      if (!res.ok) throw new Error('Failed to load notes')
      setNotes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const addTextNote = useCallback(async (content: string, category: NoteCategory) => {
    const res = await fetch(`${BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, category, content }),
    })
    if (!res.ok) throw new Error('Failed to save note')
    const note: Note = await res.json()
    setNotes(prev => [note, ...prev])
    return note
  }, [projectId])

  const addVoiceNote = useCallback(async (blob: Blob, category: NoteCategory) => {
    const form = new FormData()
    form.append('file', blob, 'note.webm')
    if (projectId) form.append('project_id', projectId)
    form.append('category', category)
    const res = await fetch(`${BASE}/notes/voice`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Failed to save voice note')
    const note: Note = await res.json()
    setNotes(prev => [note, ...prev])
    return note
  }, [projectId])

  const updateNote = useCallback(async (id: string, patch: Partial<Pick<Note, 'content' | 'category'>>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))
    await fetch(`${BASE}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await fetch(`${BASE}/notes/${id}`, { method: 'DELETE' })
  }, [])

  return { notes, loading, addTextNote, addVoiceNote, updateNote, deleteNote, reload: load }
}
