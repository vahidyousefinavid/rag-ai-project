import { useEffect, useState } from 'react'
import useLedger from '../../hooks/useLedger'
import { useLanguage } from '../../i18n/LanguageContext'
import { FF, L, fmtAmount, rtlDir } from '../../lib/ui'

type Range = 'today' | 'week' | 'month' | 'all'
interface Msg { role: 'user' | 'assistant'; text: string }

interface Props {
  projectId: string | null
}

const TOTAL_LABEL: Record<string, [string, string, string]> = {
  labor_payment: ['پرداخت دستمزد', 'دفع الأجور', 'Labor payments'],
  purchase:      ['خرید', 'المشتريات', 'Purchases'],
  expense:       ['هزینه', 'المصروفات', 'Expenses'],
  income:        ['درآمد', 'الدخل', 'Income'],
  other:         ['سایر', 'أخرى', 'Other'],
}

function rangeDates(range: Range): { from?: string; to?: string } {
  const now = new Date()
  const to = now.toISOString()
  if (range === 'all') return {}
  const from = new Date(now)
  if (range === 'today') from.setHours(0, 0, 0, 0)
  if (range === 'week') from.setDate(from.getDate() - 7)
  if (range === 'month') from.setMonth(from.getMonth() - 1)
  return { from: from.toISOString(), to }
}

export default function AnalysisView({ projectId }: Props) {
  const { locale } = useLanguage()
  const dir = rtlDir(locale)
  const i18nIndex = locale === 'fa' ? 0 : locale === 'ar' ? 1 : 2
  const { summary, loading, fetchSummary, ask } = useLedger()

  const [range, setRange] = useState<Range>('week')
  const [msgs, setMsgs]   = useState<Msg[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    const { from, to } = rangeDates(range)
    fetchSummary(projectId, from, to)
  }, [projectId, range, fetchSummary])

  const RANGE_LABEL: Record<Range, [string, string, string]> = {
    today: ['امروز', 'اليوم', 'Today'],
    week:  ['این هفته', 'هذا الأسبوع', 'This week'],
    month: ['این ماه', 'هذا الشهر', 'This month'],
    all:   ['همه', 'الكل', 'All time'],
  }

  const send = async () => {
    const q = question.trim()
    if (!q || !projectId) return
    setMsgs(prev => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setAsking(true)
    try {
      const { from, to } = rangeDates(range)
      const reply = await ask(projectId, q, from, to)
      setMsgs(prev => [...prev, { role: 'assistant', text: reply }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', text: L(locale, 'مشکلی پیش اومد.', 'حدث خطأ.', 'Something went wrong.') }])
    } finally {
      setAsking(false)
    }
  }

  if (!projectId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        {L(locale, 'اول یک کارگاه انتخاب کن', 'اختر موقعاً أولاً', 'Select a site first')}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', fontFamily: FF }} dir={dir}>
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {L(locale, 'تحلیل حساب‌وکتاب', 'تحليل الحسابات', 'Ledger Analysis')}
        </div>
      </div>

      {/* Range chips */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {(Object.keys(RANGE_LABEL) as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${range === r ? '#7c3aed' : 'var(--border)'}`,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: range === r ? '#7c3aed' : 'var(--surface-2)',
            color: range === r ? 'white' : 'var(--text-muted)',
            transition: 'all 0.18s', fontFamily: FF,
          }}>
            {RANGE_LABEL[r][i18nIndex]}
          </button>
        ))}
      </div>

      {/* Totals */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {loading || !summary ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
            {L(locale, 'در حال محاسبه…', 'جارٍ الحساب…', 'Calculating…')}
          </div>
        ) : (
          Object.entries(summary.totals).map(([type, total]) => (
            <div key={type} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 14px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{fmtAmount(total, locale)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {TOTAL_LABEL[type]?.[i18nIndex] ?? type}
              </div>
            </div>
          ))
        )}
      </div>

      {/* By person */}
      {summary && summary.by_person.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {L(locale, 'پرداختی به هر نفر', 'المدفوعات لكل شخص', 'Paid per person')}
          </div>
          {summary.by_person.map(p => (
            <div key={p.person_name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '10px 14px', marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{p.person_name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>{fmtAmount(p.total_amount, locale)}</span>
            </div>
          ))}
        </div>
      )}

      {/* By item */}
      {summary && summary.by_item.length > 0 && (
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            {L(locale, 'خرید ابزار/کالا', 'المشتريات', 'Purchases')}
          </div>
          {summary.by_item.map(it => (
            <div key={it.item} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '10px 14px', marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{it.item}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{fmtAmount(it.total_amount, locale)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ask box */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          {L(locale, 'از دستیار بپرس', 'اسأل المساعد', 'Ask the assistant')}
        </div>

        {msgs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
                background: m.role === 'user' ? 'var(--surface-2)' : '#1a1040',
                border: `1px solid ${m.role === 'user' ? 'var(--border)' : '#3b2a6e'}`,
                borderRadius: 14, padding: '9px 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
              }}>
                {m.text}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder={L(locale, 'مثلاً: این هفته چقدر به علی دادم؟', 'مثلاً: كم دفعت لعلي هذا الأسبوع؟', 'e.g. How much did I pay Ali this week?')}
            style={{
              flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px',
              fontSize: 13, color: 'var(--text)', outline: 'none', background: 'var(--surface-2)', fontFamily: FF,
            }}
          />
          <button
            onClick={send}
            disabled={!question.trim() || asking}
            style={{
              background: question.trim() ? '#7c3aed' : 'var(--surface-2)',
              color: question.trim() ? 'white' : 'var(--text-muted)',
              border: 'none', borderRadius: 12, padding: '0 18px',
              fontSize: 13, fontWeight: 700, cursor: question.trim() ? 'pointer' : 'default', fontFamily: FF,
            }}
          >
            {asking ? '…' : L(locale, 'پرسیدن', 'اسأل', 'Ask')}
          </button>
        </div>
      </div>
    </div>
  )
}
