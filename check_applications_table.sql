-- 检查applications表结构和权限
-- 在Supabase Dashboard的SQL编辑器中运行

-- 1. 检查applications表的结构
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 检查是否启用了RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'applications';

-- 3. 检查现有的RLS策略
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polroles as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' 
AND pc.relname = 'applications';

-- 4. 如果需要，创建或修改RLS策略以允许管理员操作
-- 注意：这假设admin dashboard使用service role key或有特殊标识

-- 首先启用RLS（如果还没有）
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 创建策略允许所有操作（适用于admin dashboard）
-- 注意：在生产环境中，你可能想要更严格的策略
DO $$ 
BEGIN
    -- 删除现有策略（如果存在）
    DROP POLICY IF EXISTS "Allow admin dashboard full access" ON public.applications;
    
    -- 创建新策略允许所有操作
    -- 这个策略允许所有认证用户进行所有操作
    -- 在生产中，你可能想要基于用户角色或其他条件来限制
    CREATE POLICY "Allow admin dashboard full access" ON public.applications
        FOR ALL 
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
    -- 或者，如果你想允许匿名访问（不推荐用于生产）
    -- CREATE POLICY "Allow public access" ON public.applications
    --     FOR ALL 
    --     TO anon
    --     USING (true)
    --     WITH CHECK (true);
        
END $$;

-- 5. 验证策略
SELECT 'Applications table RLS policies:' as info;
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polroles as roles
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public' 
AND pc.relname = 'applications';















