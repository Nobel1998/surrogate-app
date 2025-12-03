import { supabase } from '../lib/supabase';

/**
 * 上传媒体文件到 Supabase Storage
 * 使用 FormData 方式，避免使用已弃用的 FileSystem API
 */
export const uploadMedia = async (localUri, mediaType, onProgress = () => {}) => {
  try {
    console.log('Starting upload:', localUri, mediaType);
    onProgress(10);
    
    // 获取文件扩展名和 MIME 类型
    const fileExtension = getFileExtension(localUri, mediaType);
    const mimeType = getMimeType(fileExtension, mediaType);
    
    // 生成唯一文件名
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const filePath = `posts/${fileName}`;
    
    console.log('File path:', filePath, 'MIME:', mimeType);
    onProgress(30);
    
    // 创建 FormData
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      type: mimeType,
      name: fileName,
    });
    
    console.log('FormData created');
    onProgress(50);
    
    // 使用 Supabase 的 upload 方法
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(filePath, formData, {
        contentType: mimeType,
        upsert: false,
      });
    
    onProgress(90);
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('Upload success:', data);
    
    // 获取公共 URL
    const { data: urlData } = supabase.storage
      .from('post-media')
      .getPublicUrl(filePath);
    
    onProgress(100);
    console.log('Public URL:', urlData.publicUrl);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
};

function getFileExtension(uri, mediaType) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match) {
    const ext = match[1].toLowerCase();
    const validExts = mediaType === 'video' 
      ? ['mp4', 'mov', 'avi', 'm4v'] 
      : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'];
    if (validExts.includes(ext)) return ext;
  }
  return mediaType === 'video' ? 'mp4' : 'jpg';
}

function getMimeType(ext, mediaType) {
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', m4v: 'video/x-m4v'
  };
  return types[ext] || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
}

export const deleteMedia = async (publicUrl) => {
  try {
    const parts = publicUrl.split('/post-media/');
    if (parts.length < 2) return;
    await supabase.storage.from('post-media').remove([parts[1]]);
  } catch (e) {
    console.error('Delete failed:', e);
  }
};