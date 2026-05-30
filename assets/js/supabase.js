// Supabase client configuration
// The anon key is safe to use in frontend JavaScript when Row Level Security is enabled.
// Never paste a service_role key here.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.videoHub = window.videoHub || {};
window.videoHub.supabase = supabase;
window.videoHub.configReady = !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
