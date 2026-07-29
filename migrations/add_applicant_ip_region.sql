-- IP region (city/state/country) for admin Application & Sign Up views
-- Run after add_applicant_ip_address.sql if that already ran.

alter table public.profiles
  add column if not exists signup_ip_region text;

comment on column public.profiles.signup_ip_region is
  'Approximate geo region from signup IP (city, region, country)';

alter table public.applications
  add column if not exists ip_region text;

comment on column public.applications.ip_region is
  'Approximate geo region from application submit IP';

alter table public.intended_parent_applications
  add column if not exists ip_region text;

comment on column public.intended_parent_applications.ip_region is
  'Approximate geo region from application submit IP';
