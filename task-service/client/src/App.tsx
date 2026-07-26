import { useState } from 'react'
import TasksPage from './pages/TasksPage'
import NotesPage from './pages/NotesPage'
import ProjectSwitcher from './components/notes/ProjectSwitcher'
import useProjects from './hooks/useProjects'
import { useLanguage } from './i18n/LanguageContext'
import './index.css'

type View = 'tasks' | 'notes'

export default function App() {
  const [view, setView] = useState<View>('tasks')
  const { t } = useLanguage()
  const { projects, activeProjectId, setActiveProjectId, addProject } = useProjects()

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top nav bar */}
      <nav
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
        dir="ltr"
      >
        {(['tasks', 'notes'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              color: view === v ? '#fff' : 'var(--text-muted)',
              background: view === v ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${view === v ? 'var(--border)' : 'transparent'}`,
            }}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:text-white"
          >
            {v === 'tasks' ? t.navTasks : t.navNotes}
          </button>
        ))}
      </nav>

      {view === 'notes' && (
        <ProjectSwitcher
          projects={projects}
          activeProjectId={activeProjectId}
          onSelect={setActiveProjectId}
          onCreate={addProject}
        />
      )}

      {/* Page content */}
      <div className="flex flex-1 min-h-0 w-full">
        {view === 'tasks' ? <TasksPage /> : <NotesPage projectId={activeProjectId} />}
      </div>
    </div>
  )
}
