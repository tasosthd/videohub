const { requireAuth, toast, $, getCurrentProfile } = window.videoHub.auth;
const db = window.videoHub.supabase;
const ui = window.videoHub.ui || {};
let profile;
let session;
let activeTab = "uploads";

function renderProfile() {
  $("#profileAvatar").src = ui.avatarUrl(profile);
  $("#profileName").textContent = profile.full_name || profile.username || "Creator";
  $("#profileUsername").textContent = `@${profile.username || "creator"}`;
  $("#profileBio").textContent = profile.bio || "No bio yet.";
  $("#editFullName").value = profile.full_name || "";
  $("#editUsername").value = profile.username || "";
  $("#editBio").value = profile.bio || "";
}
async function loadTab() {
  const grid = $("#profileVideos");
  grid.innerHTML = `<div class="skeleton"></div>`;
  let data, error;
  if (activeTab === "uploads") {
    ({ data, error } = await db.from("videos").select("*, profiles(username, avatar_url)").eq("user_id", session.user.id).order("created_at", { ascending: false }));
  } else {
    ({ data, error } = await db.from("video_saves").select("videos(*, profiles(username, avatar_url))").eq("user_id", session.user.id).order("created_at", { ascending: false }));
    data = data?.map(row => row.videos).filter(Boolean);
  }
  if (error) { grid.innerHTML = `<div class="empty">${error.message}</div>`; return; }
  grid.innerHTML = data?.length ? data.map(ui.videoCard).join("") : `<div class="empty">Nothing here yet.</div>`;
}
function bindProfile() {
  $("#editProfileBtn").onclick = () => $("#editModal").classList.add("open");
  $("#closeModal").onclick = () => $("#editModal").classList.remove("open");
  document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === activeTab));
    loadTab();
  });
  $("#editProfileForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      let avatar_url = profile.avatar_url;
      const file = $("#editAvatar").files[0];
      if (file) {
        const path = `${session.user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
        const { error: uploadError } = await db.storage.from("avatars").upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        avatar_url = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      const update = {
        full_name: $("#editFullName").value.trim(),
        username: $("#editUsername").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
        bio: $("#editBio").value.trim(),
        avatar_url,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await db.from("profiles").update(update).eq("id", session.user.id).select("*").single();
      if (error) throw error;
      profile = data;
      renderProfile();
      $("#editModal").classList.remove("open");
      toast("Profile upgraded.");
    } catch (error) { toast(error.message, "error"); }
  });
}
async function boot() {
  session = await requireAuth();
  if (!session) return;
  profile = await getCurrentProfile();
  renderProfile();
  bindProfile();
  loadTab();
}
document.addEventListener("DOMContentLoaded", boot);
