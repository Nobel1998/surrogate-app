'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  userRole: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const allNavItems = [
    { href: '/', label: 'Applications', icon: '📋' },
    { href: '/events', label: 'Blog', icon: '📝' },
    { href: '/matches', label: 'Matches', icon: '🤝' },
    { href: '/payment-nodes', label: 'Payment Nodes', icon: '💰' },
    { href: '/surrogate-insurance', label: 'Surrogate Insurance', icon: '🛡️' },
    { href: '/psychological-evaluations', label: 'Psychological Evaluations', icon: '🧠' },
    { href: '/monthly-assessments', label: 'Monthly Assessments', icon: '📊' },
    { href: '/journey-pics', label: 'Journey Pics', icon: '📸' },
    { href: '/business-statistics', label: 'Business Statistics', icon: '📈' },
    { href: '/support-tickets', label: 'Support Tickets', icon: '🎫' },
    { href: '/reward-requests', label: 'Reward Requests', icon: '🎁' },
    { href: '/benefit-package', label: 'Benefit Package', icon: '📄' },
    { href: '/branches', label: 'Branches', icon: '🏢', adminOnly: true },
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
    <aside className="w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-full flex flex-col z-50">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900 truncate">
          Surrogate Admin
        </h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`mr-3 text-lg ${
                pathname === item.href ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          © 2024 BabyTree Surrogacy
        </p>
      </div>
    </aside>
  );
}

