import { useLanguage } from '../i18n/LanguageContext'

export default function TypingIndicator() {
  const { t } = useLanguage()
  return (
    <div className="px-4 py-1.5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            style={{
              color: '#34d399',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
            className="text-xs font-medium px-1.5 py-0.5 rounded select-none"
          >
            {t.ai}
          </span>
        </div>
        <div className="flex items-center gap-1 py-1 ps-1">
          <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-1" />
          <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-2" />
          <span style={{ background: 'var(--text-muted)' }} className="w-1.5 h-1.5 rounded-full dot-3" />
        </div>
      </div>
    </div>
  )
}
