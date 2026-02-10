let draggedCard = null;


let targetStatus = null;


let sourceColumn = null;


document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("dragstart", () => {
        draggedCard = card;
        sourceColumn = card.parentElement;
        setTimeout(() => card.classList.add("dragging"), 0);
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        draggedCard = null;
    });
});

document.querySelectorAll(".column").forEach(column => {
     // ✅ REQUIRED: allow drop
    column.addEventListener("dragover", e => {
        e.preventDefault();           // 🔥 THIS LINE IS MANDATORY
        column.classList.add("hover");
    });

    column.addEventListener("dragleave", () => {
        column.classList.remove("hover");
    });
    column.addEventListener("drop", () => {
        column.classList.remove("hover");

        const status = column.dataset.status;
        const leadId = draggedCard.dataset.id;

    

        if (status === "ACCEPTED") {
            currentLeadId = leadId;
            openPaymentModal(leadId);
        } else {
            updateStatus(leadId, status);
        }
    });
});



// payment logic
let currentLeadId = null;

function openPaymentModal(leadId) {
    currentLeadId = leadId;
    document.getElementById("paymentModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("paymentModal").style.display = "none";
    updateStatus(currentLeadId, "ACCEPTED");
    
    
}
function closePaymentModal() {
    document.getElementById("paymentModal").style.display = "none";
    currentLeadId = null;
}

function submitPayment() {
     const toast = document.getElementById("paymentToast");
  toast.style.display = "none";
    const total = document.getElementById("totalAmount").value;
    const paid = document.getElementById("paidAmount").value;
      if (!total || !paid) {
    toast.innerText = "Both total amount and advance paid are required";
    toast.style.display = "block";
    return;
  }

    updateStatus(currentLeadId, "ACCEPTED", total, paid);

    const card = document.querySelector(`.card[data-id="${currentLeadId}"]`);
    if (!card) return;

    // Remove quoted row if exists
    const quoted = card.querySelector(".quoted-row");
    if (quoted) quoted.remove();

    // Remove existing paid row
    const existingPaid = card.querySelector(".paid-row");
    if (existingPaid) existingPaid.remove();

    // Add paid amount row (only if entered)
    if (paid) {
        const paidRow = document.createElement("div");
        paidRow.className = "card-row paid-row";
        paidRow.innerHTML = `
            <img src="/static/icons/rupee.svg">
            <span>Paid : ₹ ${paid}</span>
        `;
        card.appendChild(paidRow);
    }

    document.getElementById("paymentModal").style.display = "none";
}


function updateStatus(leadId, status, total=null, paid=null) {

    const csrf = document.getElementById("csrf_token").value;

    fetch("/leads/update-status/", {
        method: "POST",
        headers: {
            "X-CSRFToken": csrf,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            lead_id: leadId,
            status: status,
            total_amount: total || "",
            paid_amount: paid || ""
        })
    }).then(res => res.json())
     .then(data => {
    if (data.success) {
       window.location.reload();

        // FOLLOW UP → show follow-up date instantly
        if (status === "FOLLOW_UP" && data.follow_up_date) {
            addFollowUpUI(leadId, data.follow_up_date);
        }

        // If moved out of FOLLOW_UP → remove follow-up UI
        if (status !== "FOLLOW_UP") {
            removeFollowUpUI(leadId);
        }
    }
});

}

function addFollowUpUI(leadId, date) {
    const card = document.querySelector(`.card[data-id="${leadId}"]`);
    if (!card) return;

    if (card.querySelector(".card-row.danger")) return;

    const row = document.createElement("div");
    row.className = "card-row danger";
    row.innerHTML = `
        <img src="/static/icons/clock.svg">
        <span>${date}</span>
        <small>Due</small>
    `;

    card.appendChild(row);
}

function removeFollowUpUI(leadId) {
    const card = document.querySelector(`.card[data-id="${leadId}"]`);
    if (!card) return;

    const followRow = card.querySelector(".card-row.danger");
    if (followRow) followRow.remove();
}



let currentStep = 0;
const steps = document.querySelectorAll(".form-step");
const stepIndicators = document.querySelectorAll(".progress-step");

function openLeadForm() {
    document.getElementById("leadModal").style.display = "flex";
}

function closeLeadForm() {
    document.getElementById("leadModal").style.display = "none";
}

function nextStep() {
    steps[currentStep].classList.remove("active");
    stepIndicators[currentStep].classList.remove("active");

    currentStep++;

    steps[currentStep].classList.add("active");
    stepIndicators[currentStep].classList.add("active");
}

function prevStep() {
    steps[currentStep].classList.remove("active");
    stepIndicators[currentStep].classList.remove("active");

    currentStep--;

    steps[currentStep].classList.add("active");
    stepIndicators[currentStep].classList.add("active");
}

/* SUBMIT FORM */
document.getElementById("leadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const toast = document.getElementById("formToast");
  toast.style.display = "none";

  const f = this;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!f.client_name.value.trim())
    return showToast("Client name is required");

  if (!f.phone.value.trim())
    return showToast("Phone number is required");

  if (!f.email.value.trim() || !emailRegex.test(f.email.value))
    return showToast("Enter a valid email address");

  if (!f.event_type.value.trim())
    return showToast("Event type is required");

  if (!f.event_start_date.value || !f.event_start_session.value)
    return showToast("Event start date & session required");

  if (!f.event_end_date.value || !f.event_end_session.value)
    return showToast("Event end date & session required");

  if (!f.event_location.value.trim())
    return showToast("Event location is required");

  if (!f.total_amount.value)
    return showToast("Quoted amount is required");

  // ✅ EXISTING LOGIC (UNCHANGED)
  const formData = new FormData(f);
  const csrf = document.getElementById("csrf_token").value;

  fetch("/leads/save/", {
    method: "POST",
    headers: { "X-CSRFToken": csrf },
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) location.reload();
  });

  function showToast(msg) {
    toast.innerText = msg;
    toast.style.display = "block";
  }
});



// status updates
function updateColumnCounts() {
    document.querySelectorAll(".column").forEach(column => {
        const count = column.querySelectorAll(".card").length;
        column.querySelector(".column-head span").innerText = count;
    });
}

// form close button
function closeLeadForm() {
    document.getElementById("leadModal").style.display = "none";

    const form = document.getElementById("leadForm");
    form.reset();

    // clear lead id
    document.getElementById("lead_id").value = "";

    // unlock client fields
    ["client_name", "phone", "email"].forEach(name => {
        const input = document.querySelector(`[name="${name}"]`);
        input.readOnly = false;
    });

    // reset steps
    steps.forEach(step => step.classList.remove("active"));
    stepIndicators.forEach(step => step.classList.remove("active"));

    currentStep = 0;
    steps[0].classList.add("active");
    stepIndicators[0].classList.add("active");
}



// editing lead 
function openEditLead(leadId) {

    openLeadForm();

    fetch(`/leads/get/${leadId}/`)
        .then(res => res.json())
        .then(lead => {

            document.getElementById("lead_id").value = lead.id;

            // CLIENT (READ ONLY)
            const name = document.querySelector('[name="client_name"]');
            const phone = document.querySelector('[name="phone"]');
            const email = document.querySelector('[name="email"]');

            name.value = lead.client_name;
            phone.value = lead.phone;
            email.value = lead.email;

            name.readOnly = true;
            phone.readOnly = true;
            email.readOnly = true;

            // EVENT (EDITABLE)
            document.querySelector('[name="event_type"]').value = lead.event_type;
            document.querySelector('[name="event_start_date"]').value = lead.event_start_date;
            document.querySelector('[name="event_start_session"]').value = lead.event_start_session;
            document.querySelector('[name="event_end_date"]').value = lead.event_end_date;
            document.querySelector('[name="event_end_session"]').value = lead.event_end_session;
            document.querySelector('[name="follow_up_date"]').value = lead.follow_up_date || "";
            document.querySelector('[name="event_location"]').value = lead.event_location;
            document.querySelector('[name="total_amount"]').value = lead.total_amount;

            // go to step 2
            steps[0].classList.remove("active");
            steps[1].classList.add("active");
            stepIndicators[0].classList.remove("active");
            stepIndicators[1].classList.add("active");
            currentStep = 1;
        });
}


// filter 
// OPEN FILTER
document.querySelector(".filter-btn").addEventListener("click", () => {
    document.getElementById("filterDrawer").classList.add("open");
});

// CLOSE FILTER
function closeFilters() {
    document.getElementById("filterDrawer").classList.remove("open");
}

// CLEAR FILTERS
function clearFilters() {
    document
        .querySelectorAll("#filterDrawer input")
        .forEach(input => {
            if (input.type === "checkbox" || input.type === "radio") {
                input.checked = false;
            } else {
                input.value = "";
            }
        });
}
function applyFilters() {
    const params = new URLSearchParams();

    /* 1️⃣ EVENT DATE */
    const eventRange = document.querySelector('input[name="event_date"]:checked');
    if (eventRange) {
        params.set("event_range", eventRange.value); // ✅ backend expects event_range
    }

    const eventFrom = document.getElementById("event_from");
    const eventTo = document.getElementById("event_to");

    if (eventFrom && eventFrom.value) params.set("event_from", eventFrom.value);
    if (eventTo && eventTo.value) params.set("event_to", eventTo.value);

    /* 2️⃣ FOLLOW UP */
    const followUp = document.querySelector('input[name="follow_up"]:checked');
    if (followUp) {
        params.set("follow_up", followUp.value); // backend uses .get()
    }

    /* 3️⃣ STATUS */
    document
        .querySelectorAll('.filter-section input[type="checkbox"][value="NEW"], \
                           .filter-section input[type="checkbox"][value="FOLLOW_UP"], \
                           .filter-section input[type="checkbox"][value="ACCEPTED"], \
                           .filter-section input[type="checkbox"][value="LOST"]')
        .forEach(cb => {
            if (cb.checked) params.append("status", cb.value);
        });

    /* 4️⃣ AMOUNT */
    const amountRadio = document.querySelector('input[name="amount"]:checked');
    if (amountRadio) params.set("amount", amountRadio.value);

    const amountInputs = document.querySelectorAll('.filter-section input[type="number"]');
    if (amountInputs[0]?.value) params.set("min_amount", amountInputs[0].value);
    if (amountInputs[1]?.value) params.set("max_amount", amountInputs[1].value);

    /* 5️⃣ PAYMENT */
    document.querySelectorAll('.filter-section h4')
        .forEach(section => {
            if (section.textContent.includes("Payment")) {
                section.parentElement
                    .querySelectorAll('input[type="checkbox"]:checked')
                    .forEach(cb => {
                        const label = cb.parentElement.textContent.trim().toLowerCase();
                        if (label.includes("fully")) params.set("payment", "full");
                        else if (label.includes("partial")) params.set("payment", "partial");
                        else if (label.includes("not")) params.set("payment", "none");
                    });
            }
        });

    /* 6️⃣ EVENT TYPE */
    document.querySelectorAll('.filter-section h4')
        .forEach(section => {
            if (section.textContent.includes("Event Type")) {
                section.parentElement
                    .querySelectorAll('input[type="checkbox"]:checked')
                    .forEach(cb => {
                        params.append("event_type", cb.parentElement.textContent.trim());
                    });
            }
        });

    /* 7️⃣ PRIORITY */
    document.querySelectorAll(".urgent, .upcoming, .safe")
        .forEach(label => {
            label.onclick = () => {
                if (label.classList.contains("urgent")) params.set("priority", "urgent");
                if (label.classList.contains("upcoming")) params.set("priority", "upcoming");
                if (label.classList.contains("safe")) params.set("priority", "safe");
            };
        });

    /* 8️⃣ SEARCH */
    const searchInput = document.querySelector('.filter-section input[type="text"]');
    if (searchInput && searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }

    closeFilters();

    // 🔥 Redirect with correct params
    window.location.href = `/leads/?${params.toString()}`;
}


// followup reminder
let followupData = {};
let activeTab = "today";

function openFollowup() {
    document.getElementById("followupPanel").classList.add("open");
    loadFollowups();
}

function closeFollowup() {
    document.getElementById("followupPanel").classList.remove("open");
}

function loadFollowups() {
    fetch("/followups/data/")
        .then(res => res.json())
        .then(data => {
            followupData = data;
            document.getElementById("followupTotal").innerText = data.counts.total;
            document.getElementById("countOverdue").innerText = data.counts.overdue;
            document.getElementById("countToday").innerText = data.counts.today;
            document.getElementById("countUpcoming").innerText = data.counts.upcoming;
            renderList();
        });
}

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".followup-tabs button").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    renderList();
}

function renderList() {
    const list = document.getElementById("followupList");
    list.innerHTML = "";

    const items = followupData[activeTab];

    if (!items.length) {
        list.innerHTML = `<div class="followup-empty">🎉 No follow-ups here</div>`;
        return;
    }

    items.forEach(lead => {
        list.innerHTML += `
            <div class="followup-card">
                <h4>${lead.client_name}</h4>
                <p>📞 ${lead.phone}</p>
                <p>📅 ${lead.event_type}</p>
                <p>⏰ ${lead.follow_up_date}</p>
                <div class="card-actions">
                    <button onclick="openEditLead(${lead.id})">Open Lead</button>
                    <button onclick="markDone(${lead.id})">Mark Done</button>
                </div>
            </div>
        `;
    });
}

function markDone(id) {
    fetch("/followups/done/", {
        method: "POST",
        headers: {
            "X-CSRFToken": document.getElementById("csrf_token").value,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ lead_id: id })
    }).then(() => loadFollowups());
}


// notification badge
function loadFollowups() {
    fetch("/followups/data/")
        .then(res => res.json())
        .then(data => {
            followupData = data;

            // PANEL COUNTS
            document.getElementById("followupTotal").innerText = data.counts.total;
            document.getElementById("countOverdue").innerText = data.counts.overdue;
            document.getElementById("countToday").innerText = data.counts.today;
            document.getElementById("countUpcoming").innerText = data.counts.upcoming;

            // 🔔 BADGE UPDATE
            const badge = document.getElementById("followupBadge");
            const total = data.counts.total;

            if (total > 0) {
                badge.innerText = total > 9 ? "9+" : total;
                badge.classList.add("show");
            } else {
                badge.classList.remove("show");
            }

            renderList();
        });
}
// Load badge immediately when page loads
document.addEventListener("DOMContentLoaded", () => {
    loadFollowups();
});


// ===============================
// GLOBAL SEARCH (REUSE FILTER LOGIC)
// ===============================
const globalSearch = document.getElementById("globalSearch");
const filterSearch = document.querySelector(
    '.filter-section input[type="text"]'
);

if (globalSearch && filterSearch) {

    // Press Enter → apply filters
    globalSearch.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            filterSearch.value = globalSearch.value;
            applyFilters();
        }
    });

    // Keep filter drawer input in sync
    globalSearch.addEventListener("input", () => {
        filterSearch.value = globalSearch.value;
    });
}

// ===============================
// SEARCH CLEAR (❌ BUTTON)
// ===============================
const clearBtn = document.getElementById("clearSearch");

if (globalSearch && clearBtn) {

    // show / hide ❌
    globalSearch.addEventListener("input", () => {
        clearBtn.style.display = globalSearch.value ? "block" : "none";
    });

    // ❌ click → reset filters
    clearBtn.addEventListener("click", () => {
        globalSearch.value = "";
        filterSearch.value = "";
        clearBtn.style.display = "none";

        // 🔥 back to unfiltered leads page
        window.location.href = "/leads/";
    });
}


// input restrictions
// ===============================
// INPUT RESTRICTIONS
// ===============================

// Client Name → letters only
document.querySelector('[name="client_name"]')?.addEventListener("input", e => {
  e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
});

// Phone → numbers only
document.querySelector('[name="phone"]')?.addEventListener("input", e => {
  e.target.value = e.target.value.replace(/\D/g, "");
});

// Event Type → text only
document.querySelector('[name="event_type"]')?.addEventListener("input", e => {
  e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
});



// Event Location → text + numbers allowed (NO symbols)
document.querySelector('[name="event_location"]')?.addEventListener("input", e => {
  e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
});

// counter animation
// ===============================
// OVERVIEW COUNTER (ON VIEW)
// ===============================
const overviewSection = document.querySelector(".overview-left");

function animateCounter(el) {
  const target = parseInt(el.innerText.replace(/[^\d]/g, ""), 10);
  if (isNaN(target)) return;

  let current = 0;
  const increment = Math.ceil(target / 40);

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.innerText = el.innerText.includes("₹")
        ? `₹ ${target}`
        : target;
      clearInterval(timer);
    } else {
      el.innerText = el.innerText.includes("₹")
        ? `₹ ${current}`
        : current;
    }
  }, 25);
}

if (overviewSection) {
  const observer = new IntersectionObserver(
    entries => {
      if (entries[0].isIntersecting) {
        overviewSection
          .querySelectorAll(".stats strong")
          .forEach(animateCounter);
        observer.disconnect(); // run once
      }
    },
    { threshold: 0.4 }
  );

  observer.observe(overviewSection);
}

