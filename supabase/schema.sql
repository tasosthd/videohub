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
