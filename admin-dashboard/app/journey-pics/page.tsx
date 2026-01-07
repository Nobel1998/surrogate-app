'use client';

import { useEffect, useState } from 'react';

type JourneyPic = {
  id: string;
  match_id: string;
  image_url: string;
  file_name: string | null;
  title: string | null;
  description: string | null;
  photo_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  match?: Match;
};

type Match = {
  id: string;
  surrogate_id: string;
  parent_id: string;
  status: string;
  surrogate?: {
    id: string;
    name: string;
    phone: string;
  };
  parent?: {
    id: string;
    name: string;
    phone: string;
  };
};

type Profile = {
  id: string;
  name: string;
  phone: string;
  role: string;
};

export default function JourneyPicsPage() {
  const [pics, setPics] = useState<JourneyPic[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedPic, setSelectedPic] = useState<JourneyPic | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [filterMatchId, setFilterMatchId] = useState<string>('all');
  const [filterMatchStatus, setFilterMatchStatus] = useState<string>('all');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    match_id: '',
    title: '',
    description: '',
    photo_date: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, [filterMatchId, filterMatchStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load matches
      const matchesRes = await fetch('/api/matches/options');
      if (!matchesRes.ok) {
        throw new Error(`Failed to load data: ${matchesRes.statusText}`);
      }
      const matchesData = await matchesRes.json();
      
      const matchesList = matchesData.matches || [];
      const profiles = matchesData.profiles || [];
      
      const profilesMap = new Map<string, Profile>(profiles.map((p: Profile) => [p.id, p]));
      
      const enrichedMatches = matchesList.map((match: Match) => {
        const surrogate = match.surrogate_id ? profilesMap.get(match.surrogate_id) : undefined;
        const parent = match.parent_id ? profilesMap.get(match.parent_id) : undefined;
        return {
          ...match,
          surrogate: surrogate ? { id: surrogate.id, name: surrogate.name, phone: surrogate.phone } : undefined,
          parent: parent ? { id: parent.id, name: parent.name, phone: parent.phone } : undefined,
        };
      });
      
      setMatches(enrichedMatches);

      // Load journey pics
      const picsRes = await fetch('/api/journey-pics');
      if (!picsRes.ok) {
        throw new Error(`Failed to load journey pics: ${picsRes.statusText}`);
      }
      const picsData = await picsRes.json();
      
      const picsList = picsData.pics || [];
      
      // Enrich with match info
      const matchesMap = new Map<string, Match>(enrichedMatches.map((m: Match) => [m.id, m]));
      const enrichedPics = picsList.map((pic: JourneyPic) => ({
        ...pic,
        match: pic.match_id ? matchesMap.get(pic.match_id) : undefined,
      }));
      
      setPics(enrichedPics);
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleAdd = () => {
    setFormData({
      match_id: '',
      title: '',
      description: '',
      photo_date: '',
      file: null,
    });
    setShowAddModal(true);
  };

  const handleEdit = (pic: JourneyPic) => {
    setSelectedPic(pic);
    setFormData({
      match_id: pic.match_id,
      title: pic.title || '',
      description: pic.description || '',
      photo_date: pic.photo_date ? pic.photo_date.split('T')[0] : '',
      file: null,
    });
    setShowEditModal(true);
  };

  const handleViewImage = (imageUrl: string) => {
    setViewingImageUrl(imageUrl);
    setShowImageViewer(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedPic) {
      // Update existing pic
      try {
        const res = await fetch('/api/journey-pics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedPic.id,
            title: formData.title,
            description: formData.description,
            photo_date: formData.photo_date || null,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update journey pic');
        }

        alert('Journey pic updated successfully');
        setShowEditModal(false);
        setSelectedPic(null);
        loadData();
      } catch (error: any) {
        console.error('Error updating journey pic:', error);
        alert(`Failed to update journey pic: ${error.message}`);
      }
    } else {
      // Create new pic
      if (!formData.file) {
        alert('Please select an image to upload');
        return;
      }

      if (!formData.match_id) {
        alert('Please select a match');
        return;
      }

      try {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.file);
        uploadFormData.append('match_id', formData.match_id);
        if (formData.title) uploadFormData.append('title', formData.title);
        if (formData.description) uploadFormData.append('description', formData.description);
        if (formData.photo_date) uploadFormData.append('photo_date', formData.photo_date);

        const res = await fetch('/api/journey-pics', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to upload journey pic');
        }

        alert('Journey pic uploaded successfully');
        setShowAddModal(false);
        loadData();
      } catch (error: any) {
        console.error('Error uploading journey pic:', error);
        alert(`Failed to upload journey pic: ${error.message}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journey pic?')) {
      return;
    }

    try {
      const res = await fetch(`/api/journey-pics?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete journey pic');
      }

      alert('Journey pic deleted successfully');
      loadData();
    } catch (error: any) {
      console.error('Error deleting journey pic:', error);
      alert(`Failed to delete journey pic: ${error.message}`);
    }
  };

  const filteredPics = pics.filter((pic) => {
    if (filterMatchId !== 'all' && pic.match_id !== filterMatchId) return false;
    if (filterMatchStatus !== 'all' && pic.match?.status !== filterMatchStatus) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Journey Pics</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Photo
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Match</label>
          <select
            value={filterMatchId}
            onChange={(e) => setFilterMatchId(e.target.value)}
            className="border rounded px-3 py-2 min-w-[300px]"
          >
            <option value="all">All Matches</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.surrogate?.name || 'Surrogate'} ↔ {match.parent?.name || 'Parent'} (ID: {match.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Match Status</label>
          <select
            value={filterMatchStatus}
            onChange={(e) => setFilterMatchStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total Photos</div>
          <div className="text-2xl font-bold">{filteredPics.length}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-2xl font-bold">
            {filteredPics.filter((p) => {
              const picDate = p.photo_date ? new Date(p.photo_date) : new Date(p.created_at);
              const now = new Date();
              return picDate.getMonth() === now.getMonth() && picDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredPics.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No journey pics found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPics.map((pic) => (
            <div key={pic.id} className="bg-white rounded shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="relative aspect-square cursor-pointer bg-gray-100"
                onClick={() => handleViewImage(pic.image_url)}
              >
                <img
                  src={pic.image_url}
                  alt={pic.title || 'Journey Pic'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {formatDate(pic.photo_date)}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 truncate">
                  {pic.title || 'Untitled'}
                </h3>
                {pic.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{pic.description}</p>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  {pic.match?.surrogate?.name || 'Surrogate'} ↔ {pic.match?.parent?.name || 'Parent'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pic)}
                    className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(pic.id)}
                    className="flex-1 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Journey Pic</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Match *</label>
                <select
                  value={formData.match_id}
                  onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a match</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.surrogate?.name || 'Surrogate'} ↔ {match.parent?.name || 'Parent'} (ID: {match.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, JPEG, PNG, GIF, WEBP</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter photo title"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Enter photo description"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Photo Date</label>
                <input
                  type="date"
                  value={formData.photo_date}
                  onChange={(e) => setFormData({ ...formData, photo_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Journey Pic</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter photo title"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Enter photo description"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Photo Date</label>
                <input
                  type="date"
                  value={formData.photo_date}
                  onChange={(e) => setFormData({ ...formData, photo_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPic(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && viewingImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => {
            setShowImageViewer(false);
            setViewingImageUrl(null);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] p-4">
            <button
              onClick={() => {
                setShowImageViewer(false);
                setViewingImageUrl(null);
              }}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            >
              ×
            </button>
            <img
              src={viewingImageUrl}
              alt="Journey Pic"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

