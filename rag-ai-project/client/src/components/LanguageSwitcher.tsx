import { useLanguage } from '../i18n/LanguageContext'
import type { Locale } from '../i18n'

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'fa', label: 'فا' },
  { code: 'ar', label: 'عر' },
]

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLocale(code)}
          style={{
            color: locale === code ? '#fff' : 'var(--text-muted)',
            background: locale === code ? 'var(--accent)' : 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontFamily: code === 'en' ? 'Inter, sans-serif' : 'Vazirmatn, Tahoma, sans-serif',
          }}
          className="text-xs px-2 py-1 rounded transition-colors leading-none"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
