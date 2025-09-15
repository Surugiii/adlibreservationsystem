import { supabase } from "./supabasecon.js";

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const closeBtn = document.getElementById("closeBtn");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

const maxAttempts = 3;

// Load state from localStorage
let attempts = parseInt(localStorage.getItem("loginAttempts")) || 0;
let lockUntil = parseInt(localStorage.getItem("lockUntil")) || null;

// Always clear inputs when page loads or restored from cache
window.addEventListener("pageshow", () => {
  usernameEl.value = "";
  passwordEl.value = "";
  loginMessage.style.display = "none";

  // If still locked, resume countdown
  if (lockUntil && Date.now() < lockUntil) {
    startCountdown();
  } else {
    localStorage.removeItem("lockUntil");
  }
});

// Close button → go back to home
closeBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});

// Handle login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Check if locked
  if (lockUntil && Date.now() < lockUntil) {
    const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
    loginMessage.textContent = `⏳ Locked. Try again in ${secondsLeft}s.`;
    loginMessage.className = "message error";
    loginMessage.style.display = "block";
    return;
  }

  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  const { data, error } = await supabase
    .from("admins")
    .select("role")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !data) {
    attempts++;
    localStorage.setItem("loginAttempts", attempts);

    if (attempts >= maxAttempts) {
      lockUntil = Date.now() + 30 * 1000; // 30s lock
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

  // Success → reset everything
  attempts = 0;
  lockUntil = null;
  localStorage.removeItem("loginAttempts");
  localStorage.removeItem("lockUntil");

  loginForm.reset();
  loginMessage.textContent = "✅ Login successful!";
  loginMessage.className = "message success";
  loginMessage.style.display = "block";

  // Redirect
  setTimeout(() => {
    if (data.role === "HeadAdmin") {
      window.location.href = "admin.html";
    } else if (data.role === "Admin") {
      window.location.href = "adminsched.html";
    }
  }, 800);
});

// Countdown UI when locked
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