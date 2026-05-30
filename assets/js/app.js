const { requireAuth, toast, $ } = window.videoHub.auth;
const db = window.videoHub.supabase;
const categories = ["All", "Business", "Gaming", "Education", "Lifestyle", "Tech", "Sports", "Music"];
let activeCategory = "All";

function fallbackThumb(title = "Video") {
  return `https://placehold.co/960x540/111522/f5f7fb?text=${encodeURIComponent(title)}`;
}
function avatarUrl(profile) {
  return profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile?.username || "VH")}`;
}
function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
function compactNumber(num = 0) {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(num || 0);
}
function videoCard(video) {
  const profile = video.profiles || {};
  return `
    <a class="video-card" href="video.html?id=${video.id}">
      <img class="thumb" src="${video.thumbnail_url || fallbackThumb(video.title)}" alt="${video.title}">
      <div class="video-meta">
        <h3>${video.title}</h3>
        <div class="creator-line"><img src="${avatarUrl(profile)}" alt=""><span>@${profile.username || "creator"}</span></div>
        <div class="meta-line"><span>${compactNumber(video.views)} views</span><span>${formatDate(video.created_at)}</span></div>
      </div>
    </a>`;
}
function renderCategories() {
  const el = $("#categoryChips");
  if (!el) return;
  el.innerHTML = categories.map(cat => `<button class="chip ${cat === activeCategory ? "active" : ""}" data-cat="${cat}">${cat}</button>`).join("");
  el.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.cat;
    renderCategories();
    loadFeed();
  }));
}
async function loadFeed() {
  const grid = $("#videoGrid");
  if (!grid) return;
  grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
  let query = db.from("videos").select("*, profiles(username, full_name, avatar_url)").order("created_at", { ascending: false }).limit(24);
  if (activeCategory !== "All") query = query.eq("category", activeCategory);
  const { data, error } = await query;
  if (error) {
    grid.innerHTML = `<div class="empty">${error.message}</div>`;
    return;
  }
  grid.innerHTML = data?.length ? data.map(videoCard).join("") : `<div class="empty">No videos yet. Upload the first one and own the feed.</div>`;
}
async function loadStats() {
  const countVideos = $("#countVideos");
  const countCreators = $("#countCreators");
  if (!countVideos) return;
  const [videos, profiles] = await Promise.all([
    db.from("videos").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true })
  ]);
  countVideos.textContent = compactNumber(videos.count || 0);
  countCreators.textContent = compactNumber(profiles.count || 0);
}
async function boot() {
  const session = await requireAuth();
  if (!session) return;
  renderCategories();
  loadFeed();
  loadStats();
}
document.addEventListener("DOMContentLoaded", boot);
window.videoHub.ui = { videoCard, fallbackThumb, avatarUrl, formatDate, compactNumber };
