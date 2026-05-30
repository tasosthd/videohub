create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  category text,
  views integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(video_id, user_id)
);

create table if not exists public.video_saves (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  comment text not null,
  created_at timestamptz default now()
);

create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_category_idx on public.videos(category);
create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists comments_video_id_idx on public.video_comments(video_id);
create index if not exists likes_video_id_idx on public.video_likes(video_id);
create index if not exists saves_user_id_idx on public.video_saves(user_id);

-- Keeps updated_at fresh on profile edits.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Creates a matching profile when a Supabase Auth user is created.
-- This makes signup safer when email confirmation is enabled and no client session exists yet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'creator'), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'creator';
  end if;
  final_username := left(base_username, 18) || '_' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, email, username, full_name, avatar_url, bio)
  values (
    new.id,
    new.email,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', base_username),
    '',
    'New creator on VideoHub.'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Safe public RPC for view counts. It does not expose admin keys and avoids giving users broad update access.
create or replace function public.increment_video_views(video_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.videos
  set views = coalesce(views, 0) + 1
  where id = video_id_input;
end;
$$;

grant execute on function public.increment_video_views(uuid) to anon, authenticated;
