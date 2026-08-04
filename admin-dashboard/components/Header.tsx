'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  userName: string;
  loading: boolean;
  onMenuClick?: () => void;
}

export default function Header({ userName, loading, onMenuClick }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-14 sm:h-16 flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-700 hover:bg-gray-100 shrink-0"
          aria-label="Open menu"
        >
          <span className="text-xl leading-none" aria-hidden>
            ☰
          </span>
        </button>
        <div className="lg:hidden text-sm font-semibold text-gray-900 truncate">Admin</div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {!loading && userName && (
          <div className="text-xs sm:text-sm text-gray-700 truncate max-w-[40vw] sm:max-w-none">
            <span className="hidden sm:inline">Welcome, </span>
            <span className="font-medium">{userName}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium px-2.5 sm:px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
