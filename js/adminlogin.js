import { supabase } from './supabasecon.js';

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const alreadyLoggedInDiv = document.getElementById('already-logged-in');
const logoutBtn = document.getElementById('logout-btn');
const backBtn = document.getElementById('back-btn');

const loginErrorP = document.getElementById('login-error');
const signupErrorP = document.getElementById('signup-error');

let isLogin = true;

async function checkAuthStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    document.getElementById('forgot-password').style.display = 'none';
    document.querySelector('p:has(#toggle-link)').style.display = 'none';
    alreadyLoggedInDiv.style.display = 'block';
    formTitle.textContent = 'Already Logged In';
  } else {
    alreadyLoggedInDiv.style.display = 'none';
  }
}

logoutBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    window.location.href = './home.html';
  } else {
    alert('Logout failed. Please try again.');
  }
});

backBtn.addEventListener('click', () => {
  const referrer = document.referrer;
  const currentOrigin = window.location.origin;
  
  if (referrer && referrer.startsWith(currentOrigin)) {
    window.history.back();
  } else {
    window.location.href = './home.html';
  }
});

toggleLink.addEventListener('click', () => {
  isLogin = !isLogin;
  if (isLogin) {
    formTitle.textContent = 'Login';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Sign Up';
    loginErrorP.textContent = '';
    signupErrorP.textContent = '';
  } else {
    formTitle.textContent = 'Sign Up';
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    toggleText.textContent = 'Already have an account?';
    toggleLink.textContent = 'Login';
    loginErrorP.textContent = '';
    signupErrorP.textContent = '';
  }
});

const showPasswordLoginBtn = document.getElementById('show-password-login');
showPasswordLoginBtn.addEventListener('click', () => {
  const passwordField = document.getElementById('password');
  const isVisible = passwordField.type === 'text';
  passwordField.type = isVisible ? 'password' : 'text';
  showPasswordLoginBtn.textContent = isVisible ? 'Show Password' : 'Hide Password';
});

const showPasswordSignupBtn = document.getElementById('show-password-signup');
showPasswordSignupBtn.addEventListener('click', () => {
  const passwordField = document.getElementById('signup-password');
  const isVisible = passwordField.type === 'text';
  passwordField.type = isVisible ? 'password' : 'text';
  showPasswordSignupBtn.textContent = isVisible ? 'Show Password' : 'Hide Password';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginErrorP.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginErrorP.textContent = error.message;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loginErrorP.textContent = 'User not found after login.';
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      loginErrorP.textContent = 'Failed to fetch user role.';
      return;
    }

    document.getElementById('email').value = '';
    document.getElementById('password').value = '';

    if (profile.role === 'admin') {
      window.location.href = './admin.html';
    } else {
      window.location.href = './user-dashboard.html';
    }
  }
});

const toggleDarkMode = document.getElementById('toggleDarkMode');
toggleDarkMode.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  toggleDarkMode.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('darkMode', isDark);
});

if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  toggleDarkMode.textContent = '☀️';
}
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupErrorP.textContent = '';

  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    signupErrorP.textContent = error.message;
  } else {
    alert('Sign up successful! Please check your email to confirm your account before logging in.');
    toggleLink.click();
  }
});

checkAuthStatus();