-- 更新Events日期到未来，让注册功能可见
-- 在Supabase Dashboard的SQL编辑器中运行

BEGIN;

-- 更新现有events到2025年的未来日期
UPDATE public.events 
SET event_date = '2025-03-15 14:00:00+00'
WHERE title = 'Annual Surrogacy Gathering';

UPDATE public.events 
SET event_date = '2025-02-20 10:00:00+00'
WHERE title = 'Medical Screening Info Session';

UPDATE public.events 
SET event_date = '2025-02-01 18:00:00+00'
WHERE title = 'Surrogate Support Group';

UPDATE public.events 
SET event_date = '2025-02-25 13:00:00+00'
WHERE title = 'Legal Workshop: Understanding Your Rights';

-- 添加一些新的2025年events
INSERT INTO public.events (title, description, content, event_date, location, category, image_url, is_featured, max_participants) VALUES
('New Year Wellness Workshop', 'Start 2025 with health and wellness focused on surrogates.', 'Join us for a comprehensive wellness workshop covering nutrition, exercise, and mental health for surrogates. Expert speakers will share insights on maintaining optimal health throughout the surrogacy journey.', '2025-01-15 10:00:00+00', 'San Francisco, CA', 'Wellness', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, 50),

('Virtual Q&A with Experienced Surrogates', 'Connect with surrogates who have completed their journey.', 'This virtual session allows current and prospective surrogates to ask questions and get advice from those who have successfully completed the surrogacy process. Topics include managing relationships with intended parents, handling pregnancy challenges, and emotional support.', '2025-01-25 19:00:00+00', 'Online Zoom', 'Support', 'https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', false, 100),

('Financial Planning for Surrogates', 'Understanding compensation and financial planning.', 'Learn about surrogate compensation structures, tax implications, and financial planning strategies. Financial advisors will provide guidance on managing surrogate income and planning for the future.', '2025-02-10 14:00:00+00', 'Denver, CO', 'Financial', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', false, 30),

('Spring Surrogacy Conference 2025', 'The largest surrogacy conference of the year.', 'Join hundreds of surrogates, intended parents, and industry professionals for our annual spring conference. Features include keynote speakers, educational workshops, networking opportunities, and celebration ceremonies. Early bird registration available.', '2025-04-12 09:00:00+00', 'Las Vegas, NV', 'Conference', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true, 500);

COMMIT;

-- 验证更新
SELECT id, title, event_date, status FROM public.events ORDER BY event_date;





















