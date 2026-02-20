'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [readOnly, setReadOnly] = useState(false);
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
          setReadOnly(!!data.user?.read_only);
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
        {readOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
            View-only access — you can view data but cannot create, edit, or delete.
          </div>
        )}
        <Header userName={userName} loading={loading} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

