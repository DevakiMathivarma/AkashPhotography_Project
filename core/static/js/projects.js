let draggedCard = null;
let pendingColumn = null;

/* ===================================== */
/* INITIAL ASSIGN INFO POPUP */
/* ===================================== */
window.addEventListener("load", () => {
    const popup = document.getElementById("assignPopup");
    if (popup && Number(popup.dataset.count) > 0) {
        popup.style.display = "flex";
    }
});

function closePopup() {
    document.getElementById("assignPopup").style.display = "none";
}

/* ===================================== */
/* DRAG START */
/* ===================================== */
document.querySelectorAll(
    '.project-column[data-status="ASSIGNED"] .project-card'
).forEach(card => {
    card.addEventListener("dragstart", () => {
        draggedCard = card;
        setTimeout(() => card.classList.add("dragging"), 0);
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });
});

/* ===================================== */
/* DROP HANDLING */
/* ===================================== */
document.querySelectorAll(".project-column").forEach(column => {

    column.addEventListener("dragover", e => {
        e.preventDefault();
        column.classList.add("hover");
    });

    column.addEventListener("dragleave", () => {
        column.classList.remove("hover");
    });

    column.addEventListener("drop", () => {
        column.classList.remove("hover");

        if (!draggedCard) return;

        const targetStatus = column.dataset.status;

        if (targetStatus === "ASSIGNED") return;

        if (targetStatus === "PRE") {
            pendingColumn = column;
            openTeamPopup();   // 🔥 DB-driven
            return;
        }

        moveCard(targetStatus);
        column.appendChild(draggedCard);
        draggedCard.setAttribute("draggable", "false");
        draggedCard = null;
    });
});

/* ===================================== */
/* TEAM POPUP — FETCH FROM DATABASE */
/* ===================================== */
// function openTeamPopup() {
//   if (!draggedCard) {
//     console.error("❌ draggedCard is null — drag not started");
//     return;
//   }

//   const projectId = draggedCard.dataset.id;

//   if (!projectId) {
//     console.error("❌ Project ID missing on dragged card", draggedCard);
//     return;
//   }
//     const popup = document.getElementById("teamAssignPopup");
//     const projectId = draggedCard.dataset.id;

//     fetch(`/projects/details/${projectId}/`)
//         .then(res => res.json())
//         .then(data => {

//             document.getElementById("popupClient").innerText =
//                 data.client_name;

//             document.getElementById("popupLocation").innerText =
//                 data.location;

//             document.getElementById("popupTime").innerText =
//                 data.start_session;

//             document.getElementById("popupDuration").innerText =
//                 data.event_type;

//             document.getElementById("popupDates").innerText =
//                 `${data.start_date} — ${data.end_date}`;

//             popup.style.display = "flex";
//             renderTeamMembers(data);
//             document.querySelectorAll(".member-pill.selectable:not(.booked)").forEach(pill => {
//   const name = pill.dataset.name;
//   const role = pill.dataset.role;
//   pill.dataset.tooltip = `${name}\n${role}`;
// });
//         })
//         .catch(err => {
//             console.error("Project fetch failed", err);
//         });
// }
function openTeamPopup() {
  if (!draggedCard) {
    console.error("❌ draggedCard is null — drag not started");
    return;
  }

  const projectId = draggedCard.dataset.id;

  if (!projectId) {
    console.error(
      "❌ Project ID missing on dragged card",
      draggedCard
    );
    return;
  }

  const popup = document.getElementById("teamAssignPopup");

  fetch(`/projects/details/${projectId}/`)
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to fetch project details");
      }
      return res.json();
    })
    .then(data => {
      document.getElementById("popupClient").innerText =
        data.client_name || "";

      document.getElementById("popupLocation").innerText =
        data.location || "";

      document.getElementById("popupTime").innerText =
        data.start_session || "";

      document.getElementById("popupDuration").innerText =
        data.event_type || "";

      document.getElementById("popupDates").innerText =
        `${data.start_date} — ${data.end_date}`;

      popup.style.display = "flex";
      console.log(data);
      console.log("project");

      // existing logic
      renderTeamMembers(data);

      // tooltip for AVAILABLE members
      document
        .querySelectorAll(".member-pill.selectable:not(.booked)")
        .forEach(pill => {
          const name = pill.dataset.name || "";
          const role = pill.dataset.role || "";
          pill.dataset.tooltip = `${name}\n${role}`;
        });
    })
    .catch(err => {
      console.error("❌ Project fetch failed", err);
    });
}

function renderMembers(list, container, booked=false) {
  container.innerHTML = "";

  list.forEach(m => {
    const pill = document.createElement("span");
    pill.className = "member-pill selectable";
    pill.dataset.id = m.id;
    pill.dataset.name = m.name;
    pill.dataset.role = m.role;

    if (booked) {
      pill.classList.add("booked");
      pill.dataset.booking = m.booked_info;
    }

    pill.innerText = m.name.slice(0,2).toUpperCase();
    container.appendChild(pill);
  });
}


function closeTeamPopup() {
    document.getElementById("teamAssignPopup").style.display = "none";
}

/* ===================================== */
/* PROCEED TO TASKS */
/* ===================================== */
function proceedToTasks() {
    // 1️⃣ collect selected members
    const selectedMembers = Array.from(
        document.querySelectorAll(".member-pill.selected")
    ).map(pill => pill.dataset.id);

    // 2️⃣ save team to DB
    fetch("/projects/assign-team/", {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken(),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            project_id: draggedCard.dataset.id,
            members: selectedMembers.join(",")
        })
    })
    .then(res => res.json())
    .then(() => {
        // 3️⃣ open task popup AFTER saving team
        closeTeamPopup();

        currentProjectId = draggedCard.dataset.id;
        document.getElementById("taskPopup").style.display = "flex";
        loadTasks(currentProjectId);
    });
}


/* ===================================== */
/* TASK POPUP */
/* ===================================== */
function closeTaskPopup() {
    document.getElementById("taskAssignPopup").style.display = "none";
}

/* ===================================== */
/* FINAL CONFIRM */
/* ===================================== */
function finishAssignment() {
    closeTaskPopup();

    if (!pendingColumn || !draggedCard) return;

    pendingColumn.appendChild(draggedCard);
    draggedCard.setAttribute("draggable", "false");

    moveCard("PRE");

    draggedCard = null;
    pendingColumn = null;
}

/* ===================================== */
/* BACKEND STATUS UPDATE */
/* ===================================== */
function moveCard(status) {
    fetch("/projects/update-status/", {
        method: "POST",
        headers: {
            "X-CSRFToken": document.getElementById("csrf_token").value,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            project_id: draggedCard.dataset.id,
            status: status
        })
    });
}

// Tabs toggle
document.querySelectorAll(".figma-tabs span").forEach(tab => {
  tab.addEventListener("click", () => {

    document.querySelectorAll(".figma-tabs span")
      .forEach(t => t.classList.remove("active"));

    tab.classList.add("active");

    const available = document.querySelector(".team-available");
    const booked = document.querySelector(".team-booked");

    if (tab.dataset.tab === "available") {
      available.style.display = "block";
      booked.style.display = "none";
    }

    else {
      available.style.display = "none";
      booked.style.display = "block";
    }
  });
});



// Member select
// document.addEventListener("click", e => {
// if (e.target.classList.contains("member-pill")) {
//   e.target.classList.toggle("selected");

//   if (e.target.classList.contains("booked")) {
//     showWarningToast("⚠ This member is booked on another session");
//   }
// }

// });

document.addEventListener("click", e => {
  if (!e.target.classList.contains("member-pill")) return;

  if (e.target.classList.contains("booked")) {
    showWarningToast("⚠ This member is booked on another session");
  }

  e.target.classList.toggle("selected");
});


let currentProjectId = null;
let projectTeam = [];
let pendingTaskUpdates = {};    


function closeTaskPopup() {
    document.getElementById("taskPopup").style.display = "none";
}

/* ================= LOAD TASKS ================= */
function loadTasks(projectId) {
    fetch(`/projects/${projectId}/tasks/`)
        .then(res => res.json())
        .then(data => {
            projectTeam = data.team_members || [];
            renderTasks(data.tasks || {});
        });
}
function setText(element, html) {
  if (!element) return;
  element.innerHTML = html;
}
function updateStatusUI(taskId, status) {
  const statusBox = document.getElementById(`status-${taskId}`);
  if (!statusBox) return;

  // reset classes
  statusBox.className = `dropdown status ${status}`;

  // update label
  statusBox.querySelector(".dropdown-trigger").innerText =
    status.replace("_", " ");
}

function renderTasks(taskGroups) {
  const container = document.getElementById("taskContainer");

  container.innerHTML = `
    <div class="task-table-header">
      <span>Task ID</span>
      <span>Task Name</span>
      <span>Assigned To</span>
      <span>Status</span>
      <span>Start Date</span>
      <span>Due Date</span>
      <span>Progress</span>
      <span>Actions</span>
    </div>
  `;

  Object.keys(taskGroups).forEach(phase => {
    const tasks = taskGroups[phase];

    container.innerHTML += `
      <div class="task-phase-strip">
        📁 ${formatPhase(phase)} (${tasks.length})
      </div>
    `;

    tasks.forEach(task => {
      const assigned = projectTeam.find(m => m.id === task.assigned_to_id);
      const progress = task.progress || 40;

      container.innerHTML += `
        <div class="task-row" data-task-id="${task.id}">

          <!-- ID -->
          <div>${task.code}</div>

          <!-- TITLE -->
          <div>
            <span class="task-title" contenteditable
              oninput="queueUpdate(${task.id},{title:this.innerText})">
              ${task.title}
            </span>
          </div>

          <!-- ASSIGNED -->
          <div>
            <div class="dropdown">
              <div class="dropdown-trigger assigned-box" id="assign-${task.id}">
                ${assigned
                  ? `<span class="avatar">${assigned.name[0]}</span><span>${assigned.name}</span>`
                  : `<span class="unassigned">Unassigned</span>`
                }
              </div>

              <div class="dropdown-menu">
                <div onclick="
                  queueUpdate(${task.id},{assigned_to:''});
                  setText(
                    document.getElementById('assign-${task.id}'),
                    '<span class=unassigned>Unassigned</span>'
                  );
                ">Unassigned</div>

                ${projectTeam.map(m => `
                  <div onclick="
                    queueUpdate(${task.id},{assigned_to:${m.id}});
                    setText(
                      document.getElementById('assign-${task.id}'),
                      '<span class=avatar>${m.name[0]}</span><span>${m.name}</span>'
                    );
                  ">
                    <span class="avatar">${m.name[0]}</span>${m.name}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- STATUS -->
          <div>
            <div class="dropdown status ${task.status}" id="status-${task.id}">
              <div class="dropdown-trigger">
                ${task.status.replace("_"," ")}
              </div>
              <div class="dropdown-menu">
                <div onclick="
                  queueUpdate(${task.id},{status:'OPEN'});
                  updateStatusUI(${task.id}, 'OPEN');
                ">Open</div>

                <div onclick="
                  queueUpdate(${task.id},{status:'ON_HOLD'});
                  updateStatusUI(${task.id}, 'ON_HOLD');
                ">On Hold</div>

                <div onclick="
                  queueUpdate(${task.id},{status:'COMPLETED'});
                  updateStatusUI(${task.id}, 'COMPLETED');
                ">Completed</div>
              </div>
            </div>
          </div>

          <!-- START -->
          <div>
            <input type="date"
              value="${task.start_date || ""}"
              onchange="queueUpdate(${task.id},{start_date:this.value})">
          </div>

          <!-- DUE -->
          <div>
            <input type="date"
              value="${task.due_date || ""}"
              onchange="queueUpdate(${task.id},{due_date:this.value})">
          </div>

          <!-- PROGRESS -->
          <div>
            <div class="progress">
              <span style="width:${progress}%"></span>
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="task-actions">
            <button class="save-btn" onclick="saveTask(${task.id})">✔</button>
            <button class="delete-btn" onclick="deleteTask(${task.id})">🗑</button>
          </div>

        </div>
      `;
    });

    container.innerHTML += `
      <button class="task-add-btn" onclick="addTask('${phase}')">
        + Add Task
      </button>
    `;
  });
}


function queueUpdate(taskId, data) {
  if (!pendingTaskUpdates[taskId]) {
    pendingTaskUpdates[taskId] = {};
  }
  Object.assign(pendingTaskUpdates[taskId], data);
}

/* SAVE ON ✔ CLICK */
function saveTask(taskId) {
  if (!pendingTaskUpdates[taskId]) {
    return;
  }

  fetch("/projects/tasks/update/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      task_id: taskId,
      ...pendingTaskUpdates[taskId]
    })
  })
  .then(res => res.json())
 .then(() => {
  delete pendingTaskUpdates[taskId];

  const toast = document.getElementById("saveToast");
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 1500);

  loadTasks(currentProjectId);
});
}
function applyImmediateUI(taskId, field, value, labelHTML) {
  const row = document.querySelector(`[data-task-id="${taskId}"]`);
  if (!row) return;

  if (field === "assigned_to") {
    row.querySelector(".assigned-box").innerHTML = labelHTML;
  }

  if (field === "status") {
    const statusBox = row.querySelector(".status");
    statusBox.className = `dropdown status ${value}`;
    statusBox.querySelector(".dropdown-trigger").innerText =
      value.replace("_", " ");
  }
}



/* ================= TASK ACTIONS ================= */
function addTask(phase) {
    fetch("/projects/tasks/add/", {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken(),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            project_id: currentProjectId,
            title: "New Task",
            phase: phase
        })
    }).then(() => loadTasks(currentProjectId));
}

function editTask(id, title) {
    updateTask(id, { title });
}

function assignTask(id, member) {
    updateTask(id, { assigned_to: member });
}

function updateTask(id, data) {
  fetch("/projects/tasks/update/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      task_id: id,
      ...data
    })
  });
}

function deleteTask(id) {
  fetch("/projects/tasks/delete/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ task_id: id })
  }).then(() => loadTasks(currentProjectId));
}


/* ================= FINAL SAVE ================= */
function finishAssignment() {
    closeTaskPopup();
    moveCard("PRE");
     setTimeout(() => {
        window.location.reload();
    }, 100);
}

/* ================= HELPERS ================= */
function csrfToken() {
    return document.getElementById("csrf_token").value;
}

function formatPhase(phase) {
    return phase.replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
}


// pre production inprogres cliking popup
/* ============================= */
/* OPEN TASKS FROM PRE CARD */
/* ============================= */
document.addEventListener("click", e => {
  const card = e.target.closest(".pre-card");
  if (!card) return;

  currentProjectId = card.dataset.id;
  document.getElementById("taskPopup").style.display = "flex";
  loadTasks(currentProjectId);
});


/* =============================== */
/* BOARD ↔ LIST VIEW TOGGLE */
/* =============================== */

document.addEventListener("DOMContentLoaded", () => {

  const toolbarItems = document.querySelectorAll(".project-toolbar span");
  const boardBtn = toolbarItems[0]; // ▦ Board View
  const listBtn  = toolbarItems[1]; // ☰ List View

  const boardView = document.getElementById("boardView");
  const listView  = document.getElementById("listView");

  // ---- INITIAL STATE ----
  boardView.style.display = "block";
  listView.style.display = "none";
  boardView.classList.add("view-active");

  // ---- BOARD VIEW CLICK ----
  boardBtn.addEventListener("click", () => {
    if (boardBtn.classList.contains("active")) return;

    // toolbar state
    boardBtn.classList.add("active");
    listBtn.classList.remove("active");

    // view switch
    listView.classList.remove("view-active");
    boardView.classList.add("view-active");

    // animation-safe toggle
    listView.style.display = "none";
    boardView.style.display = "block";
  });

  // ---- LIST VIEW CLICK ----
  listBtn.addEventListener("click", () => {
    if (listBtn.classList.contains("active")) return;

    // toolbar state
    listBtn.classList.add("active");
    boardBtn.classList.remove("active");

    // view switch
    boardView.classList.remove("view-active");
    listView.classList.add("view-active");

    // animation-safe toggle
    boardView.style.display = "none";
    listView.style.display = "block";
  });

});

/* ============================= */
/* LIST ROW → OPEN TASK POPUP */
/* ============================= */
document.addEventListener("click", e => {
  const row = e.target.closest(".list-row");
  if (!row) return;

  const projectId = row.dataset.projectId;
  if (!projectId) return;

  currentProjectId = projectId;

  // open popup
  document.getElementById("taskPopup").style.display = "flex";
  loadTasks(currentProjectId);
});


/* =============================== */
/* PROJECT OVERVIEW TOGGLE */
/* =============================== */

document.addEventListener("DOMContentLoaded", () => {

  const toolbar = document.querySelectorAll(".project-toolbar span");

  const boardView = document.getElementById("boardView");
  const listView = document.getElementById("listView");
  const overviewView = document.getElementById("overviewView");

  // Projects Overview click
  toolbar[2].addEventListener("click", () => {

    toolbar.forEach(t => t.classList.remove("active"));
    toolbar[2].classList.add("active");

    boardView.style.display = "none";
    listView.style.display = "none";
    overviewView.style.display = "block";
  });

});

/* =============================== */
/* OVERVIEW TAB SWITCH */
/* =============================== */

document.addEventListener("click", e => {
  if (!e.target.closest(".overview-tabs span")) return;

  document.querySelectorAll(".overview-tabs span")
    .forEach(t => t.classList.remove("active"));

  document.querySelectorAll(".overview-table")
    .forEach(t => t.classList.remove("active"));

  e.target.classList.add("active");

  const tab = e.target.dataset.tab;
  document.getElementById(
    tab === "internal"
      ? "overview-internal"
      : "overview-client"
  ).classList.add("active");
});


/* ============================= */
/* SELECTION CHIP UPDATE (FUTURE) */
/* ============================= */

function markGalleryLinkCompleted(projectId) {
  const card = document.querySelector(
    `.selection-card[data-id="${projectId}"]`
  );
  if (!card) return;

  const chip = card.querySelector(".selection-chip:first-child");
  chip.classList.remove("selection-pending");
  chip.classList.add("selection-complete");
  chip.innerText = "1 / 1 Gallery Link";
}

function markSelectionLinkCompleted(projectId) {
  const card = document.querySelector(
    `.selection-card[data-id="${projectId}"]`
  );
  if (!card) return;

  const chip = card.querySelectorAll(".selection-chip")[1];
  chip.classList.remove("selection-pending");
  chip.classList.add("selection-complete");
  chip.innerText = "1 / 1 Selection Link";
}
function renderTeamMembers(data) {
  const bookedBox = document.querySelector(".team-booked .pill-row");
  bookedBox.innerHTML = "";

  data.booked_members.forEach(m => {
    const pill = document.createElement("span");
    pill.className = "member-pill booked selectable";
    pill.dataset.id = m.id;

    pill.title = `${m.name}\n${m.role}\n${m.booked_info || ""}`;

    // 👇 initials computed here
    pill.innerText = m.name
      .split(" ")
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    bookedBox.appendChild(pill);
  });
}



function createMemberPill(member, isBooked) {
  const pill = document.createElement("span");
  pill.className = "member-pill selectable";
  pill.dataset.id = member.id;
  pill.innerText = member.initials;

  if (isBooked) {
    pill.classList.add("booked");
    pill.dataset.tooltip =
      `${member.name} (${member.role})
Booked on ${member.booked_on}
${member.project_code} – ${member.event_type}`;
  }

  document.querySelector(".pill-row").appendChild(pill);
}

function validateAndProceed() {
  const selected = document.querySelectorAll(".member-pill.selected");
  const date = document.querySelector(".figma-date").value;

  if (!selected.length) {
    showWarningToast("Please select team members");
    return;
  }

  if (!date) {
    showWarningToast("Date is required");
    return;
  }

  proceedToTasks(); // EXISTING function
}


function showWarningToast(message) {
  let toast = document.getElementById("warnToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "warnToast";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "#b3261e";
    toast.style.color = "#fff";
    toast.style.padding = "10px 18px";
    toast.style.borderRadius = "10px";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "10000";
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2000);
}


/* ========================================= */
/* FIX: TOOLBAR STATE CONFLICT (SAFE PATCH) */
/* ========================================= */

document.addEventListener("DOMContentLoaded", () => {

  const toolbarSpans = document.querySelectorAll(".project-toolbar span");

  const boardSpan    = toolbarSpans[0];
  const listSpan     = toolbarSpans[1];
  const overviewSpan = toolbarSpans[2];

  const boardView    = document.getElementById("boardView");
  const listView     = document.getElementById("listView");
  const overviewView = document.getElementById("overviewView");

  function deactivateOverview() {
    overviewSpan.classList.remove("active");
    overviewView.style.display = "none";
  }

  boardSpan.addEventListener("click", () => {
    deactivateOverview();
  });

  listSpan.addEventListener("click", () => {
    deactivateOverview();
  });

});

// filter panel 
/* ===============================
   FILTER STATE
================================ */

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

let currentDate  = new Date();
let currentMonth = currentDate.getMonth();
let currentYear  = currentDate.getFullYear();

let monthLabel = null;
let yearLabel  = null;
let filterOverlay = null;

/* ===============================
   INIT (DOM SAFE)
================================ */
document.addEventListener("DOMContentLoaded", () => {

  monthLabel    = document.getElementById("monthLabel");
  yearLabel     = document.getElementById("yearLabel");
  filterOverlay = document.getElementById("filterOverlay");

  updateMonthYearUI();

  /* FILTER BUTTON CLICK */
  const toolbarItems = document.querySelectorAll(".project-toolbar > div");
  const filterBtn = toolbarItems[3]; // Filters button

  if (filterBtn) {
    filterBtn.addEventListener("click", openFilter);
  }
});

/* ===============================
   UI UPDATE
================================ */
function updateMonthYearUI() {
  if (!monthLabel || !yearLabel) return;

  monthLabel.innerText = months[currentMonth];
  yearLabel.innerText  = currentYear;
}

/* ===============================
   MONTH CONTROLS
================================ */
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  updateMonthYearUI();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateMonthYearUI();
}

/* ===============================
   YEAR CONTROLS
================================ */
function prevYear() {
  currentYear--;
  updateMonthYearUI();
}

function nextYear() {
  currentYear++;
  updateMonthYearUI();
}

/* ===============================
   FILTER OPEN / CLOSE
================================ */
function openFilter() {
  if (!filterOverlay) {
    console.error("❌ filterOverlay not found");
    return;
  }
  filterOverlay.style.display = "flex";
}

function closeFilter() {
  if (!filterOverlay) return;
  filterOverlay.style.display = "none";
}

/* ===============================
   APPLY FILTER (SERVER RENDER)
================================ */
function applyFilter() {

  const fromDate = document.getElementById("fromDate")?.value || "";
  const toDate   = document.getElementById("toDate")?.value || "";

  /* STATUS (checkboxes) */
  const statuses = Array.from(
    document.querySelectorAll(
      '.filter-section input[type="checkbox"]:checked'
    )
  ).map(cb => cb.value);

  /* COMPLETION */
  const completion =
    document.querySelector('input[name="completion"]:checked')?.value || "ALL";

  /* BUILD QUERY */
  const params = new URLSearchParams();

  params.append("month", currentMonth + 1);
  params.append("year", currentYear);

  if (fromDate && toDate) {
    params.append("from_date", fromDate);
    params.append("to_date", toDate);
  }

  statuses.forEach(s => params.append("status", s));

  if (completion !== "ALL") {
    params.append("completion", completion);
  }

  /* 🔥 FULL PAGE RELOAD (SAFE WITH DJANGO TEMPLATE) */
  window.location.href = `/projects/?${params.toString()}`;
}

/* ===============================
   RESET FILTER
================================ */
function resetFilter() {

  currentDate  = new Date();
  currentMonth = currentDate.getMonth();
  currentYear  = currentDate.getFullYear();

  updateMonthYearUI();

  const fromDate = document.getElementById("fromDate");
  const toDate   = document.getElementById("toDate");

  if (fromDate) fromDate.value = "";
  if (toDate)   toDate.value = "";

  document
    .querySelectorAll('.filter-section input[type="checkbox"]')
    .forEach(cb => cb.checked = false);

  const allRadio = document.querySelector(
    'input[name="completion"][value="ALL"]'
  );
  if (allRadio) allRadio.checked = true;

  /* RESET VIEW */
  window.location.href = "/projects/";
}
