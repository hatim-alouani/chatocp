// app/layoutClient.tsx (Client Component)
'use client';
import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname === '/' || pathname === '/login' || pathname === '/audit';
  return (
    <>
      <main className="flex-1">{children}</main>
    </>
  );
}
