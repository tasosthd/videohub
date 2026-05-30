// Supabase client configuration
// The anon key is safe to use in frontend JavaScript when Row Level Security is enabled.
// Never paste a service_role key here.
const SUPABASE_URL = "https://nttveudhsfbwvxuemhdk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dHZldWRoc2Zid3Z4dWVtaGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjUxMDYsImV4cCI6MjA5NTc0MTEwNn0.2S5twFvvngNkgfAzP692yAUvQMlEo3UvJQuwcs1OMDk";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.videoHub = window.videoHub || {};
window.videoHub.supabase = supabase;
window.videoHub.configReady = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
