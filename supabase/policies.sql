alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_saves enable row level security;
alter table public.video_comments enable row level security;

-- Re-runnable policy setup.
drop policy if exists "profiles are publicly readable" on public.profiles;
drop policy if exists "users insert own profiles" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "videos are publicly readable" on public.videos;
drop policy if exists "users insert own videos" on public.videos;
drop policy if exists "users update own videos" on public.videos;
drop policy if exists "users delete own videos" on public.videos;
drop policy if exists "likes are publicly readable" on public.video_likes;
drop policy if exists "users insert own likes" on public.video_likes;
drop policy if exists "users delete own likes" on public.video_likes;
drop policy if exists "users read own saves" on public.video_saves;
drop policy if exists "users insert own saves" on public.video_saves;
drop policy if exists "users delete own saves" on public.video_saves;
drop policy if exists "comments are publicly readable" on public.video_comments;
drop policy if exists "users insert own comments" on public.video_comments;
drop policy if exists "users update own comments" on public.video_comments;
drop policy if exists "users delete own comments" on public.video_comments;

-- Profiles
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users insert own profiles" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Videos
create policy "videos are publicly readable" on public.videos for select using (true);
create policy "users insert own videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "users update own videos" on public.videos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own videos" on public.videos for delete using (auth.uid() = user_id);

-- Likes
create policy "likes are publicly readable" on public.video_likes for select using (true);
create policy "users insert own likes" on public.video_likes for insert with check (auth.uid() = user_id);
create policy "users delete own likes" on public.video_likes for delete using (auth.uid() = user_id);

-- Saves
create policy "users read own saves" on public.video_saves for select using (auth.uid() = user_id);
create policy "users insert own saves" on public.video_saves for insert with check (auth.uid() = user_id);
create policy "users delete own saves" on public.video_saves for delete using (auth.uid() = user_id);

-- Comments
create policy "comments are publicly readable" on public.video_comments for select using (true);
create policy "users insert own comments" on public.video_comments for insert with check (auth.uid() = user_id);
create policy "users update own comments" on public.video_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own comments" on public.video_comments for delete using (auth.uid() = user_id);

-- Storage bucket setup. Create public buckets named: videos, thumbnails, avatars.
-- These policies allow public reads and authenticated writes only inside the user's own auth-id folder.
drop policy if exists "public read videos" on storage.objects;
drop policy if exists "public read thumbnails" on storage.objects;
drop policy if exists "public read avatars" on storage.objects;
drop policy if exists "users upload own video files" on storage.objects;
drop policy if exists "users upload own thumbnails" on storage.objects;
drop policy if exists "users upload own avatars" on storage.objects;
drop policy if exists "users update own storage files" on storage.objects;
drop policy if exists "users delete own storage files" on storage.objects;

create policy "public read videos" on storage.objects for select using (bucket_id = 'videos');
create policy "public read thumbnails" on storage.objects for select using (bucket_id = 'thumbnails');
create policy "public read avatars" on storage.objects for select using (bucket_id = 'avatars');

create policy "users upload own video files" on storage.objects for insert with check (
  bucket_id = 'videos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users upload own thumbnails" on storage.objects for insert with check (
  bucket_id = 'thumbnails'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users upload own avatars" on storage.objects for insert with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users update own storage files" on storage.objects for update using (
  auth.role() = 'authenticated'
  and bucket_id in ('videos', 'thumbnails', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  auth.role() = 'authenticated'
  and bucket_id in ('videos', 'thumbnails', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete own storage files" on storage.objects for delete using (
  auth.role() = 'authenticated'
  and bucket_id in ('videos', 'thumbnails', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);
