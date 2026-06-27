import { useRef } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import type { TaskPriority, TaskStatus } from '../../hooks/useTasks'
import useTasks from '../../hooks/useTasks'
import TaskColumn from './TaskColumn'

const COLUMNS: { status: TaskStatus; titleKey: 'colTodo' | 'colInProgress' | 'colDone'; accent: string }[] = [
  { status: 'todo',        titleKey: 'colTodo',        accent: '#6366f1' },
  { status: 'in_progress', titleKey: 'colInProgress',  accent: '#f59e0b' },
  { status: 'done',        titleKey: 'colDone',        accent: '#34d399' },
]

export default function KanbanBoard() {
  const { t } = useLanguage()
  const { byStatus, addTask, moveTask, deleteTask } = useTasks()
  const draggingId = useRef<string | null>(null)

  const handleDragStart = (_e: React.DragEvent, id: string) => {
    draggingId.current = id
  }

  const handleDrop = (_e: React.DragEvent, status: TaskStatus) => {
    if (draggingId.current) {
      moveTask(draggingId.current, status)
      draggingId.current = null
    }
  }

  const handleAdd = async (title: string, priority: TaskPriority) => {
    await addTask(title, priority)
  }

  return (
    <div className="flex gap-3 h-full p-4 min-w-0">
      {COLUMNS.map(col => (
        <TaskColumn
          key={col.status}
          status={col.status}
          title={t[col.titleKey]}
          accent={col.accent}
          tasks={byStatus[col.status]}
          onMove={moveTask}
          onDelete={deleteTask}
          onAdd={(title, priority) => handleAdd(title, priority)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}

// Re-export addBulk so AudioRecorder can use it via the same hook instance
export { useTasks }
