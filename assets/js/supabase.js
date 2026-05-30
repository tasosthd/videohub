// Supabase client configuration
// The anon key is safe to use in frontend JavaScript when Row Level Security is enabled.
// Never paste a service_role key here.
const SUPABASE_URL = "https://nttveudhsfbwvxuemhdk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dHZldWRoc2Zid3Z4dWVtaGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjUxMDYsImV4cCI6MjA5NTc0MTEwNn0.2S5twFvvngNkgfAzP692yAUvQMlEo3UvJQuwcs1OMDk";

window.videoHub = window.videoHub || {};

(function initSupabaseClient() {
  const url = String(SUPABASE_URL || "").trim();
  const anonKey = String(SUPABASE_ANON_KEY || "").trim();

  const hasPlaceholder = /PASTE_|YOUR_|_HERE|SUPABASE_URL|SUPABASE_ANON_KEY/i.test(url + anonKey);
  const urlLooksValid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
  const keyLooksValid = anonKey.split(".").length === 3 && anonKey.length > 80;
  const sdkReady = Boolean(window.supabase && typeof window.supabase.createClient === "function");

  window.videoHub.configReady = Boolean(!hasPlaceholder && urlLooksValid && keyLooksValid && sdkReady);
  window.videoHub.configStatus = { hasPlaceholder, urlLooksValid, keyLooksValid, sdkReady };

  if (!sdkReady) {
    console.error("Supabase SDK did not load. Check the CDN script before assets/js/supabase.js.");
    return;
  }

  if (!window.videoHub.configReady) {
    console.error("Supabase config check failed:", window.videoHub.configStatus);
    return;
  }

  window.videoHub.supabase = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
})();
