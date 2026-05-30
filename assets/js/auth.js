(() => {
  let sb = window.videoHub?.supabase;
  function refreshClient() { sb = window.videoHub?.supabase; return sb; }

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
    requestAnimationFrame(() => item.classList.add("show"));
    setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 260); }, 3600);
  }

  function requireConfig() {
    refreshClient();
    if (!window.videoHub?.configReady || !sb) {
      toast("Supabase configuration is missing or invalid in assets/js/supabase.js", "error");
      return false;
    }
    return true;
  }

  async function getSession() {
    if (!requireConfig()) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      window.location.href = `login.html?next=${next}`;
      return null;
    }
    return session;
  }

  async function redirectIfAuthed() {
    const session = await getSession();
    if (session) window.location.href = new URLSearchParams(location.search).get("next") || "index.html";
  }

  function cleanUsername(value = "") {
    return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  }

  async function ensureProfile(user, preferred = {}) {
    if (!user) return null;
    const { data: profile, error: selectError } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (selectError) throw selectError;
    if (profile) return profile;

    const fallbackBase = cleanUsername(preferred.username || user.user_metadata?.username || user.email?.split("@")[0] || "creator") || "creator";
    const profilePayload = {
      id: user.id,
      email: user.email,
      username: `${fallbackBase}_${crypto.randomUUID().slice(0, 5)}`,
      full_name: preferred.full_name || user.user_metadata?.full_name || fallbackBase,
      avatar_url: "",
      bio: "Building my video empire."
    };
    const { data, error } = await sb.from("profiles").insert(profilePayload).select("*").single();
    if (error) throw error;
    return data;
  }

  async function getCurrentProfile() {
    const session = await getSession();
    if (!session) return null;
    return ensureProfile(session.user);
  }

  async function hydrateShell() {
    const logoutButtons = $$('[data-action="logout"]');
    logoutButtons.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", signOut);
    });

    const session = await getSession().catch(() => null);
    if (!session) return;
    const profile = await ensureProfile(session.user).catch(() => null);
    if (!profile) return;

    $$('[data-profile-name]').forEach(el => { el.textContent = profile.username || profile.full_name || "Creator"; });
    $$('[data-profile-subtitle]').forEach(el => { el.textContent = profile.full_name || "Channel dashboard"; });
    $$('[data-avatar]').forEach(img => {
      img.src = profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.username || "VH")}`;
      img.alt = `${profile.username || "Creator"} avatar`;
    });
  }

  async function signOut() {
    refreshClient();
    if (!sb) return window.location.href = "login.html";
    await sb.auth.signOut();
    window.location.href = "login.html";
  }

  function setBusy(form, busy, label) {
    const submit = form?.querySelector("button[type='submit']");
    if (!submit) return;
    if (!submit.dataset.idleText) submit.dataset.idleText = submit.textContent;
    submit.disabled = busy;
    submit.textContent = busy ? label : submit.dataset.idleText;
  }

  function bindAuthForms() {
    const loginForm = $("#loginForm");
    const signupForm = $("#signupForm");

    if (loginForm) {
      redirectIfAuthed();
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!requireConfig()) return;
        setBusy(loginForm, true, "Signing in...");
        try {
          const email = $("#email").value.trim();
          const password = $("#password").value;
          const { data, error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          await ensureProfile(data.user);
          toast("Welcome back.");
          window.location.href = new URLSearchParams(location.search).get("next") || "index.html";
        } catch (error) {
          toast(error.message, "error");
          setBusy(loginForm, false);
        }
      });
    }

    if (signupForm) {
      redirectIfAuthed();
      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!requireConfig()) return;
        setBusy(signupForm, true, "Creating account...");
        try {
          const email = $("#email").value.trim();
          const password = $("#password").value;
          const fullName = $("#fullName").value.trim();
          const username = cleanUsername($("#username").value);
          if (username.length < 3) throw new Error("Username must be at least 3 characters.");

          const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { username, full_name: fullName } }
          });
          if (error) throw error;

          if (data.session && data.user) {
            await ensureProfile(data.user, { username, full_name: fullName });
            toast("Account created. Welcome in.");
            window.location.href = "index.html";
          } else {
            toast("Account created. Confirm your email, then log in.");
            window.location.href = "login.html";
          }
        } catch (error) {
          toast(error.message, "error");
          setBusy(signupForm, false);
        }
      });
    }
  }

  sb?.auth?.onAuthStateChange((_event, session) => {
    const needsAuth = document.body.dataset.protected === "true";
    if (!session && needsAuth) window.location.href = "login.html";
    if (session) hydrateShell().catch(console.error);
  });

  document.addEventListener("DOMContentLoaded", () => {
    bindAuthForms();
    hydrateShell().catch(console.error);
  });

  window.videoHub = window.videoHub || {};
  window.videoHub.auth = { requireAuth, redirectIfAuthed, getCurrentProfile, ensureProfile, toast, $, $$, cleanUsername, hydrateShell };
})();
