-- 删除所有申请记录（用于测试）
-- ⚠️ 警告：这个操作不可逆，会删除所有申请数据
-- 在Supabase Dashboard的SQL编辑器中运行

BEGIN;

-- 方法1: 直接删除（如果RLS允许）
-- 如果遇到权限错误，使用下面的方法2

-- 临时禁用RLS以便删除所有记录
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

-- 删除所有申请记录
DELETE FROM public.applications;

-- 重新启用RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 验证删除结果
SELECT 
    COUNT(*) as remaining_applications
FROM public.applications;

-- 显示结果
SELECT '✅ All applications deleted successfully!' as status;

COMMIT;

-- 注意：
-- 1. 这个脚本会临时禁用RLS来删除所有记录
-- 2. 删除完成后会自动重新启用RLS
-- 3. 如果只想删除特定用户的申请，可以使用：
--    DELETE FROM public.applications WHERE user_id = 'user-uuid-here';
