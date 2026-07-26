import { useState } from 'react'
import type { Project } from '../../hooks/useProjects'
import { useLanguage } from '../../i18n/LanguageContext'
import { FF, L, rtlDir } from '../../lib/ui'

interface Props {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}

export default function ProjectSwitcher({ projects, activeProjectId, onSelect, onCreate }: Props) {
  const { locale } = useLanguage()
  const dir = rtlDir(locale)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const visible = projects.filter(p => !p.archived)

  const commit = () => {
    const trimmed = name.trim()
    if (trimmed) onCreate(trimmed)
    setName('')
    setCreating(false)
  }

  return (
    <div
      dir={dir}
      style={{
        display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto',
        borderBottom: '1px solid var(--border)', flexShrink: 0, fontFamily: FF,
      }}
    >
      {visible.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            background: p.id === activeProjectId ? '#7c3aed' : 'var(--surface-2)',
            color: p.id === activeProjectId ? 'white' : 'var(--text-muted)',
            border: `1px solid ${p.id === activeProjectId ? '#7c3aed' : 'var(--border)'}`,
          }}
        >
          {p.name}
        </button>
      ))}

      {creating ? (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setCreating(false) }}
            placeholder={L(locale, 'نام کارگاه...', 'اسم الموقع...', 'Site name...')}
            style={{
              width: 130, fontSize: 12, padding: '6px 10px', borderRadius: 20,
              border: '1px solid #7c3aed', background: 'var(--surface-2)', color: 'var(--text)',
              outline: 'none', fontFamily: FF,
            }}
          />
          <button onClick={commit} style={{ color: '#34d399', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✓</button>
          <button onClick={() => setCreating(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
            border: '1px dashed var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15,
          }}
          title={L(locale, 'کارگاه جدید', 'موقع جديد', 'New site')}
        >
          +
        </button>
      )}
    </div>
  )
}
