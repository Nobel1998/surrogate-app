-- 添加测试数据用于My Match功能演示
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 创建测试客人档案
INSERT INTO public.client_profiles (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    city,
    state,
    occupation,
    partner_name,
    partner_occupation,
    fertility_history,
    preferences
) VALUES (
    gen_random_uuid(), -- 这里需要替换为实际的用户ID
    'Sarah',
    'Johnson',
    'sarah.johnson@email.com',
    '+1 (555) 123-4567',
    'Los Angeles',
    'CA',
    'Marketing Director',
    'Michael Johnson',
    'Software Engineer',
    'Tried IVF for 3 years, looking for a caring surrogate to help us complete our family.',
    'Looking for someone who maintains a healthy lifestyle and is open to regular communication.'
) ON CONFLICT (user_id) DO NOTHING;

-- 2. 创建测试匹配关系（需要替换实际的用户ID）
-- INSERT INTO public.matches (
--     surrogate_id,
--     client_id,
--     status,
--     expected_due_date,
--     contract_signed
-- ) VALUES (
--     'YOUR_SURROGATE_USER_ID', -- 替换为实际的代母用户ID
--     (SELECT user_id FROM public.client_profiles WHERE email = 'sarah.johnson@email.com'),
--     'active',
--     '2025-08-15',
--     true
-- );

-- 3. 创建测试合同文档（匹配创建后运行）
-- INSERT INTO public.contracts (
--     match_id,
--     title,
--     document_type,
--     file_url,
--     file_name,
--     status,
--     is_signed
-- ) VALUES 
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'Surrogacy Agreement Contract',
--     'contract',
--     'https://example.com/contract.pdf',
--     'surrogacy_agreement_2025.pdf',
--     'signed',
--     true
-- ),
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'Medical Records Release',
--     'medical',
--     'https://example.com/medical.pdf',
--     'medical_release_form.pdf',
--     'signed',
--     true
-- ),
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'Insurance Documentation',
--     'insurance',
--     'https://example.com/insurance.pdf',
--     'insurance_policy.pdf',
--     'review',
--     false
-- );

-- 4. 创建测试旅程更新（匹配创建后运行）
-- INSERT INTO public.journey_updates (
--     match_id,
--     surrogate_id,
--     update_type,
--     title,
--     content,
--     week_number
-- ) VALUES 
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'YOUR_SURROGATE_USER_ID',
--     'milestone',
--     'Positive Pregnancy Test!',
--     'Great news! The pregnancy test came back positive. We are so excited to begin this journey together.',
--     4
-- ),
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'YOUR_SURROGATE_USER_ID',
--     'medical',
--     'First Ultrasound Appointment',
--     'Had the first ultrasound today. Everything looks perfect! The baby is developing well.',
--     8
-- ),
-- (
--     (SELECT id FROM public.matches WHERE surrogate_id = 'YOUR_SURROGATE_USER_ID'),
--     'YOUR_SURROGATE_USER_ID',
--     'general',
--     'Feeling Great at 12 Weeks',
--     'Morning sickness has subsided and I am feeling much better. Looking forward to the next appointment.',
--     12
-- );

-- 查看现有用户以获取正确的ID
SELECT id, email FROM auth.users LIMIT 5;

COMMIT;
