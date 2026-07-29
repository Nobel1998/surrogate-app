-- Applicant / signup IP for admin Application & Sign Up views
-- Run in Supabase SQL editor.

alter table public.profiles
  add column if not exists signup_ip text;

comment on column public.profiles.signup_ip is
  'Public IP recorded at Sign Up / soft-register time';

alter table public.profiles
  add column if not exists signup_ip_region text;

comment on column public.profiles.signup_ip_region is
  'Approximate geo region from signup IP (city, region, country)';

alter table public.applications
  add column if not exists ip_address text;

comment on column public.applications.ip_address is
  'Public IP recorded when surrogate application was submitted';

alter table public.applications
  add column if not exists ip_region text;

comment on column public.applications.ip_region is
  'Approximate geo region from application submit IP';

alter table public.intended_parent_applications
  add column if not exists ip_address text;

comment on column public.intended_parent_applications.ip_address is
  'Public IP recorded when intended-parent application was submitted';

alter table public.intended_parent_applications
  add column if not exists ip_region text;

comment on column public.intended_parent_applications.ip_region is
  'Approximate geo region from application submit IP';
