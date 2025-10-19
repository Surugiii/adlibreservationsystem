import { supabase } from './supabasecon.js';

const form = document.getElementById('change-form');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm-password');
const changeBtn = document.getElementById('change-btn');
const statusDiv = document.getElementById('status');

document.addEventListener('DOMContentLoaded', async () => {
  await checkRecoveryToken();
});

async function checkRecoveryToken() {
  const urlHash = window.location.hash.substring(1);
  console.log('URL Hash:', urlHash);

  if (!urlHash) {
    showStatus('Invalid access. Please use the link from your reset email.', 'error');
    disableForm();
    return;
  }

  const urlParams = new URLSearchParams(urlHash);
  const type = urlParams.get('type');
  const accessToken = urlParams.get('access_token');

  if (type !== 'recovery' || !accessToken) {
    console.error('No recovery token found in URL');
    showStatus('Invalid access. Please use the link from your reset email.', 'error');
    disableForm();
    return;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Current session after token:', session);

  if (sessionError || !session || session.user === null) {
    console.error('Session restore failed:', sessionError);
    showStatus('Invalid or expired reset link. Please request a new one.', 'error');
    disableForm();
    return;
  }

  console.log('Valid recovery session detected for user:', session.user.email);
  showStatus('Ready to reset password. Enter your new password below.', 'info');
  enableForm();
}

function disableForm() {
  changeBtn.disabled = true;
  changeBtn.textContent = 'Invalid Link';
  passwordInput.disabled = true;
  confirmInput.disabled = true;
}

function enableForm() {
  changeBtn.disabled = false;
  changeBtn.textContent = 'Update Password';
  passwordInput.disabled = false;
  confirmInput.disabled = false;
}

form.addEventListener('submit', async (e) => {
  if (changeBtn.disabled) return;

  e.preventDefault();
  
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;
  
  if (!password || !confirmPassword) {
    showStatus('Please fill in both password fields.', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showStatus('Passwords do not match.', 'error');
    return;
  }
  
  if (password.length < 6) {
    showStatus('Password must be at least 6 characters long.', 'error');
    return;
  }

  changeBtn.disabled = true;
  changeBtn.textContent = 'Updating...';
  showStatus('Updating password...', 'info');

  try {
    const { error } = await supabase.auth.updateUser ({ password });
    
    if (error) {
      console.error('Update error:', error);
      let userMessage = 'An error occurred. Please try again.';
      
      if (error.message.includes('Invalid token') || error.message.includes('expired')) {
        userMessage = 'Invalid or expired reset link. Please request a new one.';
      } else if (error.message.includes('Invalid password') || error.message.includes('weak')) {
        userMessage = 'Password is too weak. Please choose a stronger one (at least 6 characters).';
      } else {
        userMessage = `Error: ${error.message}`;
      }
      
      showStatus(userMessage, 'error');
    } else {
      console.log('Password updated successfully');
      showStatus('Password updated successfully! Redirecting to login...', 'success');
      form.reset();
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        window.location.href = 'admin-login.html';
      }, 2000);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    showStatus('An unexpected error occurred. Please try again.', 'error');
  } finally {
    changeBtn.disabled = false;
    changeBtn.textContent = 'Update Password';
  }
});

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  } else if (type === 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 10000);
  }
}

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

const showPasswordNewBtn = document.getElementById('show-password-new');
showPasswordNewBtn.addEventListener('click', () => {
  const passwordField = document.getElementById('password');
  const isVisible = passwordField.type === 'text';
  passwordField.type = isVisible ? 'password' : 'text';
  showPasswordNewBtn.textContent = isVisible ? 'Show Password' : 'Hide Password';
});

const showPasswordConfirmBtn = document.getElementById('show-password-confirm');
showPasswordConfirmBtn.addEventListener('click', () => {
  const confirmPasswordField = document.getElementById('confirm-password');
  const isVisible = confirmPasswordField.type === 'text';
  confirmPasswordField.type = isVisible ? 'password' : 'text';
  showPasswordConfirmBtn.textContent = isVisible ? 'Show Password' : 'Hide Password';
});

const strengthDiv = document.getElementById('strength');

passwordInput.addEventListener('input', () => {
  const password = passwordInput.value;
  let strength = 0;
  let feedback = [];

  if (password.length >= 8) strength++;
  else feedback.push('at least 8 characters');

  if (/[a-z]/.test(password)) strength++;
  else feedback.push('a lowercase letter');

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push('an uppercase letter');

  if (/[0-9]/.test(password)) strength++;
  else feedback.push('a number');

  if (/[^A-Za-z0-9]/.test(password)) strength++;
  else feedback.push('a special character');

  let color = '';
  let text = '';

  if (strength < 3) {
    color = 'red';
    text = `Weak: Needs ${feedback.join(', ')}.`;
  } else if (strength < 5) {
    color = 'orange';
    text = 'Medium: Add more variety.';
  } else {
    color = 'green';
    text = 'Strong password!';
  }

  strengthDiv.style.color = color;
  strengthDiv.textContent = text;
});

const changeForm = document.getElementById('change-form');

changeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = passwordInput.value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    statusDiv.className = 'status error';
    statusDiv.textContent = 'Passwords do not match.';
    statusDiv.style.display = 'block';
    return;
  }

  if (password.length < 8) {
    statusDiv.className = 'status error';
    statusDiv.textContent = 'Password must be at least 8 characters.';
    statusDiv.style.display = 'block';
    return;
  }

  statusDiv.className = 'status success';
  statusDiv.textContent = 'Password changed successfully!';
  statusDiv.style.display = 'block';

  changeForm.reset();
  strengthDiv.textContent = 'Password must be at least 8 characters (letters + numbers).';
  strengthDiv.style.color = '';
});
