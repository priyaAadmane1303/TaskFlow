
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "tasks";
const USER_KEY = "taskflowUser";

let tasks = loadTasks();
let user = localStorage.getItem(USER_KEY) || "";
let calendarDate = new Date();
let selectedDate = dateKey(new Date());
let toastTimer;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "No due date";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

/* LOGIN AND PROFILE */

function updateUserUI() {
  const displayName = user || "User";
  $("profileName").textContent = displayName;
  $("welcomeName").textContent = displayName;
  $("avatar").textContent = displayName.charAt(0).toUpperCase();
  $("profileNameInput").value = displayName;
}

function updateLoginView() {
  const loggedIn = Boolean(user);
  $("loginPage").hidden = loggedIn;
  $("app").hidden = !loggedIn;

  if (loggedIn) {
    updateUserUI();
    updateDashboard();
    renderTasks();
    renderCalendar();
    renderNotifications();
  }
}

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  user = $("loginName").value.trim();
  if (!user) return;
  localStorage.setItem(USER_KEY, user);
  updateLoginView();
  showToast("Welcome to TaskFlow!");
});

$("profileBtn").addEventListener("click", () => {
  $("profilePanel").hidden = !$("profilePanel").hidden;
  $("notificationPanel").hidden = true;
});

$("profileForm").addEventListener("submit", event => {
  event.preventDefault();
  const newName = $("profileNameInput").value.trim();
  if (!newName) return;

  user = newName;
  localStorage.setItem(USER_KEY, user);
  updateUserUI();
  $("profilePanel").hidden = true;
  showToast("Profile updated!");
});

$("logoutBtn").addEventListener("click", () => {
  user = "";
  localStorage.removeItem(USER_KEY);
  $("profilePanel").hidden = true;
  $("notificationPanel").hidden = true;
  $("loginName").value = "";
  updateLoginView();
});

/* PAGE NAVIGATION */

const pageDetails = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Here's your productivity overview."
  },
  tasks: {
    title: "My Tasks",
    subtitle: "Create and manage your tasks."
  },
  calendar: {
    title: "Calendar",
    subtitle: "Your monthly schedule at a glance."
  }
};

function showPage(pageName) {
  if (!pageDetails[pageName]) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  $(pageName + "Page").classList.add("active-page");

  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  $("pageHeading").textContent = pageDetails[pageName].title;
  $("pageSubtitle").textContent = pageDetails[pageName].subtitle;

  $("profilePanel").hidden = true;
  $("notificationPanel").hidden = true;

  if (pageName === "dashboard") updateDashboard();
  if (pageName === "tasks") renderTasks();
  if (pageName === "calendar") renderCalendar();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

/* TASKS */

function getTaskById(id) {
  return tasks.find(task => String(task.id) === String(id));
}

function resetTaskForm() {
  $("taskForm").reset();
  $("editTaskId").value = "";
  $("taskPriority").value = "Medium";
  $("formHeading").textContent = "Add a New Task";
  $("saveTaskBtn").textContent = "Add Task";
  $("cancelEditBtn").hidden = true;
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  if (!title) return;

  const editId = $("editTaskId").value;
  const priority = $("taskPriority").value;
  const dueDate = $("taskDueDate").value;

  if (editId) {
    const task = getTaskById(editId);
    if (!task) return;

    task.title = title;
    task.priority = priority;
    task.dueDate = dueDate;
    showToast("Task updated!");
  } else {
    tasks.unshift({
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      title,
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    });
    showToast("Task added!");
  }

  saveTasks();
  resetTaskForm();
  refreshAll();
});

$("cancelEditBtn").addEventListener("click", resetTaskForm);

function editTask(id) {
  const task = getTaskById(id);
  if (!task) return;

  $("editTaskId").value = task.id;
  $("taskTitle").value = task.title;
  $("taskPriority").value = task.priority || "Medium";
  $("taskDueDate").value = task.dueDate || "";
  $("formHeading").textContent = "Edit Task";
  $("saveTaskBtn").textContent = "Save Changes";
  $("cancelEditBtn").hidden = false;

  $("taskForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleTask(id) {
  const task = getTaskById(id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  refreshAll();
  showToast(task.completed ? "Task completed!" : "Task marked pending.");
}

function deleteTask(id) {
  const task = getTaskById(id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"?`)) return;

  tasks = tasks.filter(item => String(item.id) !== String(id));
  saveTasks();

  if ($("editTaskId").value === String(id)) resetTaskForm();

  refreshAll();
  showToast("Task deleted.");
}

function taskHTML(task) {
  const completedClass = task.completed ? "completed" : "";
  const title = escapeHTML(task.title);
  const priority = ["High", "Medium", "Low"].includes(task.priority)
    ? task.priority
    : "Medium";

  return `
    <article class="task-item ${completedClass}">
      <input class="task-check" type="checkbox"
        aria-label="Mark ${title} completed"
        ${task.completed ? "checked" : ""}
        data-action="toggle" data-id="${escapeHTML(task.id)}">

      <div class="task-details">
        <div class="task-title">${title}</div>
        <div class="task-meta">
          <span class="priority ${priority}">${priority} Priority</span>
          <span>Due: ${formatDate(task.dueDate)}</span>
        </div>
      </div>

      <div class="task-actions">
        <button type="button" data-action="edit" data-id="${escapeHTML(task.id)}">Edit</button>
        <button type="button" class="delete-btn"
          data-action="delete" data-id="${escapeHTML(task.id)}">Delete</button>
      </div>
    </article>
  `;
}

function renderTaskContainer(container, list) {
  container.innerHTML = list.length
    ? list.map(taskHTML).join("")
    : '<div class="empty-state">No tasks here yet.</div>';
}

function renderTasks() {
  const search = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const priority = $("priorityFilter").value;
  const sort = $("sortFilter").value;

  let filtered = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search);
    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.completed) ||
      (status === "pending" && !task.completed);
    const matchesPriority = priority === "all" || task.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  filtered.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    }

    if (sort === "dueDate") {
      return (a.dueDate || "9999-12-31").localeCompare(
        b.dueDate || "9999-12-31"
      );
    }

    if (sort === "priority") {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
    }

    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  renderTaskContainer($("taskList"), filtered);
  renderTaskContainer($("recentTasks"), tasks.slice(0, 5));
}

document.querySelectorAll("#searchInput, #statusFilter, #priorityFilter, #sortFilter")
  .forEach(input => {
    input.addEventListener(input.id === "searchInput" ? "input" : "change", renderTasks);
  });

document.addEventListener("click", event => {
  const control = event.target.closest("[data-action]");
  if (!control) return;

  const { action, id } = control.dataset;
  if (action === "toggle") toggleTask(id);
  if (action === "edit") editTask(id);
  if (action === "delete") deleteTask(id);
});

/* DASHBOARD SUMMARY */

function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const today = dateKey(new Date());

  const overdue = tasks.filter(task =>
    !task.completed && task.dueDate && task.dueDate < today
  ).length;

  const percentage = total ? Math.round(completed / total * 100) : 0;

  $("totalTasks").textContent = total;
  $("completedTasks").textContent = completed;
  $("pendingTasks").textContent = pending;
  $("overdueTasks").textContent = overdue;
  $("progressBar").style.width = percentage + "%";
  $("progressText").textContent = percentage + "% completed";
}

/* CALENDAR */

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("calendarMonth").textContent = calendarDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = dateKey(new Date());

  let html = "";

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty" aria-hidden="true"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(new Date(year, month, day));
    const hasTasks = tasks.some(task => task.dueDate === key);
    const isToday = key === today;
    const isSelected = key === selectedDate;

    html += `
      <button type="button"
        class="calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
        data-date="${key}" aria-label="${formatDate(key)}">
        <span>${day}</span>
        <span class="calendar-dots">
          ${hasTasks ? '<span class="calendar-dot"></span>' : ""}
        </span>
      </button>
    `;
  }

  $("calendarDays").innerHTML = html;
  renderCalendarTasks();
}

function renderCalendarTasks() {
  $("selectedDateHeading").textContent = "Tasks for " + formatDate(selectedDate);

  const dailyTasks = tasks.filter(task => task.dueDate === selectedDate);
  renderTaskContainer($("calendarTaskList"), dailyTasks);
}

$("calendarDays").addEventListener("click", event => {
  const dayButton = event.target.closest("[data-date]");
  if (!dayButton) return;

  selectedDate = dayButton.dataset.date;
  renderCalendar();
});

$("prevMonth").addEventListener("click", () => {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() - 1,
    1
  );
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    1
  );
  renderCalendar();
});

/* NOTIFICATIONS */

function getNotifications() {
  const today = dateKey(new Date());

  return tasks.filter(task =>
    !task.completed && task.dueDate && task.dueDate <= today
  ).map(task => ({
    title: task.title,
    message: task.dueDate < today ? "Overdue" : "Due today"
  }));
}

function renderNotifications() {
  const notifications = getNotifications();

  $("notificationCount").textContent = notifications.length;
  $("notificationCount").hidden = notifications.length === 0;

  $("notificationList").innerHTML = notifications.length
    ? notifications.map(item => `
        <div class="notification-item">
          <strong>${escapeHTML(item.message)}</strong><br>
          ${escapeHTML(item.title)}
        </div>
      `).join("")
    : '<div class="empty-state">You have no new notifications.</div>';
}

$("notificationBtn").addEventListener("click", () => {
  $("notificationPanel").hidden = !$("notificationPanel").hidden;
  $("profilePanel").hidden = true;
  renderNotifications();
});

$("enableNotifications").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("Browser notifications are not supported.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      showToast("Notification permission was not granted.");
      return;
    }

    const notifications = getNotifications();

    if (!notifications.length) {
      showToast("No tasks due today or overdue.");
      return;
    }

    notifications.forEach(item => {
      new Notification(item.message, { body: item.title });
    });

    showToast("Browser notifications enabled.");
  } catch {
    showToast("Could not enable browser notifications.");
  }
});

/* THEME AND REFRESH */

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});

function refreshAll() {
  updateDashboard();
  renderTasks();
  renderCalendar();
  renderNotifications();
}

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

updateLoginView();
