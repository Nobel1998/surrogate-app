'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const allNavItems = [
    { href: '/', label: 'Applications', icon: '📋' },
    { href: '/events', label: 'Blog', icon: '📝' },
    { href: '/matches', label: 'Matches', icon: '🤝' },
    { href: '/payment-nodes', label: 'Payment Nodes', icon: '💰' },
    { href: '/support-tickets', label: 'Support Tickets', icon: '🎫' },
    { href: '/reward-requests', label: 'Reward Requests', icon: '🎁' },
    { href: '/branch-managers', label: 'Branch Managers', icon: '👥', adminOnly: true },
  ];

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Surrogate Agency Admin
              </h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 ml-8">
            {!loading && userName && (
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{userName}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}




