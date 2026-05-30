# VideoHub Premium Supabase Video App

Static HTML/CSS/JavaScript video platform using Supabase Auth, Database, and Storage.

This revision keeps the existing Supabase frontend configuration exactly where it belongs in `assets/js/supabase.js`. The anon public key is safe in frontend JavaScript only when Row Level Security is enabled. Never put a service role key in this project.

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

## What changed in this revision

- Wrapped JavaScript files in isolated scopes to prevent browser-level `const`/function name collisions.
- Improved Auth flow for email confirmation and persistent sessions.
- Added safer profile creation using both client fallback logic and a Supabase Auth trigger in SQL.
- Added a safe `increment_video_views` RPC so view counts work without broad update permissions.
- Improved upload validation, progress messaging, and upload-limit placeholder UI for future Pro plans.
- Improved profile editing, avatar upload, saved videos, profile stats, and modal behavior.
- Improved video page likes, saves, comments, counts, related videos, and XSS-safe rendering.
- Improved search by title, description, username, full name, and category.
- Polished responsive UI across desktop, tablet, and phone screens.
- Kept payment keys out of the project. Stripe or another provider can be added later.

## Supabase configuration

Open:

```txt
assets/js/supabase.js
```

This file should keep your existing project URL and anon public key exactly as they are. Do not replace them with placeholders. Do not add a service role key to frontend code.

## Database setup

In Supabase SQL Editor:

1. Run `supabase/schema.sql`.
2. Run `supabase/policies.sql`.

The schema creates:

- `profiles`
- `videos`
- `video_likes`
- `video_saves`
- `video_comments`
- profile update trigger
- auth user profile trigger
- safe RPC for video view increments

## Storage setup

Create these public buckets:

- `videos`
- `thumbnails`
- `avatars`

The JavaScript uploads files into this structure:

```txt
USER_AUTH_ID/random-file-id.ext
```

The storage policies only allow authenticated users to upload/update/delete files inside their own user-id folder. Public users can view files from the public buckets.

## Auth setup

Supabase Auth is used by:

- `signup.html`
- `login.html`
- protected pages using `requireAuth()`
- logout buttons
- persistent sessions
- auth state listener

If email confirmation is enabled, users may need to confirm their email before logging in. The SQL trigger still creates the matching profile row when the Auth user is created.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Framework preset: Other.
4. Build command: leave empty.
5. Output directory: leave empty or use root.
6. Deploy.

This is a static app, so no server build step is required.

## Test checklist

### Signup

1. Open `/signup.html`.
2. Create an account.
3. Confirm email if Supabase requires it.
4. Check that a row exists in `profiles`.

### Login

1. Open `/login.html`.
2. Log in with email and password.
3. Confirm redirect to `/index.html`.
4. Refresh the page and confirm the session stays active.

### Upload

1. Open `/upload.html`.
2. Select a video file and thumbnail image.
3. Add title, description, and category.
4. Publish.
5. Confirm files appear in the correct Supabase Storage buckets.
6. Confirm a row appears in `videos`.
7. Confirm redirect to `/video.html?id=VIDEO_ID`.

### Video page

1. Open any video page.
2. Confirm the player loads.
3. Confirm views increment.
4. Like and unlike the video.
5. Save and unsave the video.
6. Post a comment.
7. Confirm related videos load.

### Profile

1. Open `/profile.html`.
2. Confirm avatar, username, full name, bio, upload count, and saved count load.
3. Edit full name, username, bio, and avatar.
4. Confirm changes save in `profiles`.
5. Confirm avatar uploads into the `avatars` bucket.
6. Test Uploads and Saved tabs.

### Search

1. Open `/search.html`.
2. Search by video title.
3. Search by creator username.
4. Search by full name.
5. Filter by category.

### Logout

1. Click Logout from the sidebar.
2. Confirm redirect to `/login.html`.
3. Try opening a protected page and confirm it redirects to login.

## Monetization path

This project is structured for future monetization:

- upload limits by plan
- creator subscriptions
- paid video gates
- boosted uploads
- sponsor placements
- creator analytics
- Stripe Checkout or Customer Portal integration

No payment secret keys are included. Add payment logic later through a secure backend/serverless function, never directly in frontend JavaScript.


## Hotfix: Supabase config toast

If you see `Supabase configuration is missing or invalid in assets/js/supabase.js`, the app is usually loading an old cached `supabase.js` file or the Supabase CDN did not load before the config file. This build adds cache-busting query strings to the local scripts and performs a stricter runtime check without replacing your Supabase URL or anon key.

Your `assets/js/supabase.js` should keep the real project URL and anon key. Never place a `service_role` key in this frontend file.
