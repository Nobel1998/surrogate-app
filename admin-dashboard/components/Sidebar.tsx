'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  userRole: string;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}

export default function Sidebar({ userRole, mobileOpen = false, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const roleLower = (userRole || '').toLowerCase();

  const allNavItems = [
    { href: '/dashboard', label: 'Applications', icon: '📋', allowedRoles: ['admin'] },
    { href: '/profiles', label: 'Sign Up', icon: '🪪', allowedRoles: ['admin'] },
    { href: '/benefit-package', label: 'Benefit Package', icon: '📄', allowedRoles: ['admin', 'finance_manager', 'branch_manager'] },
    { href: '/events', label: 'Blog', icon: '📝', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/matches', label: 'Matches', icon: '🤝', allowedRoles: ['admin', 'finance_manager', 'branch_manager'] },
    { href: '/frequent-contacts', label: 'Frequent Contacts', icon: '📒', allowedRoles: ['admin', 'finance_manager', 'branch_manager'] },
    { href: '/payment-nodes', label: 'Payment Nodes', icon: '💰', allowedRoles: ['admin', 'finance_manager'] },
    { href: '/surrogate-insurance', label: 'Surrogate Insurance', icon: '🛡️', allowedRoles: ['admin', 'finance_manager', 'branch_manager'] },
    { href: '/psychological-evaluations', label: 'Psychological Evaluations', icon: '🧠', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/medical-record-reviews', label: 'Medical Record Reviews', icon: '🩺', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/monthly-assessments', label: 'Monthly Assessments', icon: '📊', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/journey-pics', label: 'Journey Pics', icon: '📸', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/business-statistics', label: 'Business Statistics', icon: '📈', adminOnly: true },
    { href: '/support-tickets', label: 'Support Tickets', icon: '🎫', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/reward-requests', label: 'Reward Requests', icon: '🎁', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/referral-submissions', label: 'Referral Submissions', icon: '📨', allowedRoles: ['admin', 'branch_manager'] },
    { href: '/branches', label: 'Branches', icon: '🏢', adminOnly: true },
    { href: '/branch-managers', label: 'Branch Managers', icon: '👥', adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly && roleLower !== 'admin') {
      return false;
    }
    if (item.allowedRoles && !item.allowedRoles.includes(roleLower)) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={`w-[min(18rem,85vw)] sm:w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-full flex flex-col z-50 transform transition-transform duration-200 ease-out ${
        mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      } lg:translate-x-0 lg:shadow-none`}
    >
      <div className="h-14 sm:h-16 flex items-center justify-between gap-2 px-4 sm:px-6 border-b border-gray-200">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">Surrogate Admin</h1>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain py-3 sm:py-4">
        <nav className="space-y-0.5 px-2 sm:px-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span
                  className={`mr-3 text-lg shrink-0 ${
                    active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 sm:p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">© 2024 BabyTree Surrogacy</p>
      </div>
    </aside>
  );
}
