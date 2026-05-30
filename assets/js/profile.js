(() => {
  const { requireAuth, toast, $, $$, getCurrentProfile, cleanUsername, hydrateShell } = window.videoHub.auth;
  const db = window.videoHub.supabase;
  const ui = window.videoHub.ui;
  let profile;
  let session;
  let activeTab = "uploads";

  // Exact Supabase Storage bucket name. This must exist in Supabase Storage.
  // Bucket names are case-sensitive: avatars.
  const AVATAR_BUCKET = "avatars";

  function explainStorageError(error, bucket) {
    const message = error?.message || "Storage upload failed.";
    if (/bucket not found/i.test(message)) {
      return new Error(`Bucket not found: create a public Supabase Storage bucket named "${bucket}" exactly.`);
    }
    if (/row-level security|policy|permission|not authorized|unauthorized/i.test(message)) {
      return new Error(`Storage policy blocked the upload to "${bucket}". Run supabase/policies.sql and make sure the file path starts with your user id.`);
    }
    return error;
  }

  function renderProfile() {
    $("#profileAvatar").src = ui.avatarUrl(profile);
    $("#profileName").textContent = profile.full_name || profile.username || "Creator";
    $("#profileUsername").textContent = `@${profile.username || "creator"}`;
    $("#profileBio").textContent = profile.bio || "No bio yet.";
    $("#editFullName").value = profile.full_name || "";
    $("#editUsername").value = profile.username || "";
    $("#editBio").value = profile.bio || "";
  }
  async function loadCounts() {
    const [uploads, saves] = await Promise.all([
      db.from("videos").select("id", { count: "exact", head: true }).eq("user_id", session.user.id),
      db.from("video_saves").select("id", { count: "exact", head: true }).eq("user_id", session.user.id)
    ]);
    $("#uploadCount").textContent = ui.compactNumber(uploads.count || 0);
    $("#savedCount").textContent = ui.compactNumber(saves.count || 0);
  }
  async function loadTab() {
    const grid = $("#profileVideos");
    grid.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
    let data, error;
    if (activeTab === "uploads") {
      ({ data, error } = await db.from("videos").select("*, profiles(username, full_name, avatar_url)").eq("user_id", session.user.id).order("created_at", { ascending: false }));
    } else {
      ({ data, error } = await db.from("video_saves").select("created_at, videos(*, profiles(username, full_name, avatar_url))").eq("user_id", session.user.id).order("created_at", { ascending: false }));
      data = data?.map(row => row.videos).filter(Boolean);
    }
    if (error) { grid.innerHTML = `<div class="empty">${ui.escapeHtml(error.message)}</div>`; return; }
    const empty = activeTab === "uploads" ? "No uploads yet. Publish your first video." : "No saved videos yet. Save videos from the video page.";
    grid.innerHTML = data?.length ? data.map(ui.videoCard).join("") : `<div class="empty">${empty}</div>`;
  }
  function openModal() { const modal = $("#editModal"); modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); }
  function closeModal() { const modal = $("#editModal"); modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
  function bindProfile() {
    $("#editProfileBtn").addEventListener("click", openModal);
    $("#closeModal").addEventListener("click", closeModal);
    $("#editModal").addEventListener("click", e => { if (e.target.id === "editModal") closeModal(); });
    $$(".tab").forEach(tab => tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === activeTab));
      loadTab();
    }));
    $("#editProfileForm").addEventListener("submit", async e => {
      e.preventDefault();
      const submit = e.currentTarget.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Saving...";
      try {
        let avatar_url = profile.avatar_url || "";
        const file = $("#editAvatar").files[0];
        if (file) {
          if (!file.type.startsWith("image/")) throw new Error("Avatar must be an image file.");
          const path = `${session.user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
          const bucketRef = db.storage.from(AVATAR_BUCKET);
          const { error: uploadError } = await bucketRef.upload(path, file, { upsert: false, cacheControl: "3600" });
          if (uploadError) throw explainStorageError(uploadError, AVATAR_BUCKET);
          avatar_url = bucketRef.getPublicUrl(path).data.publicUrl;
        }
        const username = cleanUsername($("#editUsername").value);
        if (username.length < 3) throw new Error("Username must be at least 3 characters.");
        const update = {
          full_name: $("#editFullName").value.trim(),
          username,
          bio: $("#editBio").value.trim(),
          avatar_url,
          updated_at: new Date().toISOString()
        };
        const { data, error } = await db.from("profiles").update(update).eq("id", session.user.id).select("*").single();
        if (error) throw error;
        profile = data;
        renderProfile();
        closeModal();
        hydrateShell().catch(console.error);
        toast("Profile upgraded.");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        submit.disabled = false;
        submit.textContent = "Save changes";
      }
    });
  }
  async function boot() {
    session = await requireAuth();
    if (!session) return;
    profile = await getCurrentProfile();
    renderProfile();
    bindProfile();
    loadCounts();
    loadTab();
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
