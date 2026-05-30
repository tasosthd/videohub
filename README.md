# VideoHub Premium Supabase Video App

A deployable HTML/CSS/JavaScript video platform with Supabase Auth, Supabase Database, Supabase Storage, profiles, uploads, likes, saves, comments, search, and responsive premium UI.

## Project structure

```txt
/index.html
/login.html
/signup.html
/upload.html
/profile.html
/video.html
/search.html
/assets/css/style.css
/assets/js/supabase.js
/assets/js/auth.js
/assets/js/app.js
/assets/js/upload.js
/assets/js/profile.js
/assets/js/video.js
/assets/js/search.js
/supabase/schema.sql
/supabase/policies.sql
/README.md
```

## 1. Create the Supabase project

1. Go to Supabase.
2. Create a new project.
3. Open Project Settings > API.
4. Copy:
   - Project URL
   - anon public key

The anon key is safe in frontend JavaScript when Row Level Security is enabled. Never use the service_role key in frontend code.

## 2. Add Supabase credentials

Open:

```txt
assets/js/supabase.js
```

Replace:

```js
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
```

with your real Project URL and anon public key.

## 3. Run SQL schema

In Supabase:

1. Open SQL Editor.
2. Paste the contents of `supabase/schema.sql`.
3. Run it.

This creates:

- profiles
- videos
- video_likes
- video_saves
- video_comments

## 4. Enable RLS and policies

1. Open SQL Editor again.
2. Paste the contents of `supabase/policies.sql`.
3. Run it.

This enables RLS and adds safe policies for profiles, videos, likes, saves, comments, and storage.

## 5. Create storage buckets

In Supabase:

1. Go to Storage.
2. Create these buckets:
   - `videos`
   - `thumbnails`
   - `avatars`
3. Set each bucket to public.

The storage policies require files to be uploaded inside a folder named after the logged-in user's auth ID. The JavaScript already does this automatically.

Example path:

```txt
USER_ID/random-file-id.mp4
```

This prevents users from overwriting other users' files.

## 6. Auth setup

Supabase Auth is already used by:

- `signup.html`
- `login.html`
- protected pages using `requireAuth()`
- logout buttons
- session persistence
- auth state listener

Optional setting:

If email confirmation is enabled in Supabase, users may need to confirm their email before logging in. For easiest local testing, disable email confirmation in Authentication > Providers > Email.

## 7. Deploy to Vercel

1. Push the folder to GitHub.
2. Import the repository in Vercel.
3. Framework preset: Other.
4. Build command: leave empty.
5. Output directory: leave empty or use root.
6. Deploy.

Because this is static HTML/CSS/JS, no server build step is needed.

## 8. Test the app

### Signup

1. Open `/signup.html`.
2. Create an account.
3. Confirm email if your Supabase Auth settings require it.
4. Confirm a row appears in `profiles`.

### Login

1. Open `/login.html`.
2. Log in with email and password.
3. You should be redirected to `/index.html`.

### Upload

1. Open `/upload.html`.
2. Select a video file.
3. Select a thumbnail image.
4. Add title, description, and category.
5. Submit.
6. Confirm:
   - file appears in `videos` bucket
   - thumbnail appears in `thumbnails` bucket
   - row appears in `videos` table
   - redirect goes to `/video.html?id=VIDEO_ID`

### Likes and saves

1. Open a video page.
2. Press Like.
3. Confirm row appears in `video_likes`.
4. Press Save.
5. Confirm row appears in `video_saves`.
6. Open Profile > Saved tab.

### Comments

1. Open a video page.
2. Add a comment.
3. Confirm row appears in `video_comments`.

### Profile editing

1. Open `/profile.html`.
2. Click Edit profile.
3. Update avatar, username, full name, or bio.
4. Confirm profile row updates.
5. Confirm avatar uploads to `avatars` bucket.

### Search

1. Open `/search.html`.
2. Search by video title.
3. Search by creator username.
4. Filter by category.

## Security notes

- Frontend apps may use the Supabase anon public key.
- The service_role key bypasses RLS and must never be exposed in frontend JavaScript.
- RLS must stay enabled on all public tables.
- Storage uploads are scoped to the authenticated user's folder.
- Users can only mutate their own profiles, videos, likes, saves, comments, and storage files.

## Monetization path

This foundation can scale into:

- creator subscriptions
- paid uploads
- gated premium videos
- Stripe checkout for Pro accounts
- sponsor slots
- creator analytics
- team channels
- storage limits by plan
