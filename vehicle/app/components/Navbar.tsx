'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();

  function logout() {
    localStorage.removeItem('vtoken');
    localStorage.removeItem('vuser');
    router.push('/');
  }

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #E5ECF4',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{
        maxWidth: 520, margin: '0 auto',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', color: '#1A2A3A', fontWeight: 700, fontSize: 16,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#E8F9F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🚗</div>
          دستیار خودرو
        </Link>

        <button
          onClick={logout}
          style={{
            background: 'none', border: '1px solid #E5ECF4', borderRadius: 10,
            color: '#8A9DBB', fontSize: 12, padding: '6px 14px', cursor: 'pointer',
          }}
        >
          خروج
        </button>
      </div>
    </header>
  );
}
