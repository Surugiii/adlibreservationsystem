import { supabase } from './supabasecon.js';

const tableBody = document.getElementById('table-body');
const loadingEl = document.getElementById('loading');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');

const totalReservationsEl = document.getElementById('total-reservations');
const pendingPaymentsEl = document.getElementById('pending-payments');
const confirmedReservationsEl = document.getElementById('confirmed-reservations');
const totalRevenueEl = document.getElementById('total-revenue');
const recentReservationsEl = document.getElementById('recent-reservations');

let allData = [];
let currentImageSrc = '';
let currentImageAlt = '';

function openImageModal(src, alt) {
  currentImageSrc = src;
  currentImageAlt = alt;
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  const placeholder = document.getElementById('modal-placeholder');
  
  if (!modal || !modalImg || !placeholder) {
    console.error('Modal elements not found');
    return;
  }
  
  modalImg.src = src;
  modalImg.alt = alt;
  modal.style.display = 'block';
  modalImg.style.display = 'block';
  placeholder.style.display = 'none';
  
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.focus();
  
  console.log('Modal opened for:', src);
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-image');
  const placeholder = document.getElementById('modal-placeholder');
  
  if (modal) modal.style.display = 'none';
  if (modalImg) modalImg.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  
  console.log('Modal closed');
}

window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('image-modal');
  const closeBtn = document.getElementById('modal-close');
  const overlay = document.querySelector('.modal-overlay');
  
  if (closeBtn) closeBtn.addEventListener('click', closeImageModal);
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeImageModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
      closeImageModal();
    }
  });
  
  const modalImg = document.getElementById('modal-image');
  if (modalImg) {
    modalImg.addEventListener('error', () => {
      console.error('Image load failed:', modalImg.src);
      modalImg.style.display = 'none';
      const placeholder = document.getElementById('modal-placeholder');
      if (placeholder) placeholder.style.display = 'block';
    });
  }
});

function getStatusClass(status) {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'confirmed') return 'success';
  if (lowerStatus === 'pending') return 'warning';
  return 'secondary';
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = isError ? 'error' : '';
  toastEl.style.display = 'block';
  setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
}

function showLoading(show = true) {
  loadingEl.style.display = show ? 'block' : 'none';
  if (show) tableBody.innerHTML = '';
}

function updateDashboard(data) {
  const total = data.length;
  
  const pendingReservations = data.filter(r => {
    const status = (r.payment_status || '').trim().toLowerCase();
    return status === 'pending payment';
  });
  const pendingPayments = pendingReservations.reduce((sum, r) => sum + (Number(r.estimated_price) || 0), 0);
  
  const confirmed = data.filter(r => (r.reservation_status || '').trim().toLowerCase() === 'confirmed').length;
  
  const revenue = data
    .filter(r => (r.reservation_status || '').trim().toLowerCase() === 'confirmed')
    .reduce((sum, r) => sum + (Number(r.estimated_price) || 0), 0);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent = data.filter(r => new Date(r.created_at) > sevenDaysAgo).length;

  totalReservationsEl.textContent = total;
  pendingPaymentsEl.textContent = `₱${pendingPayments.toFixed(2)}`;
  confirmedReservationsEl.textContent = confirmed;
  totalRevenueEl.textContent = `₱${revenue.toFixed(2)}`;
  recentReservationsEl.textContent = recent;
}

function filterData(data) {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedStatus = statusFilter.value;

  return data.filter(reservation => {
    const matchesSearch = !searchTerm || 
      (reservation.full_name || '').toLowerCase().includes(searchTerm) || 
      (reservation.email || '').toLowerCase().includes(searchTerm) ||
      (reservation.phone || '').toLowerCase().includes(searchTerm);

    const reservationStatus = (reservation.reservation_status || '').trim().toLowerCase();
    const isPending = reservationStatus === 'pending' || reservationStatus === '';  
    const isConfirmed = reservationStatus === 'confirmed';
    
    const matchesStatus = !selectedStatus || 
      (selectedStatus.toLowerCase() === 'pending' && isPending) ||
      (selectedStatus.toLowerCase() === 'confirmed' && isConfirmed);

    return matchesSearch && matchesStatus;
  });
}

function renderTable(data) {
  tableBody.innerHTML = '';

  data.forEach(reservation => {
    const tr = document.createElement('tr');

    const showConfirmButton = reservation.payment_screenshot_url && 
      (reservation.reservation_status || '').trim().toLowerCase() !== 'confirmed';

    const displayStatus = (reservation.reservation_status || '').trim() || 'Pending';
    const statusClass = getStatusClass(displayStatus);

    const paymentDisplay = (reservation.payment_status || 'N/A');
    const paymentClass = getStatusClass(paymentDisplay);

    const imageHtml = reservation.payment_screenshot_url ? 
      `<img src="${reservation.payment_screenshot_url}" alt="Payment screenshot for ${reservation.full_name || 'this reservation'}: ${reservation.estimated_price ? '₱' + Number(reservation.estimated_price).toFixed(2) : 'Amount not specified'}" class="screenshot-img" loading="lazy" style="cursor: pointer;" onclick="openImageModal('${reservation.payment_screenshot_url}', 'Payment screenshot for ${reservation.full_name || 'this reservation'}')" onerror="this.style.display='none'; this.parentNode.innerHTML='<span class=\\'no-image\\'>Screenshot unavailable</span>';" />` 
      : '<span class="no-image">No screenshot</span>';

    tr.innerHTML = `
      <td title="${reservation.full_name || 'N/A'}">${reservation.full_name || 'N/A'}</td>
      <td title="${reservation.email || 'N/A'}">${reservation.email || 'N/A'}</td>
      <td title="${reservation.phone || 'N/A'}">${reservation.phone || 'N/A'}</td>
      <td title="${reservation.class_type || 'N/A'}">${reservation.class_type || 'N/A'}</td>
      <td title="${reservation.class_style || 'N/A'}">${reservation.class_style || 'N/A'}</td>
      <td title="${reservation.class_level || 'N/A'}">${reservation.class_level || 'N/A'}</td>
      <td class="center">${reservation.participants || 'N/A'}</td>
      <td title="${reservation.requested_date || 'N/A'}">${reservation.requested_date || 'N/A'}</td>
      <td>${reservation.requested_time || 'N/A'}</td>
      <td>${reservation.duration || 'N/A'}</td>
      <td class="center"><span class="status-badge ${paymentClass}">${paymentDisplay}</span></td>
      <td class="amount right">${reservation.estimated_price ? '₱' + Number(reservation.estimated_price).toFixed(2) : '₱0.00'}</td>
      <td class="center">${imageHtml}</td>
      <td class="center"><span class="status-badge ${statusClass}">${displayStatus}</span></td>
      <td class="center">
        ${showConfirmButton ? 
          `<button data-id="${reservation.id}" class="action-btn confirm-btn">Confirm</button>` : ''}
        <button data-id="${reservation.id}" class="action-btn delete-btn">Delete</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  document.querySelectorAll('.confirm-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await confirmReservation(id);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      await deleteReservation(id);
    });
  });
}

async function loadReservations() {
  showLoading(true);

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('requested_date', { ascending: true });

  if (error) {
    showToast('Error loading reservations: ' + error.message, true);
    showLoading(false);
    return;
  }

  allData = data || [];
  updateDashboard(allData);
  const filteredData = filterData(allData);
  renderTable(filteredData);
  showLoading(false);
}

async function confirmReservation(id) {
  const { error } = await supabase
    .from('reservations')
    .update({ reservation_status: 'Confirmed' })
    .eq('id', id);

  if (error) {
    showToast('Error confirming reservation: ' + error.message, true);
    return;
  }

  showToast('Reservation confirmed!');
  await loadReservations();
}

async function deleteReservation(id) {
  if (!confirm('Are you sure you want to delete this reservation?')) return;

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (error) {
    showToast('Error deleting reservation: ' + error.message, true);
    return;
  }

  showToast('Reservation deleted!');
  await loadReservations();
}

async function checkUser_AndLoad() {
  const { data: { user }, error } = await supabase.auth.getUser ();

  if (error || !user) {
    showToast('Please sign in as admin.', true);
    window.location.href = './admin-login.html';
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    showToast('Access denied. Admin role required.', true);
    window.location.href = './admin-login.html';
    return;
  }

  await loadReservations();
}

searchInput.addEventListener('input', () => {
  const filteredData = filterData(allData);
  renderTable(filteredData);
});

statusFilter.addEventListener('change', () => {
  const filteredData = filterData(allData);
  renderTable(filteredData);
});

refreshBtn.addEventListener('click', loadReservations);

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = './admin-login.html';
});

checkUser_AndLoad();

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