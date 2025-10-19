import { supabase } from './supabasecon.js';

const form = document.getElementById('reservation-form');
const classTypeSelect = document.getElementById('class_type');
const classDetailsDiv = document.getElementById('class-details');
const classStyleSelect = document.getElementById('class_style');
const classLevelInput = document.getElementById('class_level');
const estimatedPriceSpan = document.getElementById('estimated_price');
const depositAmountSpan = document.getElementById('deposit_amount');

const paymentSection = document.getElementById('payment-section');
const paymentInput = document.getElementById('payment_screenshot');
const uploadPaymentBtn = document.getElementById('upload-payment-btn');
const uploadStatus = document.getElementById('upload-status');

let currentReservationId = null;
let currentUser = null;

async function checkAuth() {
  console.log('DEBUG: checkAuth() called');

  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('DEBUG: Supabase getUser() result:', { user: !!user, email: user?.email, id: user?.id, error: error?.message });

  if (error || !user) {
    console.log('DEBUG: No user found, redirecting to login');
    alert('Please sign in to make a reservation.');
    window.location.href = './admin-login.html';
    return null;
  }

  currentUser = user;
  console.log('DEBUG: User authenticated successfully');

  const emailInput = document.getElementById('email');
  if (!emailInput) {
    console.error('DEBUG: Email input not found in DOM!');
    return user;
  }

  emailInput.value = user.email;
  console.log('DEBUG: Email input set to:', user.email);

  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
  emailInput.focus();
  setTimeout(() => emailInput.blur(), 0);

  emailInput.readOnly = true;
  emailInput.style.backgroundColor = '#f5f5f5';
  emailInput.style.color = '#000';

  const emailLabel = document.querySelector('label[for="email"]');
  if (emailLabel) {
    emailLabel.innerHTML += ' <span style="color: #666; font-size: 0.9em;">(Auto-filled from your account)</span>';
    console.log('DEBUG: Added note to email label');
  } else {
    console.warn('DEBUG: Email label not found; skipping note.');
  }

  return user;
}

function calculateEstimatedPrice() {
  const classType = classTypeSelect.value;
  const participantsInput = document.getElementById('participants');
  const participants = parseInt(participantsInput.value) || 1;
  const durationText = document.getElementById('duration').value.trim();

  let basePrice = 0;
  let effectiveParticipants = participants;
  let hours = 1;

  if (!classType) {
    estimatedPriceSpan.textContent = '0.00';
    depositAmountSpan.textContent = '0.00';
    return;
  }

  if (classType === 'Rental') {
    const durationMatch = durationText.match(/(\d+(?:\.\d+)?)/);
    hours = durationMatch ? parseFloat(durationMatch[1]) : 1;
  }

  if (classType === 'Dance Class') {
    effectiveParticipants = 1;
    basePrice = 350;
  } else if (classType === 'Private Class') {
    if (effectiveParticipants === 1) basePrice = 3999;
    else if (effectiveParticipants >= 2 && effectiveParticipants <= 5) basePrice = 5999;
    else if (effectiveParticipants >= 6 && effectiveParticipants <= 10) basePrice = 7999;
    else if (effectiveParticipants >= 11 && effectiveParticipants <= 20) basePrice = 9999;
    else if (effectiveParticipants >= 21 && effectiveParticipants <= 30) basePrice = 11999;
    else if (effectiveParticipants >= 31 && effectiveParticipants <= 40) basePrice = 113000;
    else basePrice = 113000;
  } else if (classType === 'Rental') {
    basePrice = 1500 * hours;
  }

  estimatedPriceSpan.textContent = basePrice.toFixed(2);
  const depositAmount = basePrice * 0.7;
  depositAmountSpan.textContent = depositAmount.toFixed(2);
}

window.calculateEstimatedPrice = calculateEstimatedPrice;

classTypeSelect.addEventListener('change', () => {
  if (classTypeSelect.value === 'Dance Class' || classTypeSelect.value === 'Private Class') {
    classDetailsDiv.style.display = 'block';
  } else {
    classDetailsDiv.style.display = 'none';
    classStyleSelect.value = '';
    classLevelInput.value = '';
  }
  calculateEstimatedPrice();
});

document.getElementById('duration').addEventListener('input', calculateEstimatedPrice);
document.getElementById('participants').addEventListener('input', calculateEstimatedPrice);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('DEBUG: Form submitted, calling checkAuth()');

  const user = await checkAuth();
  if (!user) return;

  let email = document.getElementById('email').value.trim();
  console.log('DEBUG: Email from input during validation:', email);

  if (!email && currentUser) {
    console.warn('DEBUG: Email input empty, using auth email as fallback');
    email = currentUser.email;
    document.getElementById('email').value = email;
  }

  const full_name = document.getElementById('full_name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  let participants = parseInt(document.getElementById('participants').value);
  const requested_date = document.getElementById('requested_date').value;
  const requested_time = document.getElementById('requested_time').value;
  const class_type = classTypeSelect.value;
  const class_style = classStyleSelect.value || null;
  const class_level = classLevelInput.value.trim() || null;
  const duration = document.getElementById('duration').value.trim();
  const estimated_price = parseFloat(estimatedPriceSpan.textContent);
  const payment_amount = estimated_price * 0.7;

  if (!full_name || !phone || !requested_date || !requested_time || !class_type || !duration || (!email && !currentUser)) {
    alert('Please fill in all required fields.');
    return;
  }

  if (class_type === 'Dance Class') {
    participants = 1;
  }

  const selectedDate = new Date(requested_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    alert('Please select a date that is not in the past.');
    return;
  }

  const { data: existingReservations, error: checkError } = await supabase
    .from('reservations')
    .select('id, requested_time, duration')
    .eq('requested_date', requested_date)
    .in('reservation_status', ['Payment Received', 'Confirmed']);

  if (checkError) {
    console.error('Error checking existing reservations:', checkError);
    alert('Error validating time slot. Please try again.');
    return;
  }

  const [hours, minutes] = requested_time.split(':').map(Number);
  const startTime = new Date();
  startTime.setHours(hours, minutes, 0, 0);
  const durationMatch = duration.match(/(\d+(?:\.\d+)?)/);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1;
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  for (const res of existingReservations) {
    const [resHours, resMinutes] = res.requested_time.split(':').map(Number);
    const resStart = new Date();
    resStart.setHours(resHours, resMinutes, 0, 0);
    const resDurationMatch = res.duration.match(/(\d+(?:\.\d+)?)/);
    const resDurationHours = resDurationMatch ? parseFloat(resDurationMatch[1]) : 1;
    const resEnd = new Date(resStart.getTime() + resDurationHours * 60 * 60 * 1000);

    if (startTime < resEnd && endTime > resStart) {
      alert('This time slot is already booked. Please choose a different time.');
      return;
    }
  }

  const newReservation = {
    user_id: user.id,
    full_name: full_name,
    email: email,
    phone: phone,
    class_type: class_type,
    class_style: class_style,
    class_level: class_level,
    participants: participants,
    requested_date: requested_date,
    requested_time: requested_time,
    duration: duration,
    payment_status: 'Pending Payment',
    estimated_price: estimated_price,
    payment_amount: payment_amount,
    payment_screenshot_url: null,
    reservation_status: 'Pending'
  };

  console.log('DEBUG: Form data collected, about to insert reservation');
  console.log('DEBUG: Inserting reservation with user_id:', user.id);
  console.log('DEBUG: Full reservation object:', newReservation);

  const { data, error } = await supabase
    .from('reservations')
    .insert([newReservation])
    .select();

  if (error) {
    console.error('DEBUG: Insert error:', error);
    alert('Error submitting reservation: ' + error.message);
    return;
  }

  console.log('DEBUG: Insert successful, inserted data:', data);

  currentReservationId = data[0].id;

  alert('Reservation request submitted successfully! Please upload your payment screenshot for the 70% deposit (₱' + payment_amount.toFixed(2) + ').');

  paymentSection.style.display = 'block';
  form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
});

paymentInput.addEventListener('change', () => {
  uploadPaymentBtn.disabled = !paymentInput.files.length;
});

uploadPaymentBtn.addEventListener('click', async () => {
  if (!paymentInput.files.length) {
    alert('Please select a payment screenshot to upload.');
    return;
  }
  if (!currentReservationId) {
    alert('No reservation found to attach payment to.');
    return;
  }

  uploadPaymentBtn.disabled = true;
  uploadStatus.textContent = 'Uploading...';

  const file = paymentInput.files[0];
  const fileExt = file.name.split('.').pop();
  const fileName = `${currentReservationId}.${fileExt}`;
  const filePath = `payment-screenshots/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-screenshots')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    uploadStatus.textContent = 'Upload failed: ' + uploadError.message;
    uploadPaymentBtn.disabled = false;
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
    .eq('id', currentReservationId);

  if (updateError) {
    uploadStatus.textContent = 'Failed to update reservation: ' + updateError.message;
    uploadPaymentBtn.disabled = false;
    return;
  }

  uploadStatus.textContent = 'Payment screenshot uploaded successfully! Your reservation is now pending admin confirmation.';
  uploadPaymentBtn.disabled = true;
  paymentInput.disabled = true;
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DEBUG: Page loaded, DOM ready, checking auth...');
  await checkAuth();
});