import { supabase } from './supabasecon.js';

const reservationsTable = document.getElementById('reservations-table');
const reservationsBody = document.getElementById('reservations-body');
const noReservationsP = document.getElementById('no-reservations');
const logoutBtn = document.getElementById('logout-btn');
const paymentFileInput = document.getElementById('payment-file-input');
const uploadStatusDiv = document.getElementById('upload-status'); 

let currentUser  = null;

async function checkAuth() {
  const { data: { user }, error } = await supabase.auth.getUser ();
  if (error || !user) {
    alert('Please sign in to view your reservations.');
    window.location.href = './admin-login.html';
    return null;
  }
  console.log('DEBUG: Dashboard - Authenticated user ID:', user.id);
  console.log('DEBUG: Dashboard - Authenticated user email:', user.email);
  currentUser  = user; 
  return user;
}


async function uploadPaymentForReservation(reservationId) {
  if (!paymentFileInput.files.length) {
    showUploadStatus('Please select a payment screenshot (image file).', 'error');
    return;
  }

  uploadStatusDiv.style.display = 'block';
  showUploadStatus('Uploading payment screenshot...', '');

  const file = paymentFileInput.files[0];
  if (file.size > 5 * 1024 * 1024) { 
    showUploadStatus('File too large (max 5MB). Please select a smaller image.', 'error');
    return;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${reservationId}.${fileExt}`;
  const filePath = `payment-screenshots/${fileName}`;


  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-screenshots')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('DEBUG: Upload error:', uploadError);
    showUploadStatus('Upload failed: ' + uploadError.message, 'error');
    return;
  }

 
  const { data: { publicUrl: screenshotUrl } } = supabase.storage
    .from('payment-screenshots')
    .getPublicUrl(filePath);

 
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      payment_screenshot_url: screenshotUrl,
      payment_status: 'Payment Received' 
    })
    .eq('id', reservationId);

  if (updateError) {
    console.error('DEBUG: Update error:', updateError);
    showUploadStatus('Failed to update reservation: ' + updateError.message, 'error');
    return;
  }

  showUploadStatus('Payment screenshot uploaded successfully! Your reservation is now pending admin confirmation.', 'success');
  paymentFileInput.value = '';

  
  await loadReservations(currentUser );
}


function showUploadStatus(message, type) {
  uploadStatusDiv.textContent = message;
  uploadStatusDiv.className = `upload-status ${type}`;
  if (type) {
    setTimeout(() => {
      uploadStatusDiv.style.display = 'none';
    }, 5000);  
  }
}


async function loadReservations(user) {
  console.log('DEBUG: Querying reservations for user_id:', user.id);

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_date', { ascending: false })
    .order('requested_time', { ascending: false });

  if (error) {
    console.error('DEBUG: Query error:', error);
    alert('Error fetching reservations: ' + error.message);
    return;
  }

  console.log('DEBUG: Query returned data:', data);
  console.log('DEBUG: Number of reservations found:', data.length);

  if (data.length === 0) {
    reservationsTable.style.display = 'none';
    noReservationsP.style.display = 'block';
    return;
  }

  noReservationsP.style.display = 'none';
  reservationsTable.style.display = 'table';

 
  reservationsBody.innerHTML = '';
  data.forEach((reservation, index) => {
    console.log(`DEBUG: Reservation ${index + 1} - ID: ${reservation.id}, user_id: ${reservation.user_id}, payment_status: ${reservation.payment_status}, has_screenshot: ${!!reservation.payment_screenshot_url}`);

    
    const canUploadPayment = !reservation.payment_screenshot_url && reservation.payment_status === 'Pending Payment';
    
    const uploadButtonHtml = canUploadPayment ? 
      `<button class="upload-btn" onclick="handleUploadClick('${reservation.id}')">Upload Payment</button>` : 
      '';
    
    console.log(`DEBUG: Created button HTML for reservation ${reservation.id}: ${uploadButtonHtml ? 'Yes (with onclick)' : 'No'}`);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${reservation.requested_date}</td>
      <td>${reservation.requested_time}</td>
      <td>${reservation.class_type}${reservation.class_style ? ` - ${reservation.class_style}` : ''}${reservation.class_level ? ` (${reservation.class_level})` : ''}</td>
      <td>${reservation.participants}</td>
      <td>${reservation.duration}</td>
      <td class="status-${reservation.reservation_status.toLowerCase().replace(' ', '-')}">${reservation.reservation_status}</td>
      <td>${reservation.estimated_price.toFixed(2)}</td>
      <td class="status-${reservation.payment_status.toLowerCase().replace(' ', '-')}">${reservation.payment_status}</td>
      <td>${uploadButtonHtml}</td>
    `;
    reservationsBody.appendChild(row);
  });

 
  paymentFileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      
      if (window.pendingReservationId) {
        console.log('DEBUG: File selected, uploading for reservation ID:', window.pendingReservationId);
        await uploadPaymentForReservation(window.pendingReservationId);
        window.pendingReservationId = null;
      }
    }
  });
}

window.handleUploadClick = function(reservationId) {
  console.log('DEBUG: Upload button clicked for reservation ID:', reservationId);
  window.pendingReservationId = reservationId;
  paymentFileInput.click();
};

logoutBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert('Logout error: ' + error.message);
  } else {
    window.location.href = './admin-login.html';
  }
});

(async () => {
  const user = await checkAuth();
  if (user) {
    await loadReservations(user);
  }
})();

    const darkModeToggle = document.getElementById('toggleDarkMode');

    const updateToggleState = () => {
      const isDark = document.body.classList.contains('dark-mode');
      if (isDark) {
        darkModeToggle.textContent = '☀️';
        darkModeToggle.setAttribute('aria-label', 'Switch to light mode');
      } else {
        darkModeToggle.textContent = '🌙';
        darkModeToggle.setAttribute('aria-label', 'Switch to dark mode');
      }
    };

    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
    updateToggleState();

    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
      updateToggleState();
    });