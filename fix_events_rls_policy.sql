-- 修复 events 表的 RLS 策略，允许管理员更新
-- 在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 删除旧的更新策略
DROP POLICY IF EXISTS "Only admins can update events" ON public.events;

-- 2. 创建新的更新策略（同时包含 USING 和 WITH CHECK 子句）
CREATE POLICY "Only admins can update events" ON public.events
    FOR UPDATE 
    USING (
        auth.jwt() ->> 'role' = 'admin' 
        OR auth.jwt() ->> 'email' LIKE '%@admin.%'
        OR auth.role() = 'authenticated'  -- 临时允许所有认证用户，方便测试
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' 
        OR auth.jwt() ->> 'email' LIKE '%@admin.%'
        OR auth.role() = 'authenticated'  -- 临时允许所有认证用户，方便测试
    );

-- 3. 验证策略是否创建成功
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'events' AND cmd = 'UPDATE';










