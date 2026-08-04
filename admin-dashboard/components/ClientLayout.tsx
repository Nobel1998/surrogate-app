'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ADMIN_ONLY_PATHS = ['/business-statistics'];
const PAYMENT_NODES_PATH = '/payment-nodes';
const PAYMENT_ALLOWED_ROLES = ['admin', 'finance_manager'];
const BRANCH_MANAGER_BLOCKED_PATHS = ['/dashboard', '/profiles'];
const BRANCH_MANAGER_HOME = '/matches';
const PUBLIC_PATHS = ['/', '/login', '/privacy-policy', '/delete-account', '/reset-password'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
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

  useEffect(() => {
    if (loading || !ADMIN_ONLY_PATHS.includes(pathname)) return;
    if ((userRole || '').toLowerCase() !== 'admin') router.replace('/dashboard');
  }, [loading, pathname, userRole, router]);

  useEffect(() => {
    if (loading || pathname !== PAYMENT_NODES_PATH) return;
    const roleLower = (userRole || '').toLowerCase();
    if (!PAYMENT_ALLOWED_ROLES.includes(roleLower)) router.replace('/dashboard');
  }, [loading, pathname, userRole, router]);

  useEffect(() => {
    if (loading || !BRANCH_MANAGER_BLOCKED_PATHS.includes(pathname)) return;
    if ((userRole || '').toLowerCase() !== 'branch_manager') return;
    router.replace(BRANCH_MANAGER_HOME);
  }, [loading, pathname, userRole, router]);

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  const isAdminOnlyPath = ADMIN_ONLY_PATHS.includes(pathname);
  const isAdmin = (userRole || '').toLowerCase() === 'admin';
  const isPaymentPath = pathname === PAYMENT_NODES_PATH;
  const isPaymentAllowed = PAYMENT_ALLOWED_ROLES.includes((userRole || '').toLowerCase());
  const isBranchManagerBlockedPath =
    BRANCH_MANAGER_BLOCKED_PATHS.includes(pathname) &&
    (userRole || '').toLowerCase() === 'branch_manager';
  if (
    (isAdminOnlyPath && !loading && !isAdmin) ||
    (isPaymentPath && !loading && !isPaymentAllowed) ||
    (isBranchManagerBlockedPath && !loading)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-center">Access denied. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        userRole={userRole}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-64">
        {readOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 text-xs sm:text-sm text-amber-800 text-center">
            View-only access — you can view data but cannot create, edit, or delete.
          </div>
        )}
        <Header
          userName={userName}
          loading={loading}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 w-full max-w-[100vw] p-3 sm:p-5 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
