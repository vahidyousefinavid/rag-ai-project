export type Locale = 'en' | 'fa' | 'ar'

export const translations = {
  en: {
    navTasks: 'Tasks',
    navNotes: 'Notes',
    dir: 'ltr' as const,
  },
  fa: {
    navTasks: 'تسک‌ها',
    navNotes: 'یادداشت‌ها',
    dir: 'rtl' as const,
  },
  ar: {
    navTasks: 'المهام',
    navNotes: 'الملاحظات',
    dir: 'rtl' as const,
  },
} as const

export type Translation = typeof translations['en']
