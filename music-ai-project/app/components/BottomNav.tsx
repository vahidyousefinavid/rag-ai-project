'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, LibraryIcon, GridIcon, UserIcon } from './icons';
import { C } from './ui';

const tabStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  color: active ? C.purple : C.muted,
  textDecoration: 'none', width: 64, transition: 'color 0.15s',
});

export default function BottomNav() {
  const pathname = usePathname();
  const onHome = pathname === '/home';
  const onLibrary = pathname === '/library';
  const onPlaylists = pathname.startsWith('/playlists');
  const onProfile = pathname === '/profile';

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(18,10,31,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid ${C.border}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.30)',
      }}
    >
      <Link href="/home" style={tabStyle(onHome)}>
        <HomeIcon size={22} strokeWidth={onHome ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onHome ? 800 : 600 }}>خانه</span>
      </Link>
      <Link href="/library" style={tabStyle(onLibrary)}>
        <LibraryIcon size={22} strokeWidth={onLibrary ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onLibrary ? 800 : 600 }}>کتابخانه</span>
      </Link>
      <Link href="/playlists" style={tabStyle(onPlaylists)}>
        <GridIcon size={22} strokeWidth={onPlaylists ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onPlaylists ? 800 : 600 }}>دسته‌بندی‌ها</span>
      </Link>
      <Link href="/profile" style={tabStyle(onProfile)}>
        <UserIcon size={22} strokeWidth={onProfile ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onProfile ? 800 : 600 }}>پروفایل</span>
      </Link>
    </nav>
  );
}
