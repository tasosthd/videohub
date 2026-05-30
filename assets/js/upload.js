(() => {
  const { requireAuth, toast, $, hydrateShell } = window.videoHub.auth;
  const db = window.videoHub.supabase;
  const FREE_UPLOAD_LIMIT = 10;
  const MAX_VIDEO_MB = 250;

  // Exact Supabase Storage bucket names. These must exist in Supabase Storage.
  // Bucket names are case-sensitive: videos, thumbnails, avatars.
  const STORAGE_BUCKETS = Object.freeze({
    videos: "videos",
    thumbnails: "thumbnails"
  });

  function ext(name = "") { return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"; }
  function setProgress(value) {
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    const bar = $("#uploadProgress span");
    const label = $("#uploadProgressText");
    if (bar) bar.style.width = `${safe}%`;
    if (label) label.textContent = `${safe}%`;
  }
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

  async function uploadPublicFile(bucket, userId, file) {
    const path = `${userId}/${crypto.randomUUID()}.${ext(file.name)}`;

    // Correct Supabase Storage pattern:
    // .from("bucket_name") selects the bucket.
    // .upload("user-id/file.ext", file) uploads inside that bucket.
    const bucketRef = db.storage.from(bucket);
    const { error } = await bucketRef.upload(path, file, { upsert: false, cacheControl: "3600" });
    if (error) throw explainStorageError(error, bucket);

    return bucketRef.getPublicUrl(path).data.publicUrl;
  }
  async function updateLimitBox(userId) {
    const box = $("#uploadLimitBox");
    const publishBtn = $("#publishBtn");
    if (!box) return;
    const { count, error } = await db.from("videos").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (error) {
      box.textContent = "Upload allowance could not be checked. You can still try publishing.";
      box.className = "limit-box warning";
      return;
    }
    const used = count || 0;
    box.innerHTML = `<strong>${used}/${FREE_UPLOAD_LIMIT}</strong> free uploads used. Pro billing can be connected here later for higher limits.`;
    box.className = used >= FREE_UPLOAD_LIMIT ? "limit-box warning" : "limit-box";
    if (publishBtn && used >= FREE_UPLOAD_LIMIT) publishBtn.textContent = "Publish video (Pro gate ready)";
  }
  async function bootUpload() {
    const session = await requireAuth();
    if (!session) return;
    hydrateShell().catch(console.error);
    await updateLimitBox(session.user.id);
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
      if (!videoFile.type.startsWith("video/")) return toast("Select a valid video file.", "error");
      if (!thumbFile.type.startsWith("image/")) return toast("Select a valid thumbnail image.", "error");
      if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) return toast(`Keep test uploads under ${MAX_VIDEO_MB}MB for now.`, "error");

      const submit = form.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Uploading video...";
      try {
        setProgress(8);
        const videoUrl = await uploadPublicFile(STORAGE_BUCKETS.videos, session.user.id, videoFile);
        setProgress(56);
        submit.textContent = "Uploading thumbnail...";
        const thumbnailUrl = await uploadPublicFile(STORAGE_BUCKETS.thumbnails, session.user.id, thumbFile);
        setProgress(82);
        submit.textContent = "Saving metadata...";
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
        window.location.href = `video.html?id=${encodeURIComponent(data.id)}`;
      } catch (error) {
        toast(error.message, "error");
        submit.disabled = false;
        submit.textContent = "Publish video";
      }
    });
  }
  document.addEventListener("DOMContentLoaded", bootUpload);
})();
