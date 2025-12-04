-- 为applications表添加user_id字段并设置RLS策略
-- 在Supabase Dashboard的SQL编辑器中运行

BEGIN;

-- 1. 检查user_id字段是否存在，如果不存在则添加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        -- 添加user_id字段
        ALTER TABLE public.applications 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- 为现有记录设置默认值（如果有的话）
        -- 注意：这会将所有现有申请关联到第一个用户，你可能需要手动更新
        UPDATE public.applications 
        SET user_id = (SELECT id FROM auth.users LIMIT 1)
        WHERE user_id IS NULL;
        
        -- 设置NOT NULL约束（在更新现有数据后）
        ALTER TABLE public.applications 
        ALTER COLUMN user_id SET NOT NULL;
        
        RAISE NOTICE 'Added user_id column to applications table';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- 2. 确保RLS已启用
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 3. 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Allow admin dashboard full access" ON public.applications;

-- 4. 创建新的RLS策略

-- 策略1: 用户只能查看自己的申请
CREATE POLICY "Users can view own applications" ON public.applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 策略2: 用户只能插入自己的申请
CREATE POLICY "Users can insert own applications" ON public.applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 策略3: 用户只能更新自己的申请（如果需要的话）
CREATE POLICY "Users can update own applications" ON public.applications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 策略4: 允许service role查看所有申请（用于admin dashboard使用service role key）
-- 注意：service role会绕过RLS，所以这个策略主要用于文档说明
-- Admin dashboard应该使用service role key来绕过RLS限制
-- 如果admin dashboard使用anon key，需要临时允许anon访问（不推荐用于生产）
-- 生产环境建议：在Vercel环境变量中设置NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
-- 并在admin dashboard中使用service role key创建Supabase客户端

-- 临时方案：允许anon用户查看和更新（仅用于开发/测试）
-- ⚠️ 警告：生产环境应该移除这个策略，改用service role key
CREATE POLICY "Temporary: Allow anon access for admin dashboard" ON public.applications
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- 策略5: 允许认证用户更新所有申请（用于admin dashboard）
-- 注意：这允许任何认证用户更新申请状态
-- 生产环境应该使用service role key或创建专门的admin认证
-- 或者添加profiles表来区分管理员和普通用户
CREATE POLICY "Allow authenticated users to update all for admin" ON public.applications
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. 验证设置
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND table_schema = 'public'
AND column_name = 'user_id';

-- 6. 验证RLS策略
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' 
AND pc.relname = 'applications'
ORDER BY pol.polname;

COMMIT;

-- 完成提示
SELECT '✅ Applications table updated with user_id and RLS policies!' as status;
