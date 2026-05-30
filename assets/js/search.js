const { requireAuth, $, toast } = window.videoHub.auth;
const db = window.videoHub.supabase;
const ui = window.videoHub.ui || {};

async function runSearch() {
  const q = $("#searchInput").value.trim();
  const category = $("#searchCategory").value;
  const grid = $("#searchResults");
  grid.innerHTML = `<div class="skeleton"></div>`;
  try {
    let videosQuery = db.from("videos").select("*, profiles(username, full_name, avatar_url)").order("created_at", { ascending: false }).limit(30);
    if (category !== "All") videosQuery = videosQuery.eq("category", category);
    if (q) videosQuery = videosQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    const { data: videos, error } = await videosQuery;
    if (error) throw error;
    let usernameMatches = [];
    if (q) {
      const { data } = await db.from("profiles").select("id").or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20);
      const ids = data?.map(p => p.id) || [];
      if (ids.length) {
        const byUsers = await db.from("videos").select("*, profiles(username, full_name, avatar_url)").in("user_id", ids).limit(20);
        usernameMatches = byUsers.data || [];
      }
    }
    const merged = [...(videos || []), ...usernameMatches];
    const unique = [...new Map(merged.map(v => [v.id, v])).values()];
    grid.innerHTML = unique.length ? unique.map(ui.videoCard).join("") : `<div class="empty">No results. Try a different title, username, or category.</div>`;
  } catch (error) {
    grid.innerHTML = `<div class="empty">${error.message}</div>`;
  }
}
async function boot() {
  const session = await requireAuth();
  if (!session) return;
  $("#searchForm").addEventListener("submit", e => { e.preventDefault(); runSearch(); });
  $("#searchCategory").addEventListener("change", runSearch);
  runSearch();
}
document.addEventListener("DOMContentLoaded", boot);
