'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  userName: string;
  loading: boolean;
}

export default function Header({ userName, loading }: HeaderProps) {
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
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-end px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {!loading && userName && (
          <div className="text-sm text-gray-700">
            Welcome, <span className="font-medium">{userName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

