// js/adminsched.js
import { supabase } from "./supabasecon.js";

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }

  const userId = session.user.id;
  const { data: profile, error } = await supabase
    .from("admins")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    window.location.href = "admin-login.html";
    return;
  }

  // Optionally check role here and redirect if unauthorized
}
document.getElementById("logoutLink").addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent default link behavior
  await supabase.auth.signOut();
  window.location.href = "admin-login.html";
});


checkAuth();

const sections = document.querySelectorAll('.form-box');
const menuLinks = document.querySelectorAll('.sidebar a[data-target]');
const toggleDarkMode = document.getElementById('toggleDarkMode');

// dark mode
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  toggleDarkMode.textContent = '☀️ Light Mode';
}
toggleDarkMode.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('theme', 'dark');
    toggleDarkMode.textContent = '☀️ Light Mode';
  } else {
    localStorage.setItem('theme', 'light');
    toggleDarkMode.textContent = '🌙 Dark Mode';
  }
});

// show section
function showSection(id) {
  sections.forEach(s => s.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
showSection('private-class');
menuLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showSection(l.dataset.target); }));

// helper
function addRow(tableId, cells, id, type) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  const tr = document.createElement('tr');
  tr.innerHTML = cells.map(c => `<td>${c}</td>`).join('') + `<td><button class="delete-btn" data-id="${id}" data-type="${type}">Delete</button></td>`;
  tbody.appendChild(tr);
}

async function loadTable(table, tableId, type) {
  let query = supabase.from(table).select("*").order('id', { ascending: false });

  // ✅ Hide booked rows (for all types)
  if (type === 'rental' || type === 'dance' || type === 'private') {
    query = query.eq("booked", false);
  }

  const { data, error } = await query;
  if (error) { console.error(table, error); return; }

  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = "";

  (data || []).forEach(row => {
    if (type === 'dance') {
      addRow(tableId, [
        row.class_date || row.date || '-',
        row.style || '-',
        row.level || '-',
        `₱${row.price || '-'}`,
        row.duration || '-'
      ], row.id, type);
    }
    if (type === 'private') {
      addRow(tableId, [
        row.class_date || row.date || '-',
        row.style || '-',
        row.level || '-',
        `₱${row.price || '-'}`,
        row.duration || '-'
      ], row.id, type);
    }
    if (type === 'rental') {
      addRow(tableId, [
        row.class_date || row.date || '-',
        row.duration || '-',
        `₱${row.price || '-'}`
      ], row.id, type);
    }
  });
}

// initial load
loadTable("dance_classes", "dance-table", "dance");
loadTable("private_classes", "private-table", "private");
loadTable("rentals", "rental-table", "rental");

// add slot
async function addSlot(type) {
  let table, obj;
  if (type === 'dance') {
    table = 'dance_classes';
    obj = {
      class_date: document.getElementById('dance-date').value,
      style: document.getElementById('dance-style').value.trim(),
      level: document.getElementById('dance-level').value.trim(),
      duration: document.getElementById('dance-duration').value.trim(),
      price: document.getElementById('dance-price').value
    };
  } else if (type === 'private') {
    table = 'private_classes';
    obj = {
      class_date: document.getElementById('private-date').value,
      style: document.getElementById('private-style').value.trim(),
      level: document.getElementById('private-level').value.trim(),
      duration: document.getElementById('private-duration').value.trim(),
      price: document.getElementById('private-price').value
    };
  } else {
    table = 'rentals';
    obj = {
      class_date: document.getElementById('rental-date').value,
      duration: document.getElementById('rental-duration').value.trim(),
      price: document.getElementById('rental-price').value
    };
  }

  // validation (allow 0 price but disallow empty strings)
  const missing = Object.values(obj).some(v => v === null || v === undefined || String(v).trim() === "");
  if (missing) { alert("Please fill all fields!"); return; }

  const { data, error } = await supabase.from(table).insert([obj]).select();
  if (error) { console.error("Insert error:", error); alert("Failed to add slot: " + (error.message || error)); return; }

  // reload table to be safe
  await loadTable("dance_classes", "dance-table", "dance");
  await loadTable("private_classes", "private-table", "private");
  await loadTable("rentals", "rental-table", "rental");

  // clear inputs
  if (type === 'dance') {
    ['dance-date','dance-style','dance-level','dance-duration','dance-price'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } else if (type === 'private') {
    ['private-date','private-style','private-level','private-duration','private-price'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } else {
    ['rental-date','rental-duration','rental-price'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  }
}

document.getElementById('add-dance').addEventListener('click', () => addSlot('dance'));
document.getElementById('add-private').addEventListener('click', () => addSlot('private'));
document.getElementById('add-rental').addEventListener('click', () => addSlot('rental'));

// delete rows
document.querySelectorAll('table').forEach(tbl => {
  tbl.addEventListener('click', async e => {
    if (e.target.classList.contains('delete-btn')) {
      if (!confirm('Delete this slot?')) return;
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      const tableName = type === 'dance' ? 'dance_classes' : type === 'private' ? 'private_classes' : 'rentals';
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) { console.error("Delete error:", error); alert("Delete failed."); return; }
      await loadTable("dance_classes", "dance-table", "dance");
      await loadTable("private_classes", "private-table", "private");
      await loadTable("rentals", "rental-table", "rental");
    }
  });
});