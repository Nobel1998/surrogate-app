-- 直接查询数据库中的事件数据
-- 请在 Supabase Dashboard > SQL Editor 中运行这个查询

SELECT 
    id,
    title,
    event_date,
    updated_at,
    created_at
FROM public.events
WHERE id = 'da96dcc3-6dae-4a56-afd7-d116ece7d733';

-- 如果你是管理员，也可以尝试直接更新
-- UPDATE public.events
-- SET event_date = '2026-01-15 18:00:00+00'
-- WHERE id = 'da96dcc3-6dae-4a56-afd7-d116ece7d733';









































