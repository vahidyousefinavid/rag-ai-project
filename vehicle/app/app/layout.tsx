import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'دستیار خودرو',
  description: 'مدیریت هوشمند خودرو و سوابق سرویس',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-surface">{children}</body>
    </html>
  );
}
