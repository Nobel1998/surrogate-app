-- 1. Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  invite_code text unique not null,
  referred_by text, -- Stores the invite code of the referrer
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- Policy: Everyone can read profiles (needed to check referral codes)
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- Policy: Users can update their own profile
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 3. Function to generate random invite code
create or replace function generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
begin
  for i in 1..6 loop
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  end loop;
  return result;
end;
$$;

-- 4. Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_invite_code text;
begin
  -- Generate a unique invite code (loop until unique)
  loop
    new_invite_code := generate_invite_code();
    begin
      insert into public.profiles (id, invite_code)
      values (new.id, new_invite_code);
      exit; -- Exit loop if insert succeeds
    exception when unique_violation then
      -- If code exists, loop again to generate a new one
      continue;
    end;
  end loop;
  return new;
end;
$$;

-- 5. Trigger to call the function on user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

