import { useState } from 'react'
import useTasks from '../hooks/useTasks'
import type { Task, TaskPriority, TaskStatus } from '../hooks/useTasks'
import VoiceChat from '../components/tasks/VoiceChat'
import { useLanguage } from '../i18n/LanguageContext'
import type { Locale } from '../i18n'

type SubView   = 'home' | 'activity' | 'stats'
type FilterKey = TaskStatus | 'all'

const FF = "'Inter', 'Vazirmatn', system-ui, sans-serif"

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low:    '#34d399',
  medium: '#fbbf24',
  high:   '#f87171',
}

const PRIORITY_BG: Record<TaskPriority, string> = {
  low:    'rgba(52,211,153,0.12)',
  medium: 'rgba(251,191,36,0.12)',
  high:   'rgba(248,113,113,0.12)',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function todayLabel(locale: Locale) {
  const d = new Date()
  if (locale === 'fa') return d.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (locale === 'ar') return d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function rtlDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' || locale === 'ar' ? 'rtl' : 'ltr'
}

function L(locale: Locale, fa: string, ar: string, en: string) {
  return locale === 'fa' ? fa : locale === 'ar' ? ar : en
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircleProgress({ pct }: { pct: number }) {
  const r = 38
  const C = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="white" strokeWidth="8"
        strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50" y="56" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily={FF}>
        {pct}%
      </text>
    </svg>
  )
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriBadge({ priority, locale }: { priority: TaskPriority; locale: Locale }) {
  const label = {
    low:    L(locale, 'کم', 'منخفض', 'Low'),
    medium: L(locale, 'متوسط', 'متوسط', 'Medium'),
    high:   L(locale, 'بالا', 'عالٍ', 'High'),
  }[priority]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: PRIORITY_BG[priority], color: PRIORITY_COLOR[priority],
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({ task, isLast, onMove, onDelete }: {
  task: Task; isLast: boolean
  onMove: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
}) {
  const { locale } = useLanguage()
  const [confirm, setConfirm] = useState(false)
  const isDone   = task.status === 'done'
  const isActive = task.status === 'in_progress'
  const accentColor = isActive ? '#7c3aed' : isDone ? '#34d399' : 'var(--border)'

  return (
    <div style={{
      display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 4,
    }}>
      {/* status line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14 }}>
        <button
          onClick={() => onMove(task.id, isDone ? 'in_progress' : isActive ? 'done' : 'in_progress')}
          style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${accentColor}`,
            background: isDone ? '#34d399' : isActive ? '#7c3aed' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s', padding: 0,
          }}
        >
          {isDone && (
            <svg width="9" height="7" viewBox="0 0 9 7">
              <path d="M1 3.5L3.2 5.7L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          )}
          {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />}
        </button>
        {!isLast && (
          <div style={{ width: 1, flex: 1, minHeight: 20, background: 'var(--border)', margin: '4px 0' }} />
        )}
      </div>

      {/* content */}
      <div style={{
        flex: 1, paddingBottom: isLast ? 0 : 16,
        background: 'var(--surface-2)', borderRadius: 12,
        border: `1px solid ${isActive ? 'rgba(124,58,237,0.25)' : 'var(--border)'}`,
        padding: '12px 14px', marginBottom: isLast ? 0 : 8,
        transition: 'border-color 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: isActive ? 600 : 500, lineHeight: 1.4,
            color: isDone ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: isDone ? 'line-through' : 'none',
            flex: 1,
          }}>
            {task.title}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
            {fmtTime(task.created_at)}
          </span>
        </div>

        {task.description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
            {task.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <PriBadge priority={task.priority ?? 'medium'} locale={locale} />

          {task.status !== 'done' && (
            <button
              onClick={() => onMove(task.id, task.status === 'todo' ? 'in_progress' : 'done')}
              style={{
                fontSize: 11, color: '#7c3aed', background: 'rgba(124,58,237,0.1)',
                border: 'none', borderRadius: 7, padding: '3px 10px',
                cursor: 'pointer', fontWeight: 600, fontFamily: FF,
              }}
            >
              {task.status === 'todo' ? L(locale, 'شروع', 'ابدأ', 'Start') : L(locale, 'تمام', 'تم', 'Done')}
            </button>
          )}
          {task.status !== 'todo' && (
            <button
              onClick={() => onMove(task.id, task.status === 'done' ? 'in_progress' : 'todo')}
              style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: 7, padding: '3px 10px',
                cursor: 'pointer', fontFamily: FF,
              }}
            >
              {L(locale, 'بازگشت', 'رجوع', 'Back')}
            </button>
          )}

          <div style={{ marginInlineStart: 'auto' }}>
            {confirm ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => onDelete(task.id)}
                  style={{
                    fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)',
                    border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontFamily: FF,
                  }}
                >
                  {L(locale, 'حذف', 'حذف', 'Delete')}
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(true)}
                style={{
                  fontSize: 16, color: 'var(--text-muted)', background: 'none',
                  border: 'none', cursor: 'pointer', lineHeight: 1, opacity: 0.5, padding: '0 4px',
                }}
              >
                ···
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add task modal ───────────────────────────────────────────────────────────

function AddModal({ onAdd, onClose }: { onAdd: (t: string, p: TaskPriority, desc?: string) => void; onClose: () => void }) {
  const { locale } = useLanguage()
  const [title, setTitle]   = useState('')
  const [desc, setDesc]     = useState('')
  const [pri, setPri]       = useState<TaskPriority>('medium')
  const dir = rtlDir(locale)

  const commit = () => {
    if (title.trim()) { onAdd(title.trim(), pri, desc.trim() || undefined); onClose() }
  }

  const priLabel = (p: TaskPriority) => ({
    low:    L(locale, 'کم', 'منخفض', 'Low'),
    medium: L(locale, 'متوسط', 'متوسط', 'Medium'),
    high:   L(locale, 'بالا', 'عالٍ', 'High'),
  }[p])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '20px 20px 0 0', padding: '20px 20px 32px',
          display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FF,
          border: '1px solid var(--border)', borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
        dir={dir}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', alignSelf: 'center' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {L(locale, 'تسک جدید', 'مهمة جديدة', 'New Task')}
          </span>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose() }}
          placeholder={L(locale, 'عنوان تسک...', 'عنوان المهمة...', 'Task title...')}
          style={{
            width: '100%', border: 'none',
            borderBottom: `1.5px solid ${title ? '#7c3aed' : 'var(--border)'}`,
            padding: '10px 0', fontSize: 15, color: 'var(--text)', outline: 'none',
            background: 'transparent', fontFamily: FF, transition: 'border-color 0.2s',
          }}
        />

        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={L(locale, 'توضیحات (اختیاری)...', 'وصف (اختياري)...', 'Description (optional)...')}
          rows={2}
          style={{
            width: '100%', border: '1px solid var(--border)', borderRadius: 10,
            padding: '9px 12px', fontSize: 13, color: 'var(--text)', outline: 'none',
            background: 'var(--surface-2)', fontFamily: FF, resize: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
            <button key={p} onClick={() => setPri(p)} style={{
              flex: 1, padding: '9px 6px', borderRadius: 10,
              border: `1.5px solid ${pri === p ? PRIORITY_COLOR[p] : 'var(--border)'}`,
              background: pri === p ? PRIORITY_BG[p] : 'var(--surface-2)',
              color: pri === p ? PRIORITY_COLOR[p] : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FF,
            }}>
              {priLabel(p)}
            </button>
          ))}
        </div>

        <button
          onClick={commit}
          disabled={!title.trim()}
          style={{
            background: title.trim() ? '#7c3aed' : 'var(--surface-2)',
            color: title.trim() ? 'white' : 'var(--text-muted)',
            border: 'none', borderRadius: 12, padding: '14px',
            fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s', fontFamily: FF,
          }}
        >
          {L(locale, 'افزودن تسک', 'إضافة المهمة', 'Add Task')}
        </button>
      </div>
    </div>
  )
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────

function HomeView({ tasks, onMove, onDelete }: {
  tasks: Task[]
  onMove: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
}) {
  const { locale } = useLanguage()
  const done    = tasks.filter(t => t.status === 'done').length
  const total   = tasks.length
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100)
  const pending = tasks.filter(t => t.status !== 'done')
  const active  = tasks.filter(t => t.status === 'in_progress')
  const dir     = rtlDir(locale)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} dir={dir}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.02em' }}>
          {todayLabel(locale)}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>
          {L(locale, 'سلام، کاربر عزیز', 'مرحباً', 'Good day')} 👋
        </div>
      </div>

      {/* Progress card */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{
          borderRadius: 18, padding: '20px 18px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(124,58,237,0.28)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 6 }}>
              {L(locale, 'پیشرفت امروز', 'تقدم اليوم', "Today's Progress")}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {done} {L(locale, 'از', 'من', 'of')} {total} {L(locale, 'تسک کامل شد', 'مهام مكتملة', 'tasks done')}
            </div>
            {active.length > 0 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {active.length} {L(locale, 'تسک در حال انجام', 'قيد التنفيذ', 'in progress')}
              </div>
            )}
          </div>
          <CircleProgress pct={pct} />
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: L(locale, 'انتظار', 'للتنفيذ', 'Todo'),    n: tasks.filter(t => t.status === 'todo').length,        color: '#818cf8' },
          { label: L(locale, 'فعال', 'نشط', 'Active'),        n: tasks.filter(t => t.status === 'in_progress').length, color: '#fbbf24' },
          { label: L(locale, 'کامل', 'مكتمل', 'Done'),        n: done,                                                   color: '#34d399' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface-2)', borderRadius: 14, padding: '14px 10px',
            textAlign: 'center', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          {L(locale, 'تسک‌های فعال', 'المهام النشطة', 'Active Tasks')}
        </div>

        {pending.length === 0 ? (
          <div style={{
            textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px',
            background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 13 }}>
              {L(locale, 'همه تسک‌ها انجام شدن!', 'كل المهام مكتملة!', 'All tasks completed!')}
            </div>
          </div>
        ) : (
          pending.slice(0, 8).map((task, i) => (
            <TaskCard
              key={task.id} task={task}
              isLast={i === Math.min(pending.length, 8) - 1}
              onMove={onMove} onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── ACTIVITY VIEW ────────────────────────────────────────────────────────────

function ActivityView({ tasks, onMove, onDelete }: {
  tasks: Task[]
  onMove: (id: string, s: TaskStatus) => void
  onDelete: (id: string) => void
}) {
  const { locale } = useLanguage()
  const dir    = rtlDir(locale)
  const inProg = tasks.filter(t => t.status === 'in_progress')
  const todo   = tasks.filter(t => t.status === 'todo')
  const done   = tasks.filter(t => t.status === 'done')

  const Section = ({ label, items, color }: { label: string; items: Task[]; color: string }) =>
    items.length === 0 ? null : (
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginInlineStart: 'auto' }}>{items.length}</span>
        </div>
        {items.map((t, i) => (
          <TaskCard key={t.id} task={t} isLast={i === items.length - 1} onMove={onMove} onDelete={onDelete} />
        ))}
        <div style={{ height: 16 }} />
      </div>
    )

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} dir={dir}>
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {L(locale, 'فعالیت‌ها', 'الأنشطة', 'Activity')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {tasks.length} {L(locale, 'تسک در مجموع', 'مهام في المجموع', 'total tasks')}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', fontSize: 13 }}>
          {L(locale, 'هنوز تسکی ندارید', 'لا توجد مهام بعد', 'No tasks yet')}
        </div>
      ) : (
        <>
          <Section label={L(locale, 'در حال انجام', 'قيد التنفيذ', 'In Progress')} items={inProg} color="#7c3aed" />
          <Section label={L(locale, 'در انتظار', 'للتنفيذ', 'Pending')}            items={todo}   color="#fbbf24" />
          <Section label={L(locale, 'انجام شده', 'مكتملة', 'Completed')}           items={done}   color="#34d399" />
        </>
      )}
    </div>
  )
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────

function StatsView({ tasks, onMove }: { tasks: Task[]; onMove: (id: string, s: TaskStatus) => void }) {
  const { locale } = useLanguage()
  const [filter, setFilter] = useState<FilterKey>('all')
  const dir     = rtlDir(locale)
  const visible = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const total  = tasks.length
  const doneN  = tasks.filter(t => t.status === 'done').length
  const highN  = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length

  const chips: { key: FilterKey; label: string; color: string }[] = [
    { key: 'all',         label: L(locale, 'همه', 'الكل', 'All'),          color: '#7c3aed' },
    { key: 'todo',        label: L(locale, 'انتظار', 'للتنفيذ', 'Todo'),    color: '#818cf8' },
    { key: 'in_progress', label: L(locale, 'فعال', 'نشط', 'Active'),        color: '#fbbf24' },
    { key: 'done',        label: L(locale, 'کامل', 'مكتمل', 'Done'),        color: '#34d399' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} dir={dir}>
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {L(locale, 'آمار', 'الإحصائيات', 'Statistics')}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 16, padding: '18px 14px' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
            {total === 0 ? '0%' : `${Math.round((doneN / total) * 100)}%`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {L(locale, 'نرخ تکمیل', 'معدل الإنجاز', 'Completion rate')}
          </div>
        </div>
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 16, padding: '18px 14px' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171', lineHeight: 1 }}>{highN}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {L(locale, 'فوری باقیمانده', 'عاجل متبقي', 'High priority left')}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{L(locale, 'پیشرفت کلی', 'التقدم الإجمالي', 'Overall progress')}</span>
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>{doneN}/{total}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
              width: `${Math.round((doneN / total) * 100)}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {chips.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: filter === c.key ? c.color : 'var(--surface-2)',
            color: filter === c.key ? 'white' : 'var(--text-muted)',
            transition: 'all 0.18s', fontFamily: FF,
            border: `1px solid ${filter === c.key ? c.color : 'var(--border)'}`,
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Task checklist */}
      <div style={{ padding: '0 16px 20px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: 13 }}>
            {L(locale, 'تسکی یافت نشد', 'لا توجد مهام', 'No tasks found')}
          </div>
        ) : (
          visible.map(task => (
            <div key={task.id} style={{
              background: 'var(--surface-2)', borderRadius: 13, padding: '12px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
              border: `1px solid ${task.status === 'in_progress' ? 'rgba(124,58,237,0.2)' : 'var(--border)'}`,
              transition: 'border-color 0.2s',
            }}>
              <button
                onClick={() => onMove(task.id, task.status === 'done' ? 'todo' : 'done')}
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  background: task.status === 'done' ? '#34d399' : 'transparent',
                  border: `2px solid ${task.status === 'done' ? '#34d399' : task.status === 'in_progress' ? '#7c3aed' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s', padding: 0,
                }}
              >
                {task.status === 'done' && (
                  <svg width="10" height="8" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                )}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 13, lineHeight: 1.4, display: 'block',
                  color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)',
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                }}>
                  {task.title}
                </span>
              </div>
              <PriBadge priority={task.priority ?? 'medium'} locale={locale} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function BottomNav({ sub, setSub, onAdd, onMic }: {
  sub: SubView
  setSub: (v: SubView) => void
  onAdd: () => void
  onMic: () => void
}) {
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
    <div style={{
      flexShrink: 0, height: 64,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
    }}>
      <NavBtn view="home" active={sub === 'home'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
        </svg>
      } />

      <NavBtn view="activity" active={sub === 'activity'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      } />

      {/* Add button */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onAdd}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(124,58,237,0.4)',
            marginBottom: 12, transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.4)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Voice */}
      <button
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4, border: 'none', background: 'none',
          cursor: 'pointer', padding: '8px 0', color: 'var(--text-muted)', transition: 'color 0.15s',
        }}
        onClick={onMic}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" />
        </svg>
      </button>

      <NavBtn view="stats" active={sub === 'stats'} icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      } />
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [sub, setSub]         = useState<SubView>('home')
  const [addOpen, setAddOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const { tasks, addTask, moveTask, deleteTask } = useTasks()

  const handleAdd = (title: string, priority: TaskPriority, desc?: string) => {
    addTask(title, priority, desc)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
      background: 'var(--bg)', overflow: 'hidden', fontFamily: FF,
    }}>
      {sub === 'home'     && <HomeView     tasks={tasks} onMove={moveTask} onDelete={deleteTask} />}
      {sub === 'activity' && <ActivityView tasks={tasks} onMove={moveTask} onDelete={deleteTask} />}
      {sub === 'stats'    && <StatsView    tasks={tasks} onMove={moveTask} />}

      <BottomNav sub={sub} setSub={setSub} onAdd={() => setAddOpen(true)} onMic={() => setChatOpen(true)} />

      {addOpen  && <AddModal  onAdd={handleAdd} onClose={() => setAddOpen(false)} />}
      {chatOpen && <VoiceChat onClose={() => setChatOpen(false)} />}
    </div>
  )
}
