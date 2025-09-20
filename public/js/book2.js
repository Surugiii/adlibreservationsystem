import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabaseUrl = "https://rxyhvltcvporwvkysstc.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eWh2bHRjdnBvcnd2a3lzc3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzU2NjksImV4cCI6MjA3MzM1MTY2OX0.we1I_TA421YdD6wJwxvcucqSEnToSD0i9MQ3JNoAexU"

export const supabase = createClient(supabaseUrl, supabaseKey)

document.getElementById("bookBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const name = document.getElementById("name").value;
  const details = document.getElementById("details").value;
  const datetime = document.getElementById("datetime").value;

  const { data, error } = await supabase
    .from("bookings")
    .insert([{ email, name, details, datetime, status: "Pending" }]);

  if (error) {
    alert("Error booking: " + error.message);
  } else {
    alert("Booking request submitted!");
  }
});