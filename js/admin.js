import { supabase } from "./supabasecon.js";

// Table references
const pendingTable = document.getElementById("pendingTable");
const confirmedTable = document.getElementById("confirmedTable");
const declinedTable = document.getElementById("declinedTable");
const usersTable = document.getElementById("usersTable");
const totalPaidEl = document.getElementById("totalPaid");
const pendingPaymentsEl = document.getElementById("pendingPayments");
const totalClientsEl = document.getElementById("totalClients");
const peoplePaidEl = document.getElementById("peoplePaid");
const clientsChartEl = document.getElementById("clientsChart");

// Sidebar navigation
const menuButtons = document.querySelectorAll(".menu-btn");
const sections = document.querySelectorAll("main section");

menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const sectionId = btn.dataset.section;
    sections.forEach(sec => sec.classList.add("hidden"));
    menuButtons.forEach(b => b.classList.remove("active"));
    document.getElementById(sectionId)?.classList.remove("hidden");
    btn.classList.add("active");
  });
});

// Log Out
document.querySelector(".logout")?.addEventListener("click", () => {
  window.location.href = "admin-login.html";
});

// ------------------------ LOAD ALL ------------------------
async function loadRequests() {
  await loadPending();
  await loadConfirmed();
  await loadDeclined();
  await loadUsers();
  await loadPayments();
  await loadReports();
}

// ------------------------ PENDING ------------------------
async function loadPending() {
  if (!pendingTable) return;
  pendingTable.innerHTML = "";

  const { data: bookings = [] } = await supabase.from("bookings").select("*").eq("status", "Pending");
  const { data: rentals = [] } = await supabase.from("rentals").select("*").eq("status", "Pending");

  const pendingItems = [
    ...bookings.map(b => ({ ...b, type: "booking" })),
    ...rentals.map(r => ({ ...r, type: "rental" }))
  ];

  pendingItems.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.email || "-"}</td>
      <td>${item.name || item.full_name || "-"}</td>
      <td>${item.type}</td>
      <td>${item.duration || "-"}</td>
      <td>${item.participants || "-"}</td>
      <td>₱${item.price || "0"}</td>
      <td>${item.class_date || item.datetime || "-"}</td>
      <td>${item.payment || "Unpaid"}</td>
      <td>Pending</td>
      <td>
        <button class="confirm-btn" data-id="${item.id}" data-type="${item.type}">Confirm</button>
        <button class="decline-btn" data-id="${item.id}" data-type="${item.type}">Decline</button>
      </td>
    `;
    pendingTable.appendChild(tr);
  });
}

// ------------------------ CONFIRMED ------------------------
async function loadConfirmed() {
  if (!confirmedTable) return;
  confirmedTable.innerHTML = "";

  const { data: confirmedBookings = [] } = await supabase.from("bookings").select("*").eq("status", "Confirmed");
  const { data: confirmedRentals = [] } = await supabase.from("rentals").select("*").eq("status", "Confirmed");

  [...confirmedBookings, ...confirmedRentals].forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.email || "-"}</td>
      <td>${item.name || item.full_name || "-"}</td>
      <td>${item.type || "booking"}</td>
      <td>${item.duration || "-"}</td>
      <td>${item.participants || "-"}</td>
      <td>₱${item.price || "0"}</td>
      <td>${item.class_date || item.datetime || "-"}</td>
      <td>${item.payment || "Unpaid"}</td>
      <td>Confirmed</td>
      <td>
        <button class="delete-btn" data-id="${item.id}" data-type="${item.type || "booking"}">🗑 Delete</button>
      </td>
    `;
    confirmedTable.appendChild(tr);
  });
}

// ------------------------ DECLINED ------------------------
async function loadDeclined() {
  if (!declinedTable) return;
  declinedTable.innerHTML = "";

  const { data: declinedBookings = [] } = await supabase.from("bookings").select("*").eq("status", "Declined");
  const { data: declinedRentals = [] } = await supabase.from("rentals").select("*").eq("status", "Declined");

  [...declinedBookings, ...declinedRentals].forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.email || "-"}</td>
      <td>${item.name || item.full_name || "-"}</td>
      <td>${item.type || "booking"}</td>
      <td>${item.duration || "-"}</td>
      <td>${item.participants || "-"}</td>
      <td>₱${item.price || "0"}</td>
      <td>${item.class_date || item.datetime || "-"}</td>
      <td>${item.payment || "Unpaid"}</td>
      <td>Declined</td>
      <td>
        <button class="delete-btn" data-id="${item.id}" data-type="${item.type || "booking"}">🗑 Delete</button>
      </td>
    `;
    declinedTable.appendChild(tr);
  });
}

// ------------------------ USER MANAGEMENT ------------------------
async function loadUsers() {
  if (!usersTable) return;

  const { data: users = [] } = await supabase.from("users").select("*");
  usersTable.innerHTML = "";

  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.email || "-"}</td>
      <td>${u.name || u.full_name || "-"}</td>
      <td>${u.role || "User"}</td>
      <td>${u.status || "Active"}</td>
      <td>₱${u.amount || "0"}</td>
      <td>
        <button class="delete-user" data-id="${u.id}">🗑 Delete</button>
      </td>
    `;
    usersTable.appendChild(tr);
  });
}

// ------------------------ PAYMENT & REPORTS ------------------------
async function loadPayments() {
  const { data: all = [] } = await supabase.from("bookings").select("*");
  let totalPaid = 0, totalPending = 0, clientsPaid = 0;
  const clientSet = new Set();

  all.forEach(item => {
    if (item.payment === "Paid") {
      totalPaid += Number(item.price || 0);
      clientsPaid++;
    } else {
      totalPending += Number(item.price || 0);
    }
    if (item.email) clientSet.add(item.email);
  });

  totalPaidEl && (totalPaidEl.textContent = `₱${totalPaid}`);
  pendingPaymentsEl && (pendingPaymentsEl.textContent = `₱${totalPending}`);
  totalClientsEl && (totalClientsEl.textContent = clientSet.size);
  peoplePaidEl && (peoplePaidEl.textContent = clientsPaid);
}

async function loadReports() {
  try {
    const { data: all = [] } = await supabase.from("bookings").select("*");
    const roleCounts = { Paid: 0, Unpaid: 0 };
    all.forEach(b => b.payment === "Paid" ? roleCounts.Paid++ : roleCounts.Unpaid++);

    if (clientsChartEl && typeof Chart !== "undefined") {
      new Chart(clientsChartEl, {
        type: "pie",
        data: {
          labels: ["Paid", "Unpaid"],
          datasets: [{ label: "Clients Payment Status", data: [roleCounts.Paid, roleCounts.Unpaid], backgroundColor: ["#4caf50", "#f44336"] }]
        }
      });
    }
  } catch (err) {
    console.warn("Failed to load reports:", err);
  }
}

// ------------------------ ACTION HANDLERS ------------------------

// Pending Table: Confirm / Decline
pendingTable?.addEventListener("click", async (e) => {
  const btn = e.target;
  if (!btn.classList.contains("confirm-btn") && !btn.classList.contains("decline-btn")) return;

  const id = Number(btn.dataset.id);
  const type = btn.dataset.type || "booking";
  const tableName = type === "booking" ? "bookings" : "rentals";
  const status = btn.classList.contains("confirm-btn") ? "Confirmed" : "Declined";

  if (!confirm(`Are you sure you want to mark this request as ${status}?`)) return;

  try {
    const { data, error } = await supabase.from(tableName).update({ status }).eq("id", id).select();
    if (error || !data || data.length === 0) throw error || new Error("Status not updated");
    alert(`✅ Status updated to "${status}" successfully!`);
    await loadRequests();
  } catch (err) {
    console.error(err);
  }
});

// Confirmed / Declined Tables: Delete
[confirmedTable, declinedTable].forEach(table => {
  table?.addEventListener("click", async (e) => {
    const btn = e.target;
    if (!btn.classList.contains("delete-btn")) return;

    const id = Number(btn.dataset.id);
    const type = btn.dataset.type || "booking";
    const tableName = type === "booking" ? "bookings" : "rentals";

    if (!id) {
      alert("❌ Invalid ID.");
      return;
    }

    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { data, error } = await supabase.from(tableName).delete().eq("id", id).select();
      if (error || !data || data.length === 0) throw error || new Error("No record deleted");
      alert("✅ Record deleted successfully!");
      await loadRequests();
    } catch (err) {
      console.error(err);
    }
  });
});

// Users Table: Delete
usersTable?.addEventListener("click", async (e) => {
  const btn = e.target;
  if (!btn.classList.contains("delete-user")) return;

  const id = btn.dataset.id;
  if (!id) return alert("❌ Invalid user ID");
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const { data, error } = await supabase.from("users").delete().eq("id", id).select();
    if (error || !data || data.length === 0) throw error || new Error("No user deleted");
    alert("✅ User deleted successfully!");
    await loadRequests();
  } catch (err) {
    console.error(err);

  }
});

// ------------------------ INITIALIZE ------------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadRequests();
});