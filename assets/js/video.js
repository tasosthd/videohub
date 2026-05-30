const { requireAuth, toast, $, getCurrentProfile } = window.videoHub.auth;
const db = window.videoHub.supabase;
const ui = window.videoHub.ui || {};
let currentVideo = null;
let currentUser = null;

function getId() { return new URLSearchParams(location.search).get("id"); }
async function incrementViews(id, existing) {
  await db.from("videos").update({ views: (existing || 0) + 1 }).eq("id", id);
}
async function loadVideo() {
  const id = getId();
  const target = $("#videoDetail");
  if (!id) { target.innerHTML = `<div class="empty">Missing video ID.</div>`; return; }
  const { data, error } = await db.from("videos").select("*, profiles(username, full_name, avatar_url, bio)").eq("id", id).single();
  if (error) { target.innerHTML = `<div class="empty">${error.message}</div>`; return; }
  currentVideo = data;
  await incrementViews(data.id, data.views);
  const profile = data.profiles || {};
  target.innerHTML = `
    <div class="card card-pad grid">
      <video class="video-player" controls playsinline poster="${data.thumbnail_url || ""}" src="${data.video_url}"></video>
      <div>
        <h1 style="margin:0 0 8px;letter-spacing:-.045em">${data.title}</h1>
        <div class="creator-line"><img src="${ui.avatarUrl?.(profile) || ""}" alt=""><span>@${profile.username || "creator"}</span><span>•</span><span>${ui.compactNumber?.((data.views || 0) + 1) || data.views} views</span><span>•</span><span>${ui.formatDate?.(data.created_at) || ""}</span></div>
      </div>
      <div class="action-row">
        <button class="btn btn-ghost" id="likeBtn">♡ Like</button>
        <button class="btn btn-ghost" id="saveBtn">＋ Save</button>
      </div>
      <p class="subtle" style="line-height:1.7;margin:0">${data.description || "No description yet."}</p>
    </div>`;
  await syncActions();
  loadComments();
  loadRelated(data.category, data.id);
}
async function syncActions() {
  const [like, save] = await Promise.all([
    db.from("video_likes").select("id").eq("video_id", currentVideo.id).eq("user_id", currentUser.id).maybeSingle(),
    db.from("video_saves").select("id").eq("video_id", currentVideo.id).eq("user_id", currentUser.id).maybeSingle()
  ]);
  const likeBtn = $("#likeBtn");
  const saveBtn = $("#saveBtn");
  likeBtn.textContent = like.data ? "♥ Liked" : "♡ Like";
  saveBtn.textContent = save.data ? "✓ Saved" : "＋ Save";
  likeBtn.onclick = () => toggleRow("video_likes", like.data, likeBtn, "♥ Liked", "♡ Like");
  saveBtn.onclick = () => toggleRow("video_saves", save.data, saveBtn, "✓ Saved", "＋ Save");
}
async function toggleRow(table, existing, btn, activeText, idleText) {
  try {
    if (existing) await db.from(table).delete().eq("id", existing.id);
    else await db.from(table).insert({ video_id: currentVideo.id, user_id: currentUser.id });
    btn.textContent = existing ? idleText : activeText;
    await syncActions();
  } catch (e) { toast(e.message, "error"); }
}
async function loadComments() {
  const list = $("#commentsList");
  const { data, error } = await db.from("video_comments").select("*, profiles(username, avatar_url)").eq("video_id", currentVideo.id).order("created_at", { ascending: false });
  if (error) { list.innerHTML = `<div class="empty">${error.message}</div>`; return; }
  list.innerHTML = data?.length ? data.map(c => `
    <div class="comment"><img class="avatar" src="${ui.avatarUrl?.(c.profiles) || ""}" alt=""><div><strong>@${c.profiles?.username || "creator"}</strong><p>${c.comment}</p><small class="subtle">${ui.formatDate?.(c.created_at) || ""}</small></div></div>`).join("") : `<div class="empty">No comments yet. Start the conversation.</div>`;
}
function bindCommentForm() {
  const form = $("#commentForm");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const comment = $("#commentText").value.trim();
    if (!comment) return;
    const { error } = await db.from("video_comments").insert({ video_id: currentVideo.id, user_id: currentUser.id, comment });
    if (error) return toast(error.message, "error");
    form.reset();
    loadComments();
  });
}
async function loadRelated(category, id) {
  const el = $("#relatedVideos");
  let query = db.from("videos").select("*, profiles(username, avatar_url)").neq("id", id).limit(6).order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query;
  el.innerHTML = data?.length ? data.map(ui.videoCard).join("") : `<div class="empty">No related videos yet.</div>`;
}
async function boot() {
  const session = await requireAuth();
  if (!session) return;
  currentUser = session.user;
  await getCurrentProfile();
  bindCommentForm();
  loadVideo();
}
document.addEventListener("DOMContentLoaded", boot);
