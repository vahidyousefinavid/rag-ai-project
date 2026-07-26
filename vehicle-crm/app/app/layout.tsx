import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'پنل مدیریت | دستیار خودرو',
  description: 'مدیریت کاربران، خودروها و عملکرد سرویس دستیار خودرو',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
