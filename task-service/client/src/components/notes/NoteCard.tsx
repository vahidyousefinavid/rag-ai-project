import { useState } from 'react'
import type { Note, NoteCategory } from '../../hooks/useNotes'
import { useLanguage } from '../../i18n/LanguageContext'
import { FF, L, fmtAmount, fmtTime } from '../../lib/ui'

interface Props {
  note: Note
  onDelete: (id: string) => void
}

const CATEGORY_LABEL: Record<NoteCategory, [string, string, string]> = {
  general:  ['روزمره', 'يومي', 'General'],
  site_log: ['گزارش کارگاه', 'تقرير الموقع', 'Site log'],
  labor:    ['دستمزد', 'أجور', 'Labor'],
  purchase: ['خرید/ابزار', 'شراء/أدوات', 'Purchase'],
  expense:  ['هزینه', 'مصروفات', 'Expense'],
  reminder: ['یادآوری', 'تذكير', 'Reminder'],
}

const CATEGORY_COLOR: Record<NoteCategory, string> = {
  general:  '#818cf8',
  site_log: '#7c3aed',
  labor:    '#fbbf24',
  purchase: '#34d399',
  expense:  '#f87171',
  reminder: '#38bdf8',
}

const ENTRY_LABEL: Record<string, [string, string, string]> = {
  labor_payment: ['پرداخت دستمزد', 'دفع أجر', 'Labor payment'],
  purchase:      ['خرید', 'شراء', 'Purchase'],
  expense:       ['هزینه', 'مصروف', 'Expense'],
  income:        ['درآمد', 'دخل', 'Income'],
  other:         ['سایر', 'أخرى', 'Other'],
}

export default function NoteCard({ note, onDelete }: Props) {
  const { locale } = useLanguage()
  const [confirm, setConfirm] = useState(false)
  const i18nIndex = locale === 'fa' ? 0 : locale === 'ar' ? 1 : 2

  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border)',
      padding: '12px 14px', marginBottom: 10, fontFamily: FF,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            background: CATEGORY_COLOR[note.category] + '22', color: CATEGORY_COLOR[note.category],
          }}>
            {CATEGORY_LABEL[note.category][i18nIndex]}
          </span>
          {note.kind === 'voice' && <span style={{ fontSize: 11 }}>🎙</span>}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(note.created_at)}</span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
        {note.content}
      </p>

      {note.ledger_entries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {note.ledger_entries.map(e => (
            <span key={e.id} style={{
              fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '3px 9px', color: 'var(--text-muted)',
            }}>
              {ENTRY_LABEL[e.entry_type]?.[i18nIndex] ?? e.entry_type}
              {e.person_name ? ` · ${e.person_name}` : ''}
              {e.item ? ` · ${e.item}` : ''}
              {e.amount != null ? ` · ${fmtAmount(e.amount, locale)}` : ''}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        {confirm ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => onDelete(note.id)}
              style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: 'none', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontFamily: FF }}
            >
              {L(locale, 'حذف', 'حذف', 'Delete')}
            </button>
            <button onClick={() => setConfirm(false)} style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ fontSize: 16, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, opacity: 0.5, padding: '0 4px' }}
          >
            ···
          </button>
        )}
      </div>
    </div>
  )
}
