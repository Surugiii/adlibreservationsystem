import { supabase } from "./supabasecon.js";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const closeBtn = document.getElementById("closeBtn");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");

const maxAttempts = 3;
let attempts = parseInt(localStorage.getItem("loginAttempts")) || 0;
let lockUntil = parseInt(localStorage.getItem("lockUntil")) || null;

window.addEventListener("pageshow", () => {
  emailEl.value = "";
  passwordEl.value = "";
  loginMessage.style.display = "none";

  if (lockUntil && Date.now() < lockUntil) {
    startCountdown();
  } else {
    localStorage.removeItem("lockUntil");
  }
});

closeBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (lockUntil && Date.now() < lockUntil) {
    const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
    loginMessage.textContent = `⏳ Locked. Try again in ${secondsLeft}s.`;
    loginMessage.className = "message error";
    loginMessage.style.display = "block";
    return;
  }

  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    attempts++;
    localStorage.setItem("loginAttempts", attempts);

    if (attempts >= maxAttempts) {
      lockUntil = Date.now() + 30 * 1000; // 30 seconds lock
      localStorage.setItem("lockUntil", lockUntil);
      attempts = 0;
      localStorage.setItem("loginAttempts", attempts);
      startCountdown();
    } else {
      loginMessage.textContent = `❌ Invalid login. ${maxAttempts - attempts} tries left.`;
      loginMessage.className = "message error";
      loginMessage.style.display = "block";
    }
    return;
  }

  // Reset attempts on success
  attempts = 0;
  lockUntil = null;
  localStorage.removeItem("loginAttempts");
  localStorage.removeItem("lockUntil");

  loginMessage.textContent = "✅ Login successful!";
  loginMessage.className = "message success";
  loginMessage.style.display = "block";

  // Fetch user role from admins table
  const userId = data.user.id;
  const { data: profile, error: profileError } = await supabase
    .from("admins")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    alert("Failed to retrieve user role.");
    return;
  }

  // Redirect based on role
  setTimeout(() => {
    if (profile.role === "HeadAdmin") {
      window.location.href = "admin.html";
    } else if (profile.role === "Admin") {
      window.location.href = "adminsched.html";
    } else {
      alert("Unauthorized role.");
    }
  }, 800);
});

function startCountdown() {
  function updateMessage() {
    if (!lockUntil) return;
    const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
    if (secondsLeft > 0) {
      loginMessage.textContent = `⏳ Locked. Try again in ${secondsLeft}s.`;
      loginMessage.className = "message error";
      loginMessage.style.display = "block";
      setTimeout(updateMessage, 1000);
    } else {
      lockUntil = null;
      localStorage.removeItem("lockUntil");
      loginMessage.textContent = "🔓 You can try logging in again.";
      loginMessage.className = "message success";
      loginMessage.style.display = "block";
    }
  }
  updateMessage();
}