'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    const loadUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.user?.name || 'Admin');
          setUserRole(data.user?.role || '');
        }
      } catch (err) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col ml-64 min-w-0">
        <Header userName={userName} loading={loading} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

