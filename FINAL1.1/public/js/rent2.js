import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabaseUrl = "https://rxyhvltcvporwvkysstc.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eWh2bHRjdnBvcnd2a3lzc3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzU2NjksImV4cCI6MjA3MzM1MTY2OX0.we1I_TA421YdD6wJwxvcucqSEnToSD0i9MQ3JNoAexU"

export const supabase = createClient(supabaseUrl, supabaseKey)

// Elements
const durationEl = document.getElementById("rental-duration");
const priceEl = document.getElementById("rental-price");
const dateEl = document.getElementById("rental-date");
const fullnameEl = document.getElementById("fullname");
const phoneEl = document.getElementById("phone");
const emailEl = document.getElementById("email");
const participantsEl = document.getElementById("participants");
const confirmBtn = document.querySelector(".paynow");

// Get rental info from URL
const params = new URLSearchParams(window.location.search);
const rentalId = params.get("id");
const duration = params.get("duration");
const price = params.get("price");
const class_date = params.get("class_date");

// Display rental info
durationEl.textContent = duration || "-";
priceEl.textContent = price ? `₱${price}` : "-";
dateEl.textContent = class_date || "-";

// Phone validation
phoneEl.addEventListener("input", () => {
  phoneEl.value = phoneEl.value.replace(/[^0-9]/g, "").slice(0, 11);
});

// Confirm booking
confirmBtn.addEventListener("click", async () => {
  // Validation
  if (!fullnameEl.value || !emailEl.value || !phoneEl.value || phoneEl.value.length !== 11) {
    alert("⚠️ Fill all fields correctly (phone must be 11 digits).");
    return;
  }

  if (!rentalId) {
    alert("❌ Rental ID not found in URL!");
    return;
  }

  try {
    // Update rental in Supabase
    const { data, error } = await supabase
      .from("rentals")
      .update({
        full_name: fullnameEl.value,
        email: emailEl.value,
        phone: phoneEl.value,
        participants: participantsEl.value,
        booked: true,
        status: "Pending"
      })
      .eq("id", rentalId)
      .select(); // select returns the updated row for debugging

    if (error) {
      console.error("Supabase update error:", error);
      alert("❌ Failed to book rental. See console for details.");
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No row was updated. Rental ID may be invalid:", rentalId);
      alert("❌ Booking failed. Rental ID not found.");
      return;
    }

    console.log("Booking successful:", data);
    alert("✅ Rental booked successfully!");
    window.location.href = "rent.html"; // return to rentals page

  } catch (err) {
    console.error("Unexpected error:", err);
    alert("❌ Unexpected error occurred. Check console.");
  }
});
