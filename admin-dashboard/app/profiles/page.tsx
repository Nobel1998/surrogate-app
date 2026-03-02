'use client';

import { useEffect, useMemo, useState } from 'react';

type RegisteredUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
  hasSurrogateApplication: boolean;
  hasParentApplication: boolean;
  hasAnyApplication: boolean;
  registrationSource: string;
};

export default function ProfilesPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [applicationFilter, setApplicationFilter] = useState('all');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load users: ${res.status} ${errText}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        console.warn('[profiles] API warnings:', data.warnings);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      const role = (user.role || '').toLowerCase();
      const matchesRole = roleFilter === 'all' || role === roleFilter;

      const matchesApplication =
        applicationFilter === 'all' ||
        (applicationFilter === 'with_application' && user.hasAnyApplication) ||
        (applicationFilter === 'signup_only' && !user.hasAnyApplication);

      const matchesSearch =
        !keyword ||
        (user.name || '').toLowerCase().includes(keyword) ||
        (user.email || '').toLowerCase().includes(keyword) ||
        (user.phone || '').toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword);

      return matchesRole && matchesApplication && matchesSearch;
    });
  }, [users, search, roleFilter, applicationFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading registered users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Profile</h1>
          <p className="text-gray-600">All registered users (Sign Up users + users who submitted applications).</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or user ID..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="parent">Parent</option>
              <option value="surrogate">Surrogate</option>
            </select>
            <select
              value={applicationFilter}
              onChange={(e) => setApplicationFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Registration Types</option>
              <option value="with_application">With Application</option>
              <option value="signup_only">Sign Up Only</option>
            </select>
            <button
              onClick={loadUsers}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} registered users
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{user.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {(user.role || 'unknown').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>{user.phone || 'N/A'}</div>
                        <div className="text-gray-500">{user.email || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.hasAnyApplication ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {user.registrationSource}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{user.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
