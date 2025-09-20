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

checkAuth();

document.addEventListener("DOMContentLoaded", () => {
  initAdminDashboard();
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("admin-login.html");
});

async function initAdminDashboard() {
  // Element references
  const pendingTable = document.getElementById("pendingTable");
  const confirmedTable = document.getElementById("confirmedTable");
  const declinedTable = document.getElementById("declinedTable");
  const usersTable = document.getElementById("usersTable");
  const paymentsTable = document.getElementById("paymentsTable");

  const totalPaidEl = document.getElementById("totalPaid");
  const pendingPaymentsEl = document.getElementById("pendingPayments");
  const totalClientsEl = document.getElementById("totalClients");
  const peoplePaidEl = document.getElementById("peoplePaid");
  const clientsChartEl = document.getElementById("clientsChart");

  const pendingSearchInput = document.getElementById("pendingSearchInput");

  // Sidebar menu buttons and sections
  const menuButtons = document.querySelectorAll(".sidebar button");
  const sections = document.querySelectorAll("section");

  // Setup sidebar navigation
  menuButtons.forEach(button => {
    button.addEventListener("click", () => {
      const sectionId = button.dataset.section;
      if (!sectionId) {
        console.warn("Menu button missing data-section attribute");
        return;
      }
      // Hide all sections
      sections.forEach(sec => sec.classList.add("hidden"));
      // Show selected section
      const targetSection = document.getElementById(sectionId);
      if (!targetSection) {
        console.warn(`No section found with id: ${sectionId}`);
        return;
      }
      targetSection.classList.remove("hidden");

      // Update active button
      menuButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // Logout button
  const logoutBtn = document.querySelector(".logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // TODO: Add session clearing logic if applicable
      window.location.href = "admin-login.html";
    });
  }

  // Load all data initially
  await loadAllData();

  // Setup search input listener for pending requests
  if (pendingSearchInput && pendingTable) {
    pendingSearchInput.addEventListener("keyup", () => filterTable(pendingTable, pendingSearchInput.value));
  }

  // Event delegation for action buttons in tables
  document.body.addEventListener("click", async (event) => {
    const target = event.target;

    if (target.classList.contains("confirm-btn")) {
      await handleConfirm(target);
    } else if (target.classList.contains("decline-btn")) {
      await handleDecline(target);
    } else if (target.classList.contains("delete-btn")) {
      await handleDelete(target);
    }
  });

  // Helper: Load all data sections
  async function loadAllData() {
    await Promise.all([
      loadPending(),
      loadConfirmed(),
      loadDeclined(),
      loadUsers(),
      loadPayments(),
      loadReports()
    ]);
  }

  // Helper: Create table row HTML for booking/rental item
  function createTableRow(item, status, includeActions = true) {
    const email = item.email || "-";
    const name = item.name || item.full_name || "-";
    const type = item.type || "booking";
    const duration = item.duration || "-";
    const participants = item.participants || "-";
    const price = item.price ? `₱${item.price}` : "₱0";
    const date = item.class_date || item.datetime || "-";
    const payment = item.payment || "Unpaid";

    let actionsHtml = "";
    if (includeActions) {
      if (status === "Pending") {
        actionsHtml = `
          <button class="confirm-btn" data-id="${item.id}" data-type="${type}">✔ Confirm</button>
          <button class="decline-btn" data-id="${item.id}" data-type="${type}">✘ Decline</button>
        `;
      } else {
        actionsHtml = `
          <button class="delete-btn" data-id="${item.id}" data-type="${type}">🗑 Delete</button>
        `;
      }
    }

    return `
      <tr>
        <td>${email}</td>
        <td>${name}</td>
        <td>${type}</td>
        <td>${duration}</td>
        <td>${participants}</td>
        <td>${price}</td>
        <td>${date}</td>
        <td>${payment}</td>
        <td>${status}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }

  // Load Pending Requests (bookings + rentals with status Pending)
  async function loadPending() {
    if (!pendingTable) return;
    pendingTable.innerHTML = "<tr><td colspan='10'>Loading...</td></tr>";

    try {
      const { data: bookings = [], error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "Pending");
      if (bookingsError) throw bookingsError;

      const { data: rentals = [], error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "Pending");
      if (rentalsError) throw rentalsError;

      const pendingItems = [
        ...bookings.map(b => ({ ...b, type: "booking" })),
        ...rentals.map(r => ({ ...r, type: "rental" }))
      ];

      if (pendingItems.length === 0) {
        pendingTable.innerHTML = "<tr><td colspan='10'>No pending requests found.</td></tr>";
        return;
      }

      pendingTable.innerHTML = pendingItems.map(item => createTableRow(item, "Pending")).join("");
    } catch (error) {
      console.error("Error loading pending requests:", error);
      pendingTable.innerHTML = `<tr><td colspan='10'>Failed to load pending requests.</td></tr>`;
    }
  }

  // Load Confirmed Requests
  async function loadConfirmed() {
    if (!confirmedTable) return;
    confirmedTable.innerHTML = "<tr><td colspan='10'>Loading...</td></tr>";

    try {
      const { data: bookings = [], error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "Confirmed");
      if (bookingsError) throw bookingsError;

      const { data: rentals = [], error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "Confirmed");
      if (rentalsError) throw rentalsError;

      const confirmedItems = [
        ...bookings.map(b => ({ ...b, type: "booking" })),
        ...rentals.map(r => ({ ...r, type: "rental" }))
      ];

      if (confirmedItems.length === 0) {
        confirmedTable.innerHTML = "<tr><td colspan='10'>No confirmed requests found.</td></tr>";
        return;
      }

      confirmedTable.innerHTML = confirmedItems.map(item => createTableRow(item, "Confirmed")).join("");
    } catch (error) {
      console.error("Error loading confirmed requests:", error);
      confirmedTable.innerHTML = `<tr><td colspan='10'>Failed to load confirmed requests.</td></tr>`;
    }
  }

  // Load Declined Requests
  async function loadDeclined() {
    if (!declinedTable) return;
    declinedTable.innerHTML = "<tr><td colspan='10'>Loading...</td></tr>";

    try {
      const { data: bookings = [], error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "Declined");
      if (bookingsError) throw bookingsError;

      const { data: rentals = [], error: rentalsError } = await supabase
        .from("rentals")
        .select("*")
        .eq("status", "Declined");
      if (rentalsError) throw rentalsError;

      const declinedItems = [
        ...bookings.map(b => ({ ...b, type: "booking" })),
        ...rentals.map(r => ({ ...r, type: "rental" }))
      ];

      if (declinedItems.length === 0) {
        declinedTable.innerHTML = "<tr><td colspan='10'>No declined requests found.</td></tr>";
        return;
      }

      declinedTable.innerHTML = declinedItems.map(item => createTableRow(item, "Declined")).join("");
    } catch (error) {
      console.error("Error loading declined requests:", error);
      declinedTable.innerHTML = `<tr><td colspan='10'>Failed to load declined requests.</td></tr>`;
    }
  }

  // Load Users Table
  async function loadUsers() {
    if (!usersTable) return;
    usersTable.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    try {
      const { data: users = [], error } = await supabase.from("users").select("*");
      if (error) throw error;

      if (users.length === 0) {
        usersTable.innerHTML = "<tr><td colspan='4'>No users found.</td></tr>";
        return;
      }

      usersTable.innerHTML = users.map(u => `
        <tr>
          <td>${u.email || "-"}</td>
          <td>${u.name || u.full_name || "-"}</td>
          <td>${u.amount ? `₱${u.amount}` : "₱0"}</td>
          <td>${u.role || "-"}</td>
        </tr>
      `).join("");
    } catch (error) {
      console.error("Error loading users:", error);
      usersTable.innerHTML = `<tr><td colspan='4'>Failed to load users.</td></tr>`;
    }
  }

  // Load Payments Summary
  async function loadPayments() {
    if (!totalPaidEl || !pendingPaymentsEl || !totalClientsEl || !peoplePaidEl) return;

    try {
      const { data: bookings = [], error: bookingsError } = await supabase.from("bookings").select("*");
      if (bookingsError) throw bookingsError;

      const { data: rentals = [], error: rentalsError } = await supabase.from("rentals").select("*");
      if (rentalsError) throw rentalsError;

      const allItems = [...bookings, ...rentals];

      let totalPaid = 0;
      let totalPending = 0;
      let clientsPaid = 0;
      const clientSet = new Set();

      allItems.forEach(item => {
        if (item.payment === "Paid") {
          totalPaid += Number(item.price || 0);
          clientsPaid++;
        } else {
          totalPending += Number(item.price || 0);
        }
        if (item.email) clientSet.add(item.email);
      });

      totalPaidEl.textContent = `₱${totalPaid.toFixed(2)}`;
      pendingPaymentsEl.textContent = `₱${totalPending.toFixed(2)}`;
      totalClientsEl.textContent = clientSet.size;
      peoplePaidEl.textContent = clientsPaid;
    } catch (error) {
      console.error("Error loading payments summary:", error);
    }
  }

  // Load Reports (Pie Chart for payment status)
  async function loadReports() {
    if (!clientsChartEl) return;

    try {
      const { data: bookings = [], error: bookingsError } = await supabase.from("bookings").select("*");
      if (bookingsError) throw bookingsError;

      const { data: rentals = [], error: rentalsError } = await supabase.from("rentals").select("*");
      if (rentalsError) throw rentalsError;

      const allItems = [...bookings, ...rentals];

      const paymentCounts = { Paid: 0, Unpaid: 0 };
      allItems.forEach(item => {
        if (item.payment === "Paid") paymentCounts.Paid++;
        else paymentCounts.Unpaid++;
      });

      if (typeof Chart === "undefined") {
        console.warn("Chart.js is not loaded. Cannot render reports chart.");
        return;
      }

      // Clear previous chart if any
      if (clientsChartEl.chartInstance) {
        clientsChartEl.chartInstance.destroy();
      }

      clientsChartEl.chartInstance = new Chart(clientsChartEl, {
        type: "pie",
        data: {
          labels: ["Paid", "Unpaid"],
          datasets: [{
            label: "Clients Payment Status",
            data: [paymentCounts.Paid, paymentCounts.Unpaid],
            backgroundColor: ["#4caf50", "#f44336"]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom"
            }
          }
        }
      });
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  }

  // Filter table rows by search input (case-insensitive)
  function filterTable(table, filterValue) {
    const filter = filterValue.toUpperCase();
    const rows = table.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName("td");
      if (cells.length === 0) continue; // Skip if no cells (e.g., loading or no data row)

      // Check Email (0), Name (1), Type (2)
      const emailText = cells[0]?.textContent.toUpperCase() || "";
      const nameText = cells[1]?.textContent.toUpperCase() || "";
      const typeText = cells[2]?.textContent.toUpperCase() || "";

      if (emailText.includes(filter) || nameText.includes(filter) || typeText.includes(filter)) {
        rows[i].style.display = "";
      } else {
        rows[i].style.display = "none";
      }
    }
  }

  // Handle Confirm button click
  async function handleConfirm(button) {
    const id = button.dataset.id;
    const type = button.dataset.type;

    if (!id || !type) {
      alert("Invalid item data.");
      return;
    }

    if (!confirm("Are you sure you want to confirm this request?")) return;

    try {
      const { error } = await supabase
        .from(type === "booking" ? "bookings" : "rentals")
        .update({ status: "Confirmed" })
        .eq("id", id);

      if (error) throw error;

      alert("Request confirmed successfully.");
      await loadAllData();
    } catch (error) {
      console.error("Error confirming request:", error);
      alert("Failed to confirm request.");
    }
  }

  // Handle Decline button click
  async function handleDecline(button) {
    const id = button.dataset.id;
    const type = button.dataset.type;

    if (!id || !type) {
      alert("Invalid item data.");
      return;
    }

    if (!confirm("Are you sure you want to decline this request?")) return;

    try {
      const { error } = await supabase
        .from(type === "booking" ? "bookings" : "rentals")
        .update({ status: "Declined" })
        .eq("id", id);

      if (error) throw error;

      alert("Request declined successfully.");
      await loadAllData();
    } catch (error) {
      console.error("Error declining request:", error);
      alert("Failed to decline request.");
    }
  }

  // Handle Delete button click
  async function handleDelete(button) {
    const id = button.dataset.id;
    const type = button.dataset.type;

    if (!id || !type) {
      alert("Invalid item data.");
      return;
    }

    if (!confirm("Are you sure you want to delete this request? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from(type === "booking" ? "bookings" : "rentals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert("Request deleted successfully.");
      await loadAllData();
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request.");
    }
  }
}