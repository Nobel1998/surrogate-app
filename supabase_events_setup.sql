-- Events 系统 Supabase 表结构
-- 需要在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 创建 events 表
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT, -- 详细内容，支持富文本
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    category VARCHAR(50) DEFAULT 'General',
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'draft')),
    is_featured BOOLEAN DEFAULT false,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 创建 event_registrations 表（用户报名参与事件）
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    UNIQUE(event_id, user_id)
);

-- 3. 创建 event_likes 表（用户点赞事件）
CREATE TABLE IF NOT EXISTS public.event_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- 4. 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 启用行级安全 (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略

-- Events 表策略
CREATE POLICY "Anyone can view active events" ON public.events
    FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can view all events" ON public.events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert events" ON public.events
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@admin.%');

CREATE POLICY "Only admins can update events" ON public.events
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@admin.%');

CREATE POLICY "Only admins can delete events" ON public.events
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@admin.%');

-- Event registrations 表策略
CREATE POLICY "Users can view their own registrations" ON public.event_registrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registrations" ON public.event_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON public.event_registrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registrations" ON public.event_registrations
    FOR DELETE USING (auth.uid() = user_id);

-- Event likes 表策略
CREATE POLICY "Users can view event likes" ON public.event_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON public.event_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.event_likes
    FOR DELETE USING (auth.uid() = user_id);

-- 7. 创建有用的视图
CREATE OR REPLACE VIEW public.events_with_stats AS
SELECT 
    e.*,
    COALESCE(r.registration_count, 0) as registration_count,
    COALESCE(l.likes_count, 0) as likes_count
FROM public.events e
LEFT JOIN (
    SELECT event_id, COUNT(*) as registration_count
    FROM public.event_registrations
    WHERE status = 'registered'
    GROUP BY event_id
) r ON e.id = r.event_id
LEFT JOIN (
    SELECT event_id, COUNT(*) as likes_count
    FROM public.event_likes
    GROUP BY event_id
) l ON e.id = l.event_id;

-- 8. 插入示例数据
INSERT INTO public.events (title, description, content, event_date, location, category, image_url, is_featured) VALUES
('Annual Surrogacy Gathering', 'Join us for our annual gathering to celebrate the miracle of life. Meet other surrogates and intended parents.', 'Our annual gathering is a special event where we bring together surrogates, intended parents, and families to celebrate the incredible journey of surrogacy. This year''s event will feature keynote speakers, breakout sessions, and networking opportunities.', '2024-06-15 14:00:00+00', 'Los Angeles, CA', 'Gathering', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true),

('Medical Screening Info Session', 'Learn everything you need to know about the medical screening process.', 'This comprehensive session will cover all aspects of the medical screening process for surrogates, including what to expect, how to prepare, and common questions and concerns.', '2024-05-20 10:00:00+00', 'Online Webinar', 'Medical', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', false),

('Surrogate Support Group', 'Monthly support group meeting for current surrogates.', 'Join our monthly support group where current surrogates can share experiences, ask questions, and connect with others on similar journeys. Light refreshments will be provided.', '2024-05-01 18:00:00+00', 'San Diego, CA', 'Support', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', false),

('Legal Workshop: Understanding Your Rights', 'Essential legal information for surrogates and intended parents.', 'This workshop covers the legal aspects of surrogacy, including contracts, rights and responsibilities, and state-specific regulations. Led by experienced surrogacy attorneys.', '2024-05-25 13:00:00+00', 'Phoenix, AZ', 'Legal', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', true);

COMMIT;




