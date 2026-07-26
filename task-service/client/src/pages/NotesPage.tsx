import { useMemo, useState } from 'react'
import useNotes from '../hooks/useNotes'
import type { NoteCategory } from '../hooks/useNotes'
import NoteCard from '../components/notes/NoteCard'
import AddNoteSheet from '../components/notes/AddNoteSheet'
import AnalysisView from '../components/notes/AnalysisView'
import { useLanguage } from '../i18n/LanguageContext'
import { FF, L, rtlDir } from '../lib/ui'

type SubView = 'home' | 'list' | 'analysis'
type FilterKey = NoteCategory | 'all'

interface Props {
  projectId: string | null
}

const CATEGORY_FILTERS: { key: FilterKey; label: [string, string, string] }[] = [
  { key: 'all',       label: ['همه', 'الكل', 'All'] },
  { key: 'general',   label: ['روزمره', 'يومي', 'General'] },
  { key: 'site_log',  label: ['گزارش کارگاه', 'تقرير الموقع', 'Site log'] },
  { key: 'labor',     label: ['دستمزد', 'أجور', 'Labor'] },
  { key: 'purchase',  label: ['خرید/ابزار', 'شراء/أدوات', 'Purchase'] },
  { key: 'expense',   label: ['هزینه', 'مصروفات', 'Expense'] },
  { key: 'reminder',  label: ['یادآوری', 'تذكير', 'Reminder'] },
]

function BottomNav({ sub, setSub, onAdd }: { sub: SubView; setSub: (v: SubView) => void; onAdd: () => void }) {
  const NavBtn = ({ view, icon, active }: { view: SubView; icon: React.ReactNode; active: boolean }) => (
    <button
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 4, border: 'none', background: 'none',
        cursor: 'pointer', padding: '8px 0',
        color: active ? '#7c3aed' : 'var(--text-muted)', transition: 'color 0.15s',
      }}
      onClick={() => setSub(view)}
    >
      {icon}
      {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c3aed' }} />}
    </button>
  )

  return (
    <div style={{ flexShrink: 0, height: 64, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
      <NavBtn view="home" active={sub === 'home'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
        </svg>
      } />
      <NavBtn view="list" active={sub === 'list'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      } />
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onAdd}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(124,58,237,0.4)', marginBottom: 12,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <NavBtn view="analysis" active={sub === 'analysis'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      } />
    </div>
  )
}

function HomeView({ notes, onDelete }: { notes: ReturnType<typeof useNotes>['notes']; onDelete: (id: string) => void }) {
  const { locale } = useLanguage()
  const dir = rtlDir(locale)
  const today = new Date().toDateString()
  const todayNotes = notes.filter(n => new Date(n.note_date).toDateString() === today)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} dir={dir}>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          {L(locale, 'یادداشت‌های امروز', 'ملاحظات اليوم', "Today's Notes")}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {todayNotes.length} {L(locale, 'یادداشت ثبت شده', 'ملاحظة مسجلة', 'notes recorded')}
        </div>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        {todayNotes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
            <div style={{ fontSize: 13 }}>{L(locale, 'هنوز امروز یادداشتی نداری', 'لا توجد ملاحظات اليوم بعد', 'No notes yet today')}</div>
          </div>
        ) : (
          todayNotes.map(n => <NoteCard key={n.id} note={n} onDelete={onDelete} />)
        )}
      </div>
    </div>
  )
}

function ListView({ notes, onDelete }: { notes: ReturnType<typeof useNotes>['notes']; onDelete: (id: string) => void }) {
  const { locale } = useLanguage()
  const dir = rtlDir(locale)
  const i18nIndex = locale === 'fa' ? 0 : locale === 'ar' ? 1 : 2
  const [filter, setFilter] = useState<FilterKey>('all')
  const visible = filter === 'all' ? notes : notes.filter(n => n.category === filter)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} dir={dir}>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {L(locale, 'همه یادداشت‌ها', 'كل الملاحظات', 'All Notes')}
        </div>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {CATEGORY_FILTERS.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} style={{
            padding: '6px 12px', borderRadius: 20, border: `1px solid ${filter === c.key ? '#7c3aed' : 'var(--border)'}`,
            cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: filter === c.key ? '#7c3aed' : 'var(--surface-2)',
            color: filter === c.key ? 'white' : 'var(--text-muted)', fontFamily: FF,
          }}>
            {c.label[i18nIndex]}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: 13 }}>
            {L(locale, 'یادداشتی یافت نشد', 'لا توجد ملاحظات', 'No notes found')}
          </div>
        ) : (
          visible.map(n => <NoteCard key={n.id} note={n} onDelete={onDelete} />)
        )}
      </div>
    </div>
  )
}

export default function NotesPage({ projectId }: Props) {
  const { locale } = useLanguage()
  const [sub, setSub] = useState<SubView>('home')
  const [addOpen, setAddOpen] = useState(false)
  const { notes, addTextNote, addVoiceNote, deleteNote } = useNotes(projectId)

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.note_date).getTime() - new Date(a.note_date).getTime()),
    [notes],
  )

  if (!projectId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: FF }}>
        {L(locale, 'اول یک کارگاه بساز یا انتخاب کن', 'أنشئ أو اختر موقعاً أولاً', 'Create or select a site first')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg)', overflow: 'hidden', fontFamily: FF }}>
      {sub === 'home'     && <HomeView notes={sortedNotes} onDelete={deleteNote} />}
      {sub === 'list'     && <ListView notes={sortedNotes} onDelete={deleteNote} />}
      {sub === 'analysis' && <AnalysisView projectId={projectId} />}

      <BottomNav sub={sub} setSub={setSub} onAdd={() => setAddOpen(true)} />

      {addOpen && (
        <AddNoteSheet
          onAddText={async (content, category) => { await addTextNote(content, category) }}
          onAddVoice={async (blob, category) => { await addVoiceNote(blob, category) }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}
