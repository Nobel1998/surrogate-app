'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Event {
  id?: string;
  title: string;
  description: string;
  content: string;
  event_date: string;
  location: string;
  category: string;
  image_url: string;
  status: 'active' | 'cancelled' | 'completed' | 'draft';
  is_featured: boolean;
  max_participants: number | null;
}

interface EventFormProps {
  event?: Event | null;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ['News', 'Policy', 'Medical', 'Legal', 'Event', 'Health', 'General'];

export default function EventForm({ event, onClose, onSuccess }: EventFormProps) {
  const [formData, setFormData] = useState<Event>({
    title: '',
    description: '',
    content: '',
    event_date: '',
    location: '',
    category: 'General',
    image_url: '',
    status: 'active',
    is_featured: false,
    max_participants: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (event) {
      // Only extract fields that belong to the Event interface, excluding stats columns
      setFormData({
        title: event.title,
        description: event.description,
        content: event.content,
        event_date: new Date(event.event_date).toISOString().slice(0, 16),
        location: event.location,
        category: event.category,
        image_url: event.image_url,
        status: event.status,
        is_featured: event.is_featured,
        max_participants: event.max_participants,
      });
    } else {
      // Reset form when creating new event
      setFormData({
        title: '',
        description: '',
        content: '',
        event_date: '',
        location: '',
        category: 'General',
        image_url: '',
        status: 'active',
        is_featured: false,
        max_participants: null,
      });
    }
    // Reset image upload state
    setSelectedImageFile(null);
    setImagePreview(null);
    setUploadSuccess(false);
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 只提交 events 表中实际存在的字段，排除统计字段
      const submitData = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        event_date: new Date(formData.event_date).toISOString(),
        location: formData.location,
        category: formData.category,
        image_url: formData.image_url,
        status: formData.status,
        is_featured: formData.is_featured,
        max_participants: formData.max_participants || null,
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleSubmit:beforeUpdate',message:'Before submitting form',data:{isEdit:!!event?.id,eventId:event?.id,submitData:submitData,formDataImageUrl:formData.image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion

      if (event?.id) {
        // 更新文章 - 使用 .match() 确保精确匹配
        console.log('Updating article with ID:', event.id);
        console.log('Update data:', submitData);
        
        const { data: updateResult, error: updateError, count } = await supabase
          .from('events')
          .update(submitData)
          .eq('id', event.id)
          .select();

        console.log('Update result:', { 
          updateResult, 
          updateError, 
          count,
          rowsAffected: updateResult?.length 
        });
        
        if (updateError) {
          console.error('Update failed:', updateError);
          throw updateError;
        }
        
        if (!updateResult || updateResult.length === 0) {
          throw new Error('Update succeeded but no rows were affected. This may be a permission issue.');
        }
        
        console.log('Update successful! Updated article:', updateResult[0]);
        
        // 等待一下确保数据库提交
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 验证更新是否真的生效
        const { data: verifyData, error: verifyError } = await supabase
          .from('events')
          .select('id, title, event_date, image_url, updated_at')
          .eq('id', event.id)
          .single();
          
        console.log('Verification result:', { verifyData, verifyError });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleSubmit:verification',message:'After update verification',data:{verifyData:verifyData,submitDataImageUrl:submitData.image_url,verifyDataImageUrl:verifyData?.image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion
        
        if (verifyData) {
          // Compare dates as Date objects to handle timezone format differences
          const expectedDate = new Date(submitData.event_date);
          const actualDate = new Date(verifyData.event_date);
          
          if (expectedDate.getTime() !== actualDate.getTime()) {
            console.error('❌ CRITICAL: Article date mismatch after update!');
            console.error('Expected:', submitData.event_date, '→', expectedDate);
            console.error('Got:', verifyData.event_date, '→', actualDate);
            throw new Error(`Update verification failed: date is ${verifyData.event_date} instead of ${submitData.event_date}`);
          } else {
            console.log('✅ Date verification passed! Times match:', {
              expected: expectedDate.toISOString(),
              actual: actualDate.toISOString()
            });
          }

          // Verify image_url
          if (submitData.image_url !== verifyData.image_url) {
            console.error('❌ CRITICAL: Article image_url mismatch after update!');
            console.error('Expected:', submitData.image_url);
            console.error('Got:', verifyData.image_url);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleSubmit:imageUrlMismatch',message:'Image URL mismatch detected',data:{expected:submitData.image_url,actual:verifyData.image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          } else {
            console.log('✅ Image URL verification passed!', {
              expected: submitData.image_url,
              actual: verifyData.image_url
            });
          }
        }
      } else {
        // 创建新文章
        const { error } = await supabase
          .from('events')
          .insert([submitData]);

        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setSelectedImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) return;

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImageFile);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleImageUpload:start',message:'Starting image upload',data:{fileName:selectedImageFile.name,fileSize:selectedImageFile.size,fileType:selectedImageFile.type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      const res = await fetch('/api/events/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleImageUpload:afterFetch',message:'After fetch response',data:{resOk:res.ok,data:data,currentImageUrl:formData.image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleImageUpload:beforeUpdate',message:'Before updating image_url',data:{uploadedUrl:data.url,currentFormDataImageUrl:formData.image_url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      // Set the uploaded image URL
      handleInputChange('image_url', data.url);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleImageUpload:afterUpdate',message:'After updating image_url',data:{newImageUrl:formData.image_url,uploadedUrl:data.url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      // Update preview to show uploaded image from URL
      setImagePreview(data.url);
      setSelectedImageFile(null);
      setUploadSuccess(true);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed2cc5d5-a27e-4b2b-ba07-22ce53d66cf9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EventForm.tsx:handleImageUpload:error',message:'Image upload error',data:{error:err?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'all'})}).catch(()=>{});
      // #endregion
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {event ? 'Edit Blog Article' : 'Create New Blog Article'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Summary *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
                placeholder="Brief summary that will appear in the article list"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                placeholder="Full article content, news details, policy information, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location / Source
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Los Angeles, CA or Online or leave blank for general articles"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants (Events Only)
                </label>
                <input
                  type="number"
                  value={formData.max_participants || ''}
                  onChange={(e) => handleInputChange('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Only for Event category articles"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image
              </label>
              
              {/* File Upload Section */}
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Upload Image (JPEG, PNG, GIF, WebP - Max 5MB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageFileSelect}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={uploadingImage}
                  />
                  {selectedImageFile && (
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                </div>
                {uploadSuccess && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    ✓ Image uploaded successfully! URL has been set.
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-20 object-cover rounded border"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadSuccess ? 'Uploaded image preview' : 'Preview - Click Upload to save'}
                    </p>
                  </div>
                )}
              </div>

              {/* Or URL Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Enter Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Image Preview */}
              {formData.image_url && !imagePreview && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-32 h-20 object-cover rounded border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured Article</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : (event ? 'Update Article' : 'Create Article')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

