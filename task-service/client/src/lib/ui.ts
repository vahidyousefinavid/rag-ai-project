import type { Locale } from '../i18n'

export const FF = "'Inter', 'Vazirmatn', system-ui, sans-serif"

export function rtlDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' || locale === 'ar' ? 'rtl' : 'ltr'
}

export function L(locale: Locale, fa: string, ar: string, en: string) {
  return locale === 'fa' ? fa : locale === 'ar' ? ar : en
}

export function fmtTime(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtDate(iso: string, locale: Locale) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  if (locale === 'fa') return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })
  if (locale === 'ar') return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export function fmtAmount(n: number, locale: Locale) {
  const s = Math.abs(n).toLocaleString(locale === 'fa' ? 'fa-IR' : locale === 'ar' ? 'ar-SA' : 'en-US')
  return L(locale, `${s} تومان`, `${s} تومان`, `${s} toman`)
}
