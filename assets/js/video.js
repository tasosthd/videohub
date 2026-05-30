(() => {
  const { requireAuth, toast, $, getCurrentProfile, hydrateShell } = window.videoHub.auth;
  const db = window.videoHub.supabase;
  const ui = window.videoHub.ui;
  let currentVideo = null;
  let currentUser = null;

  function getId() { return new URLSearchParams(location.search).get("id"); }
  async function incrementViews(id) {
    const { error } = await db.rpc("increment_video_views", { video_id_input: id });
    if (error) console.warn("View increment skipped:", error.message);
  }
  async function countRows(table, videoId) {
    const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("video_id", videoId);
    return count || 0;
  }
  async function loadVideo() {
    const id = getId();
    const target = $("#videoDetail");
    if (!id) { target.innerHTML = `<div class="empty">Missing video ID.</div>`; return; }
    const { data, error } = await db.from("videos").select("*, profiles(username, full_name, avatar_url, bio)").eq("id", id).single();
    if (error) { target.innerHTML = `<div class="empty">${ui.escapeHtml(error.message)}</div>`; return; }
    currentVideo = data;
    incrementViews(data.id);
    const profile = data.profiles || {};
    target.innerHTML = `
      <article class="card card-pad video-detail-card">
        <video class="video-player" controls playsinline preload="metadata" poster="${ui.escapeHtml(data.thumbnail_url || "")}" src="${ui.escapeHtml(data.video_url)}"></video>
        <div class="video-title-row">
          <div>
            <p class="eyebrow">${ui.escapeHtml(data.category || "Video")}</p>
            <h1>${ui.escapeHtml(data.title || "Untitled video")}</h1>
            <div class="creator-line big"><img src="${ui.escapeHtml(ui.avatarUrl(profile))}" alt=""><span>@${ui.escapeHtml(profile.username || "creator")}</span><span>•</span><span id="viewCount">${ui.compactNumber((data.views || 0) + 1)} views</span><span>•</span><span>${ui.formatDate(data.created_at)}</span></div>
          </div>
          <div class="action-row"><button class="btn btn-ghost" id="likeBtn">♡ Like</button><button class="btn btn-ghost" id="saveBtn">＋ Save</button></div>
        </div>
        <p class="description">${ui.escapeHtml(data.description || "No description yet.")}</p>
        <div class="metric-row"><span><strong id="likeCount">0</strong> likes</span><span><strong id="saveCount">0</strong> saves</span></div>
      </article>`;
    await syncActions();
    loadComments();
    loadRelated(data.category, data.id);
  }
  async function syncActions() {
    const [like, save, likeCount, saveCount] = await Promise.all([
      db.from("video_likes").select("id").eq("video_id", currentVideo.id).eq("user_id", currentUser.id).maybeSingle(),
      db.from("video_saves").select("id").eq("video_id", currentVideo.id).eq("user_id", currentUser.id).maybeSingle(),
      countRows("video_likes", currentVideo.id),
      countRows("video_saves", currentVideo.id)
    ]);
    const likeBtn = $("#likeBtn");
    const saveBtn = $("#saveBtn");
    $("#likeCount").textContent = ui.compactNumber(likeCount);
    $("#saveCount").textContent = ui.compactNumber(saveCount);
    likeBtn.textContent = like.data ? "♥ Liked" : "♡ Like";
    saveBtn.textContent = save.data ? "✓ Saved" : "＋ Save";
    likeBtn.onclick = () => toggleRow("video_likes", Boolean(like.data));
    saveBtn.onclick = () => toggleRow("video_saves", Boolean(save.data));
  }
  async function toggleRow(table, exists) {
    try {
      if (exists) await db.from(table).delete().eq("video_id", currentVideo.id).eq("user_id", currentUser.id);
      else await db.from(table).insert({ video_id: currentVideo.id, user_id: currentUser.id });
      await syncActions();
    } catch (e) { toast(e.message, "error"); }
  }
  async function loadComments() {
    const list = $("#commentsList");
    const { data, error, count } = await db.from("video_comments").select("*, profiles(username, avatar_url)", { count: "exact" }).eq("video_id", currentVideo.id).order("created_at", { ascending: false });
    if (error) { list.innerHTML = `<div class="empty">${ui.escapeHtml(error.message)}</div>`; return; }
    $("#commentCount").textContent = `${count || 0} total`;
    list.innerHTML = data?.length ? data.map(c => `
      <div class="comment"><img class="avatar" src="${ui.escapeHtml(ui.avatarUrl(c.profiles || {}))}" alt=""><div><strong>@${ui.escapeHtml(c.profiles?.username || "creator")}</strong><p>${ui.escapeHtml(c.comment)}</p><small class="subtle">${ui.formatDate(c.created_at)}</small></div></div>`).join("") : `<div class="empty">No comments yet. Start the conversation.</div>`;
  }
  function bindCommentForm() {
    const form = $("#commentForm");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!currentVideo) return;
      const comment = $("#commentText").value.trim();
      if (!comment) return;
      const submit = form.querySelector("button");
      submit.disabled = true;
      try {
        const { error } = await db.from("video_comments").insert({ video_id: currentVideo.id, user_id: currentUser.id, comment });
        if (error) throw error;
        form.reset();
        toast("Comment posted.");
        loadComments();
      } catch (error) { toast(error.message, "error"); }
      finally { submit.disabled = false; }
    });
  }
  async function loadRelated(category, id) {
    const el = $("#relatedVideos");
    let query = db.from("videos").select("*, profiles(username, full_name, avatar_url)").neq("id", id).limit(6).order("created_at", { ascending: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) { el.innerHTML = `<div class="empty">${ui.escapeHtml(error.message)}</div>`; return; }
    el.innerHTML = data?.length ? data.map(ui.videoCard).join("") : `<div class="empty">No related videos yet.</div>`;
  }
  async function boot() {
    const session = await requireAuth();
    if (!session) return;
    currentUser = session.user;
    await getCurrentProfile();
    hydrateShell().catch(console.error);
    bindCommentForm();
    loadVideo();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
