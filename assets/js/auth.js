const sb = window.videoHub.supabase;

function $(selector, parent = document) { return parent.querySelector(selector); }
function $$(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

function toast(message, type = "success") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  wrap.appendChild(item);
  setTimeout(() => item.classList.add("show"), 20);
  setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 260); }, 3400);
}

function requireConfig() {
  if (!window.videoHub.configReady) {
    toast("Add your Supabase URL and anon key in assets/js/supabase.js", "error");
    return false;
  }
  return true;
}

async function getSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function requireAuth() {
  if (!requireConfig()) return null;
  const session = await getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function redirectIfAuthed() {
  if (!requireConfig()) return;
  const session = await getSession();
  if (session) window.location.href = "index.html";
}

async function ensureProfile(user) {
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profile) return profile;
  const fallbackName = user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "creator";
  const username = `${fallbackName}_${crypto.randomUUID().slice(0, 5)}`.toLowerCase();
  const { data, error } = await sb.from("profiles").insert({
    id: user.id,
    email: user.email,
    username,
    full_name: fallbackName,
    avatar_url: "",
    bio: "Building my video empire."
  }).select("*").single();
  if (error) throw error;
  return data;
}

async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;
  return ensureProfile(session.user);
}

async function hydrateShell() {
  const session = await getSession();
  const profileButton = $("[data-profile-button]");
  const profileName = $("[data-profile-name]");
  const avatar = $("[data-avatar]");
  const logoutButtons = $$('[data-action="logout"]');
  logoutButtons.forEach(btn => btn.addEventListener("click", signOut));

  if (session) {
    const profile = await ensureProfile(session.user);
    if (profileName) profileName.textContent = profile.username || profile.full_name || "Creator";
    if (avatar) {
      avatar.src = profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.username || "VH")}`;
      avatar.alt = `${profile.username || "Creator"} avatar`;
    }
    if (profileButton) profileButton.href = "profile.html";
  }
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = "login.html";
}

function bindAuthForms() {
  const loginForm = $("#loginForm");
  const signupForm = $("#signupForm");

  if (loginForm) {
    redirectIfAuthed();
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireConfig()) return;
      const submit = loginForm.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Signing in...";
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      submit.disabled = false;
      submit.textContent = "Log in";
      if (error) return toast(error.message, "error");
      toast("Welcome back.");
      window.location.href = "index.html";
    });
  }

  if (signupForm) {
    redirectIfAuthed();
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireConfig()) return;
      const submit = signupForm.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Creating account...";
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const fullName = $("#fullName").value.trim();
      const username = $("#username").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) {
        submit.disabled = false;
        submit.textContent = "Create account";
        return toast(error.message, "error");
      }
      if (data.user) {
        const { error: profileError } = await sb.from("profiles").upsert({
          id: data.user.id,
          email,
          username,
          full_name: fullName,
          avatar_url: "",
          bio: "New creator on VideoHub."
        });
        if (profileError) {
          submit.disabled = false;
          submit.textContent = "Create account";
          return toast(profileError.message, "error");
        }
      }
      toast("Account created. Check email confirmation if enabled.");
      window.location.href = "index.html";
    });
  }
}

sb.auth.onAuthStateChange((_event, session) => {
  const needsAuth = document.body.dataset.protected === "true";
  if (!session && needsAuth) window.location.href = "login.html";
});

document.addEventListener("DOMContentLoaded", () => {
  bindAuthForms();
  hydrateShell().catch(console.error);
});

window.videoHub.auth = { requireAuth, redirectIfAuthed, getCurrentProfile, ensureProfile, toast, $, $$ };
