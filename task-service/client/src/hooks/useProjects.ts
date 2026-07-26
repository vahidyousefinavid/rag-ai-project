import { useState, useEffect, useCallback } from 'react'

export interface Project {
  id: string
  name: string
  archived: boolean
  created_at: string
}

const BASE = '/api'
const LS_ACTIVE_KEY = 'active_project_id'

export default function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(false)
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(LS_ACTIVE_KEY)
  )

  const setActiveProjectId = useCallback((id: string) => {
    localStorage.setItem(LS_ACTIVE_KEY, id)
    setActiveProjectIdState(id)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/projects`)
      if (!res.ok) throw new Error('Failed to load projects')
      const data: Project[] = await res.json()
      setProjects(data)
      setActiveProjectIdState(prev => {
        if (prev && data.some(p => p.id === prev)) return prev
        const first = data.find(p => !p.archived)
        if (first) { localStorage.setItem(LS_ACTIVE_KEY, first.id); return first.id }
        localStorage.removeItem(LS_ACTIVE_KEY)
        return null
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addProject = useCallback(async (name: string) => {
    const res = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const project: Project = await res.json()
    setProjects(prev => [...prev, project])
    setActiveProjectId(project.id)
    return project
  }, [setActiveProjectId])

  const updateProject = useCallback(async (id: string, patch: Partial<Pick<Project, 'name' | 'archived'>>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
    await fetch(`${BASE}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    await fetch(`${BASE}/projects/${id}`, { method: 'DELETE' })
  }, [])

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null

  return {
    projects, activeProject, activeProjectId, setActiveProjectId,
    loading, addProject, updateProject, deleteProject, reload: load,
  }
}
