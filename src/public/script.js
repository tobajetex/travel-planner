// src/public/script.js
// Handles all frontend logic: dropdowns, API calls, and UI updates.

// --- DOM References ---
const fromSelect = document.getElementById("from-select");
const toSelect = document.getElementById("to-select");
const searchBtn = document.getElementById("search-btn");
const btnText = document.querySelector(".btn-text");
const btnSpinner = document.querySelector(".btn-spinner");
const messageBox = document.getElementById("message-box");
const resultsSection = document.getElementById("results-section");
const timeline = document.getElementById("timeline");
const totalPrice = document.getElementById("total-price");
const emptyState = document.getElementById("empty-state");

// --- State ---
let airports = [];

// --- Utility: Show/Hide Message ---
function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.classList.add("hidden");
}

// --- Utility: Reset Results ---
function resetResults() {
  resultsSection.classList.add("hidden");
  emptyState.classList.add("hidden");
  timeline.innerHTML = "";
}

// --- 1. LOAD AIRPORTS on page load ---
async function loadAirports() {
  try {
    const response = await fetch("/api/airports");
    if (!response.ok) throw new Error("Failed to fetch airports");
    airports = await response.json();

    // Populate dropdowns
    populateSelect(fromSelect, airports);
    populateSelect(toSelect, airports);

    // Enable the search button
    searchBtn.disabled = false;
    searchBtn.querySelector(".btn-text").textContent = "Find Flights";

    // Set default selections (optional)
    fromSelect.value = "LHR";
    toSelect.value = "SIN";
  } catch (error) {
    console.error(error);
    showMessage(
      "⚠️ Could not load airports. Please refresh the page.",
      "error",
    );
    fromSelect.innerHTML = '<option value="">Error loading</option>';
    toSelect.innerHTML = '<option value="">Error loading</option>';
    searchBtn.disabled = true;
  }
}

function populateSelect(selectElement, airports) {
  selectElement.innerHTML = ""; // Clear loading text
  airports.forEach((airport) => {
    const option = document.createElement("option");
    option.value = airport.code;
    option.textContent = airport.label; // e.g., "London (LHR)"
    selectElement.appendChild(option);
  });
}

// --- 2. HANDLE SEARCH ---
async function handleSearch() {
  const from = fromSelect.value;
  const to = toSelect.value;

  // Validation
  if (!from || !to) {
    showMessage(
      "Please select both a departure and destination airport.",
      "error",
    );
    return;
  }
  if (from === to) {
    showMessage(
      "Origin and destination cannot be the same. Please pick different airports.",
      "error",
    );
    return;
  }

  // --- UI: Loading State ---
  hideMessage();
  resetResults();
  searchBtn.disabled = true;
  btnText.textContent = "Searching...";
  btnSpinner.classList.remove("hidden");

  try {
    const response = await fetch(
      `/api/cheapest-route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );

    if (response.status === 404) {
      // Empty state: No routes found
      emptyState.classList.remove("hidden");
      resultsSection.classList.add("hidden");
      showMessage("No connecting routes found for these cities.", "error");
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Something went wrong");
    }

    const data = await response.json();

    // --- Success: Render the itinerary ---
    renderItinerary(data);
    resultsSection.classList.remove("hidden");
    emptyState.classList.add("hidden");
    hideMessage();
  } catch (error) {
    console.error(error);
    showMessage(`❌ Error: ${error.message}. Please try again later.`, "error");
    resetResults();
  } finally {
    // --- UI: Reset Button ---
    searchBtn.disabled = false;
    btnText.textContent = "Find Flights";
    btnSpinner.classList.add("hidden");
  }
}

// --- 3. RENDER THE ITINERARY ---
function renderItinerary(data) {
  const { totalCost, stops, cityStops, airlines, prices } = data;

  // Display total price
  totalPrice.textContent = `$${totalCost}`;

  // Build the timeline HTML
  let html = "";
  for (let i = 0; i < stops.length; i++) {
    const isOrigin = i === 0;
    const isDestination = i === stops.length - 1;
    let dotClass = "stop";
    if (isOrigin) dotClass = "origin";
    if (isDestination) dotClass = "destination";

    // Flight leg details (for all but the last stop)
    let legHtml = "";
    if (!isDestination) {
      const airline = airlines[i] || "Unknown";
      const price = prices[i] || 0;
      legHtml = `
        <span class="timeline-flight-detail">
          <span class="airline">${airline}</span>
          <span class="price">$${price}</span>
        </span>
      `;
    }

    html += `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}">${i + 1}</div>
        <div class="timeline-content">
          <span class="timeline-airport">
            ${stops[i]} <small>${cityStops[i]}</small>
          </span>
          ${legHtml}
        </div>
      </div>
    `;
  }

  timeline.innerHTML = html;
}

// --- 4. EVENT LISTENERS ---
searchBtn.addEventListener("click", handleSearch);

// Allow "Enter" key to trigger search
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !searchBtn.disabled) {
    handleSearch();
  }
});

// --- 5. INIT ---
loadAirports();
