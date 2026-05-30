const { requireAuth, toast, $ } = window.videoHub.auth;
const db = window.videoHub.supabase;

function ext(name) { return name.split(".").pop()?.toLowerCase() || "bin"; }
function setProgress(value) {
  const bar = $("#uploadProgress span");
  const label = $("#uploadProgressText");
  if (bar) bar.style.width = `${value}%`;
  if (label) label.textContent = `${value}%`;
}
async function uploadPublicFile(bucket, userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${ext(file.name)}`;
  const { error } = await db.storage.from(bucket).upload(path, file, { upsert: false, cacheControl: "3600" });
  if (error) throw error;
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
async function bootUpload() {
  const session = await requireAuth();
  if (!session) return;
  const form = $("#uploadForm");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const videoFile = $("#videoFile").files[0];
    const thumbFile = $("#thumbnailFile").files[0];
    const title = $("#title").value.trim();
    const description = $("#description").value.trim();
    const category = $("#category").value;
    if (!videoFile || !thumbFile || !title) return toast("Video, thumbnail, and title are required.", "error");
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    submit.textContent = "Uploading...";
    try {
      setProgress(12);
      const videoUrl = await uploadPublicFile("videos", session.user.id, videoFile);
      setProgress(58);
      const thumbnailUrl = await uploadPublicFile("thumbnails", session.user.id, thumbFile);
      setProgress(82);
      const { data, error } = await db.from("videos").insert({
        user_id: session.user.id,
        title,
        description,
        category,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl
      }).select("id").single();
      if (error) throw error;
      setProgress(100);
      toast("Video uploaded. Let’s go.");
      window.location.href = `video.html?id=${data.id}`;
    } catch (error) {
      toast(error.message, "error");
      submit.disabled = false;
      submit.textContent = "Publish video";
    }
  });
}
document.addEventListener("DOMContentLoaded", bootUpload);
