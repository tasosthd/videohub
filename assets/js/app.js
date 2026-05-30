(() => {
  const auth = window.videoHub.auth;
  const db = window.videoHub.supabase;
  const categories = ["All", "Business", "Gaming", "Education", "Lifestyle", "Tech", "Sports", "Music"];
  let activeCategory = "All";

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
  function fallbackThumb(title = "Video") {
    return `https://placehold.co/960x540/111522/f5f7fb?text=${encodeURIComponent(title || "Video")}`;
  }
  function avatarUrl(profile = {}) {
    return profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.username || profile.full_name || "VH")}`;
  }
  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  }
  function compactNumber(num = 0) {
    return new Intl.NumberFormat(undefined, { notation: "compact" }).format(num || 0);
  }
  function videoCard(video = {}) {
    const profile = video.profiles || {};
    const title = escapeHtml(video.title || "Untitled video");
    return `
      <a class="video-card" href="video.html?id=${encodeURIComponent(video.id)}">
        <img class="thumb" src="${escapeHtml(video.thumbnail_url || fallbackThumb(video.title))}" alt="${title}" loading="lazy">
        <div class="video-meta">
          <h3>${title}</h3>
          <div class="creator-line"><img src="${escapeHtml(avatarUrl(profile))}" alt="" loading="lazy"><span>@${escapeHtml(profile.username || "creator")}</span></div>
          <div class="meta-line"><span>${compactNumber(video.views)} views</span><span>${formatDate(video.created_at)}</span></div>
        </div>
      </a>`;
  }
  function renderCategories() {
    const el = auth.$("#categoryChips");
    if (!el) return;
    el.innerHTML = categories.map(cat => `<button class="chip ${cat === activeCategory ? "active" : ""}" data-cat="${cat}" type="button">${cat}</button>`).join("");
    el.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      loadFeed();
    }));
  }
  async function loadFeed() {
    const grid = auth.$("#videoGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
    let query = db.from("videos").select("*, profiles(username, full_name, avatar_url)").order("created_at", { ascending: false }).limit(24);
    if (activeCategory !== "All") query = query.eq("category", activeCategory);
    const { data, error } = await query;
    if (error) {
      grid.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
      return;
    }
    grid.innerHTML = data?.length ? data.map(videoCard).join("") : `<div class="empty">No videos yet. Upload the first one and own the feed.</div>`;
  }
  async function loadStats() {
    const countVideos = auth.$("#countVideos");
    const countCreators = auth.$("#countCreators");
    if (!countVideos || !countCreators) return;
    const [videos, profiles] = await Promise.all([
      db.from("videos").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true })
    ]);
    countVideos.textContent = compactNumber(videos.count || 0);
    countCreators.textContent = compactNumber(profiles.count || 0);
  }
  async function boot() {
    if (!auth.$("#videoGrid") && !auth.$("#categoryChips") && !auth.$("#countVideos")) return;
    const session = await auth.requireAuth();
    if (!session) return;
    renderCategories();
    loadFeed();
    loadStats();
  }

  window.videoHub.ui = { videoCard, fallbackThumb, avatarUrl, formatDate, compactNumber, escapeHtml };
  document.addEventListener("DOMContentLoaded", boot);
})();
