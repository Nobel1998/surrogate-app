-- 临时禁用 events 表的 RLS，用于测试
-- 在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 禁用 RLS（仅用于测试，确认问题后记得重新启用）
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- 测试完成后，重新启用 RLS：
-- ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;




