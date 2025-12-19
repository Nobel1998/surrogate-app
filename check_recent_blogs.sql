-- 查询最近发布的blog文章状态
-- 请在 Supabase Dashboard > SQL Editor 中运行此查询

SELECT 
    id,
    title,
    status,
    event_date,
    created_at,
    is_featured
FROM public.events
ORDER BY created_at DESC
LIMIT 5;








