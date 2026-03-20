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

type SignUpDetailResponse = {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    created_at: string | null;
  } | null;
  signupMetadata: {
    name: string | null;
    phone: string | null;
    role: string | null;
    date_of_birth: string | null;
    race: string | null;
    location: string | null;
    referral_code: string | null;
  };
};

export default function ProfilesPage() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [signupDetail, setSignupDetail] = useState<SignUpDetailResponse | null>(null);

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

  const openDetailModal = async (user: RegisteredUser) => {
    setSelectedUser(user);
    setSignupDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/profiles/${user.id}/signup-detail`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load signup detail: ${res.status} ${errText}`);
      }
      const data = await res.json();
      setSignupDetail(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load signup detail';
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedUser(null);
    setSignupDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      const isSignUpOnly = !user.hasAnyApplication;

      const matchesSearch =
        !keyword ||
        (user.name || '').toLowerCase().includes(keyword) ||
        (user.email || '').toLowerCase().includes(keyword) ||
        (user.phone || '').toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword);

      return isSignUpOnly && matchesSearch;
    });
  }, [users, search]);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sign Up</h1>
          <p className="text-gray-600">Users who signed up but have not submitted an application.</p>
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
            <button
              onClick={loadUsers}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-2"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} sign up users
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
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
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <button
                          onClick={() => openDetailModal(user)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sign Up Details</h3>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4">
                {detailLoading ? (
                  <div className="text-gray-600">Loading details...</div>
                ) : detailError ? (
                  <div className="text-red-600">{detailError}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold text-gray-700">Full Name:</span> {signupDetail?.signupMetadata?.name || signupDetail?.profile?.name || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Email:</span> {signupDetail?.profile?.email || selectedUser.email || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Phone:</span> {signupDetail?.signupMetadata?.phone || signupDetail?.profile?.phone || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Role:</span> {String(signupDetail?.signupMetadata?.role || signupDetail?.profile?.role || selectedUser.role || 'N/A').toUpperCase()}</div>
                    <div><span className="font-semibold text-gray-700">Date of Birth:</span> {signupDetail?.signupMetadata?.date_of_birth || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Race / Emergency Contact:</span> {signupDetail?.signupMetadata?.race || 'N/A'}</div>
                    <div className="md:col-span-2"><span className="font-semibold text-gray-700">Location:</span> {signupDetail?.signupMetadata?.location || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Referral Code:</span> {signupDetail?.signupMetadata?.referral_code || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-700">Registered At:</span> {signupDetail?.profile?.created_at ? new Date(signupDetail.profile.created_at).toLocaleString() : (selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A')}</div>
                    <div className="md:col-span-2 text-xs text-gray-500 font-mono"><span className="font-semibold text-gray-600">User ID:</span> {selectedUser.id}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
