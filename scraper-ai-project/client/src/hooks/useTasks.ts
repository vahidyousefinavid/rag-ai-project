import { useState, useEffect, useCallback } from 'react'

export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  order: number
  created_at: string
}

const BASE = '/api'

export default function useTasks() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/tasks`)
      if (!res.ok) throw new Error('Failed to load tasks')
      setTasks(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addTask = useCallback(async (title: string, priority: TaskPriority = 'medium', description?: string) => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, description }),
    })
    const task: Task = await res.json()
    setTasks(prev => [...prev, task])
    return task
  }, [])

  const addBulk = useCallback(async (items: { title: string; description?: string | null; priority?: string }[], sourceText?: string) => {
    await fetch(`${BASE}/tasks/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: items, source_text: sourceText }),
    })
    await load()
  }, [load])

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await fetch(`${BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' })
  }, [])

  const updateTask = useCallback(async (id: string, patch: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'order'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    await fetch(`${BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  // Group by status for the kanban board
  const byStatus = {
    todo:        tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done:        tasks.filter(t => t.status === 'done'),
  }

  return { tasks, byStatus, loading, error, addTask, addBulk, moveTask, deleteTask, updateTask, reload: load }
}
