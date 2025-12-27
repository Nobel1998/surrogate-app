-- 检查手机app查询条件的问题
-- 请在 Supabase Dashboard > SQL Editor 中运行此查询

-- 1. 检查最新的blog文章
SELECT 
    id,
    title,
    status,
    event_date,
    created_at,
    category,
    location
FROM public.events
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 3;

-- 2. 检查 events_with_stats 视图是否包含新文章
SELECT 
    id,
    title,
    status,
    event_date,
    created_at,
    likes_count,
    registration_count
FROM public.events_with_stats
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 3;

-- 3. 检查是否有日期排序问题
SELECT 
    id,
    title,
    event_date,
    created_at,
    (event_date > NOW()) as is_future_event
FROM public.events
WHERE status = 'active'
ORDER BY event_date ASC
LIMIT 5;




































