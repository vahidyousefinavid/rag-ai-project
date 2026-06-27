import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import KanbanBoard from '../components/tasks/KanbanBoard'
import AudioRecorder from '../components/tasks/AudioRecorder'
import useTasks from '../hooks/useTasks'

export default function TasksPage() {
  const { t } = useLanguage()
  const { addBulk } = useTasks()

  const handleTasksReady = async (
    tasks: { title: string; description: string | null; priority: string }[],
    sourceText: string,
  ) => {
    await addBulk(tasks, sourceText)
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Header */}
      <div
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="px-4 py-2.5 flex items-center gap-3 flex-shrink-0"
      >
        <span style={{ color: 'var(--text)' }} className="text-sm font-semibold flex-1">
          {t.tasksTitle}
        </span>
        <AudioRecorder onTasksReady={handleTasksReady} />
        <LanguageSwitcher />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  )
}
