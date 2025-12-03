# Supabase Storage 设置指南

## 创建 Storage Bucket

在 Supabase Dashboard 中执行以下步骤：

### 1. 进入 Storage 页面
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 点击左侧菜单的 **Storage**

### 2. 创建新的 Bucket
1. 点击 **New bucket** 按钮
2. 填写以下信息：
   - **Name**: `post-media`
   - **Public bucket**: ✅ **勾选**（重要！这样其他用户才能看到媒体文件）
   - **Allowed MIME types**: 留空（允许所有类型）或填写：
     ```
     image/jpeg,image/png,image/gif,image/webp,image/heic,video/mp4,video/quicktime,video/x-msvideo
     ```
   - **File size limit**: `100MB` (100000000 bytes) - 支持较长的视频文件
3. 点击 **Create bucket**

### 3. 设置 Storage Policies (RLS)

进入 **Storage** > **Policies** 页面，为 `post-media` bucket 添加以下策略：

#### Policy 1: 允许已登录用户上传文件
```sql
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');
```

#### Policy 2: 允许所有人读取文件（公开访问）
```sql
CREATE POLICY "Allow public to read files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');
```

#### Policy 3: 允许用户删除自己的文件
```sql
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. 在 SQL Editor 中运行以下命令

如果上面的 UI 方式不生效，可以在 **SQL Editor** 中运行：

```sql
-- 确保 storage schema 已启用
CREATE SCHEMA IF NOT EXISTS storage;

-- 为 post-media bucket 设置公开访问策略和文件大小限制
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('post-media', 'post-media', true, 100000000)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 100000000;

-- 允许已登录用户上传文件
CREATE POLICY "Allow authenticated users to upload files" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'post-media');

-- 允许所有人读取文件
CREATE POLICY "Allow public to read files" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'post-media');

-- 允许用户删除文件
CREATE POLICY "Allow authenticated users to delete files" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'post-media');
```

## 验证设置

1. 确保 `post-media` bucket 在 Storage 页面显示
2. 确保 bucket 旁边有 🌐 图标（表示公开）
3. 在 App 中尝试发布带图片/视频的帖子
4. 检查 Storage 页面是否有新文件上传

## 更新现有 Bucket 的文件大小限制

如果你已经创建了 `post-media` bucket，但需要增加文件大小限制，在 **SQL Editor** 中运行：

```sql
-- 更新现有 bucket 的文件大小限制为 100MB
UPDATE storage.buckets 
SET file_size_limit = 100000000 
WHERE id = 'post-media';

-- 验证设置
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'post-media';
```

## 故障排除

### 问题：上传失败 - "文件太大"
1. **检查 Bucket 设置**：
   ```sql
   SELECT file_size_limit FROM storage.buckets WHERE id = 'post-media';
   ```
2. **更新文件大小限制**：
   ```sql
   UPDATE storage.buckets SET file_size_limit = 100000000 WHERE id = 'post-media';
   ```

### 问题：上传失败 - 认证问题
- 检查用户是否已登录（需要 Supabase Auth 会话）
- 检查 bucket 是否存在
- 检查 RLS 策略是否正确

### 问题：其他用户看不到媒体
- 确保 bucket 设置为 **Public**
- 检查 SELECT 策略是否允许 `public` 角色

### 问题：视频质量问题
- App 现在使用最高质量设置 (`quality: 1`)
- 如果文件仍然太大，可以在拍摄时选择较短的视频

