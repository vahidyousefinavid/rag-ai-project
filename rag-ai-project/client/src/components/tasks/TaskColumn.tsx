import { useState } from 'react'
import type { Task, TaskStatus, TaskPriority } from '../../hooks/useTasks'
import { useLanguage } from '../../i18n/LanguageContext'
import TaskCard from './TaskCard'

interface Props {
  status:      TaskStatus
  title:       string
  accent:      string          // CSS color for the column header dot
  tasks:       Task[]
  onMove:      (id: string, status: TaskStatus) => void
  onDelete:    (id: string) => void
  onAdd:       (title: string, priority: TaskPriority) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop:      (e: React.DragEvent, status: TaskStatus) => void
}

export default function TaskColumn({ status, title, accent, tasks, onMove, onDelete, onAdd, onDragStart, onDrop }: Props) {
  const { t } = useLanguage()
  const [draft, setDraft]       = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [over, setOver]         = useState(false)
  const [adding, setAdding]     = useState(false)

  const handleAdd = () => {
    if (!draft.trim()) return
    onAdd(draft.trim(), priority)
    setDraft('')
    setPriority('medium')
    setAdding(false)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, status) }}
      style={{
        background: over ? 'rgba(255,255,255,0.03)' : 'var(--surface)',
        border: `1px solid ${over ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      className="flex flex-col rounded-2xl min-h-0 flex-1"
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ background: accent }} className="w-2 h-2 rounded-full flex-shrink-0" />
          <span style={{ color: 'var(--text)' }} className="text-sm font-semibold">{title}</span>
          <span
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            className="text-xs px-1.5 py-0.5 rounded-full"
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          style={{ color: 'var(--text-muted)' }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-lg leading-none"
          title={t.addTask}
        >
          +
        </button>
      </div>

      {/* Add-task inline form */}
      {adding && (
        <div className="px-3 pb-2 flex flex-col gap-1.5" dir="ltr">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder={t.taskPlaceholder}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-600/60 transition-colors placeholder-zinc-600"
          />
          <div className="flex gap-1.5 items-center">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              className="text-xs rounded px-1.5 py-1 outline-none"
            >
              <option value="low">{t.priorityLow}</option>
              <option value="medium">{t.priorityMedium}</option>
              <option value="high">{t.priorityHigh}</option>
            </select>
            <button
              onClick={handleAdd}
              style={{ background: draft.trim() ? 'var(--accent)' : 'var(--surface-2)', color: '#fff' }}
              className="text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              disabled={!draft.trim()}
            >
              {t.addTask}
            </button>
            <button
              onClick={() => setAdding(false)}
              style={{ color: 'var(--text-muted)' }}
              className="text-xs hover:text-white transition-colors"
            >✕</button>
          </div>
        </div>
      )}

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {tasks.length === 0 && !adding && (
          <p style={{ color: 'var(--text-muted)' }} className="text-xs text-center py-6 opacity-50">
            {t.noTasks}
          </p>
        )}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onMove={onMove}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}
