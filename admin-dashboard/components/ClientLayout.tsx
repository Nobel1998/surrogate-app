'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ADMIN_ONLY_PATHS = ['/business-statistics'];
const PAYMENT_NODES_PATH = '/payment-nodes';
const PAYMENT_ALLOWED_ROLES = ['admin', 'finance_manager'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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

  // Redirect non-admin away from admin-only pages
  useEffect(() => {
    if (loading || !ADMIN_ONLY_PATHS.includes(pathname)) return;
    if ((userRole || '').toLowerCase() !== 'admin') router.replace('/');
  }, [loading, pathname, userRole, router]);

  // Redirect non-allowed roles away from payment-nodes
  useEffect(() => {
    if (loading || pathname !== PAYMENT_NODES_PATH) return;
    const roleLower = (userRole || '').toLowerCase();
    if (!PAYMENT_ALLOWED_ROLES.includes(roleLower)) router.replace('/');
  }, [loading, pathname, userRole, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const isAdminOnlyPath = ADMIN_ONLY_PATHS.includes(pathname);
  const isAdmin = (userRole || '').toLowerCase() === 'admin';
  const isPaymentPath = pathname === PAYMENT_NODES_PATH;
  const isPaymentAllowed = PAYMENT_ALLOWED_ROLES.includes((userRole || '').toLowerCase());
  if ((isAdminOnlyPath && !loading && !isAdmin) || (isPaymentPath && !loading && !isPaymentAllowed)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied. Redirecting...</p>
      </div>
    );
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

