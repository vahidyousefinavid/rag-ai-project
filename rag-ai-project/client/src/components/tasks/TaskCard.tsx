import { useState } from 'react'
import type { Task, TaskStatus } from '../../hooks/useTasks'
import { useLanguage } from '../../i18n/LanguageContext'

interface Props {
  task: Task
  onMove:   (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
}

const PRIORITY_STYLES: Record<string, { bg: string; label: string }> = {
  high:   { bg: 'rgba(239,68,68,0.15)',   label: 'text-red-400' },
  medium: { bg: 'rgba(245,158,11,0.15)',  label: 'text-amber-400' },
  low:    { bg: 'rgba(59,130,246,0.12)',  label: 'text-blue-400' },
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo:        'in_progress',
  in_progress: 'done',
  done:        null,
}
const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo:        null,
  in_progress: 'todo',
  done:        'in_progress',
}

export default function TaskCard({ task, onMove, onDelete, onDragStart }: Props) {
  const { t } = useLanguage()
  const [confirming, setConfirming] = useState(false)
  const pStyle = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium

  const next = NEXT_STATUS[task.status]
  const prev = PREV_STATUS[task.status]

  const nextLabel = task.status === 'todo' ? t.moveToInProgress : t.moveToDone
  const prevLabel = t.moveToTodo

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        cursor: 'grab',
      }}
      className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 group hover:border-white/20 transition-colors select-none"
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{ background: pStyle.bg }}
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${pStyle.label}`}
          dir="ltr"
        >
          {t[`priority${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}` as 'priorityLow' | 'priorityMedium' | 'priorityHigh']}
        </span>

        {/* Delete */}
        {confirming ? (
          <div className="flex gap-1">
            <button
              onClick={() => onDelete(task.id)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-1"
            >✓</button>
            <button
              onClick={() => setConfirming(false)}
              style={{ color: 'var(--text-muted)' }}
              className="text-xs transition-colors px-1"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            style={{ color: 'var(--text-muted)' }}
            className="opacity-0 group-hover:opacity-100 text-xs hover:text-red-400 transition-all"
            title={t.deleteTask}
          >✕</button>
        )}
      </div>

      {/* Title */}
      <p style={{ color: 'var(--text)' }} className="text-sm leading-snug font-medium">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p style={{ color: 'var(--text-muted)' }} className="text-xs leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-0.5" dir="ltr">
        {prev && (
          <button
            onClick={() => onMove(task.id, prev)}
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            className="text-xs px-2 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          >
            ← {prevLabel}
          </button>
        )}
        {next && (
          <button
            onClick={() => onMove(task.id, next)}
            style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
            className="text-xs px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </div>
  )
}
