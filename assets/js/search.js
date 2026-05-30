(() => {
  const { requireAuth, $, hydrateShell } = window.videoHub.auth;
  const db = window.videoHub.supabase;
  const ui = window.videoHub.ui;
  let searchTimer;

  function cleanLikeTerm(value = "") {
    return value.trim().replace(/[%,]/g, "").slice(0, 80);
  }
  async function runSearch() {
    const raw = $("#searchInput").value;
    const q = cleanLikeTerm(raw);
    const category = $("#searchCategory").value;
    const grid = $("#searchResults");
    const meta = $("#searchMeta");
    grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
    meta.textContent = q ? `Searching for “${q}”...` : "Showing fresh videos.";
    try {
      let videosQuery = db.from("videos").select("*, profiles(username, full_name, avatar_url)").order("created_at", { ascending: false }).limit(36);
      if (category !== "All") videosQuery = videosQuery.eq("category", category);
      if (q) videosQuery = videosQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      const { data: videos, error } = await videosQuery;
      if (error) throw error;

      let usernameMatches = [];
      if (q) {
        const { data: profiles, error: profileError } = await db.from("profiles").select("id").or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(20);
        if (profileError) throw profileError;
        const ids = profiles?.map(p => p.id) || [];
        if (ids.length) {
          let byUsers = db.from("videos").select("*, profiles(username, full_name, avatar_url)").in("user_id", ids).order("created_at", { ascending: false }).limit(24);
          if (category !== "All") byUsers = byUsers.eq("category", category);
          const { data, error: userVideoError } = await byUsers;
          if (userVideoError) throw userVideoError;
          usernameMatches = data || [];
        }
      }
      const merged = [...(videos || []), ...usernameMatches];
      const unique = [...new Map(merged.map(v => [v.id, v])).values()];
      meta.textContent = `${unique.length} result${unique.length === 1 ? "" : "s"}${category !== "All" ? ` in ${category}` : ""}.`;
      grid.innerHTML = unique.length ? unique.map(ui.videoCard).join("") : `<div class="empty">No results. Try a different title, username, or category.</div>`;
    } catch (error) {
      meta.textContent = "Search failed.";
      grid.innerHTML = `<div class="empty">${ui.escapeHtml(error.message)}</div>`;
    }
  }
  function debouncedSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 240);
  }
  async function boot() {
    const session = await requireAuth();
    if (!session) return;
    hydrateShell().catch(console.error);
    $("#searchForm").addEventListener("submit", e => { e.preventDefault(); runSearch(); });
    $("#searchInput").addEventListener("input", debouncedSearch);
    $("#searchCategory").addEventListener("change", runSearch);
    runSearch();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
