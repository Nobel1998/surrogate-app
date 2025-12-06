-- My Match 功能数据库结构
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 创建 matches 表（代母和客人的匹配关系）
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    surrogate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    match_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expected_due_date DATE,
    contract_signed BOOLEAN DEFAULT false,
    contract_signed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(surrogate_id, client_id)
);

-- 2. 创建 client_profiles 表（客人信息）
CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'United States',
    date_of_birth DATE,
    occupation VARCHAR(200),
    partner_name VARCHAR(200),
    partner_occupation VARCHAR(200),
    fertility_history TEXT,
    preferences TEXT,
    special_requests TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 创建 contracts 表（合同文档）
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'contract' CHECK (document_type IN ('contract', 'medical', 'legal', 'insurance', 'other')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES auth.users(id),
    is_signed BOOLEAN DEFAULT false,
    signed_date TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'signed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 创建 journey_updates 表（代孕进展更新）
CREATE TABLE IF NOT EXISTS public.journey_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    surrogate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    update_type VARCHAR(50) DEFAULT 'general' CHECK (update_type IN ('general', 'medical', 'milestone', 'appointment', 'photo')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    week_number INTEGER,
    appointment_date TIMESTAMP WITH TIME ZONE,
    photos TEXT[], -- Array of photo URLs
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at BEFORE UPDATE ON public.client_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_updates_updated_at BEFORE UPDATE ON public.journey_updates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 启用行级安全 (RLS)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_updates ENABLE ROW LEVEL SECURITY;

-- 7. 创建 RLS 策略

-- Matches 表策略
CREATE POLICY "Users can view their own matches" ON public.matches
    FOR SELECT USING (auth.uid() = surrogate_id OR auth.uid() = client_id);

CREATE POLICY "Admins can manage all matches" ON public.matches
    FOR ALL USING (auth.role() = 'authenticated');

-- Client profiles 表策略
CREATE POLICY "Users can view client profiles in their matches" ON public.client_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches m 
            WHERE (m.surrogate_id = auth.uid() OR m.client_id = auth.uid())
            AND m.client_id = client_profiles.user_id
        )
    );

CREATE POLICY "Users can manage their own profile" ON public.client_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Contracts 表策略
CREATE POLICY "Match participants can view contracts" ON public.contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches m 
            WHERE m.id = contracts.match_id
            AND (m.surrogate_id = auth.uid() OR m.client_id = auth.uid())
        )
    );

CREATE POLICY "Match participants can upload contracts" ON public.contracts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.matches m 
            WHERE m.id = contracts.match_id
            AND (m.surrogate_id = auth.uid() OR m.client_id = auth.uid())
        )
    );

-- Journey updates 表策略
CREATE POLICY "Match participants can view journey updates" ON public.journey_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches m 
            WHERE m.id = journey_updates.match_id
            AND (m.surrogate_id = auth.uid() OR m.client_id = auth.uid())
        )
    );

CREATE POLICY "Surrogates can create journey updates" ON public.journey_updates
    FOR INSERT WITH CHECK (auth.uid() = surrogate_id);

CREATE POLICY "Surrogates can update their journey updates" ON public.journey_updates
    FOR UPDATE USING (auth.uid() = surrogate_id);

-- 8. 创建有用的视图
CREATE OR REPLACE VIEW public.matches_with_details AS
SELECT 
    m.*,
    sp.first_name as surrogate_first_name,
    sp.last_name as surrogate_last_name,
    cp.first_name as client_first_name,
    cp.last_name as client_last_name,
    cp.email as client_email,
    cp.phone as client_phone,
    cp.city as client_city,
    cp.state as client_state,
    (SELECT COUNT(*) FROM public.contracts c WHERE c.match_id = m.id) as contract_count,
    (SELECT COUNT(*) FROM public.journey_updates ju WHERE ju.match_id = m.id) as update_count
FROM public.matches m
LEFT JOIN public.surrogate_profiles sp ON m.surrogate_id = sp.user_id
LEFT JOIN public.client_profiles cp ON m.client_id = cp.user_id;

COMMIT;
