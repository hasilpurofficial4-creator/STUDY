import { initTheme } from "../shared/theme.js";
import { login, fetchData, addUser, deleteUser, listUsers, getRequests } from "../shared/api.js";
import { getToken, getUser, setAuth, clearAuth, isLoggedIn } from "../shared/auth.js";
import { showToast } from "../shared/notifications.js";

initTheme();

(async () => {
  const ok = await isLoggedIn();
  if (ok && getUser().role === "admin") {
    showDashboard();
  } else if (ok) {
    showToast("Admin access only", "error");
    clearAuth();
  } else {
    clearAuth();
  }
  updateUserBadge();
})();

function updateUserBadge() {
  const user = getUser();
  if (user && user.role === "admin") {
    document.getElementById("user-badge").textContent = "Admin: " + user.name;
    document.getElementById("user-badge").classList.remove("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const result = await login(document.getElementById("login-user").value, document.getElementById("login-pass").value);
    if (result.user.role !== "admin") { showToast("Admin access only", "error"); return; }
    setAuth(result.token, result.user);
    showToast("Welcome Admin!", "success");
    updateUserBadge();
    showDashboard();
  } catch (err) { showToast(err.message, "error"); }
});

document.getElementById("logout-btn").addEventListener("click", () => { clearAuth(); location.reload(); });

async function showDashboard() {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  await loadStats();
  await loadUsers();
  await loadRequests();
}

async function loadStats() {
  try {
    const users = await listUsers(getToken());
    const exams = await fetchData("data/exams.json");
    const results = await fetchData("data/results.json");
    const requests = await getRequests();
    document.getElementById("stat-users").textContent = Array.isArray(users) ? users.length : 0;
    document.getElementById("stat-exams").textContent = Array.isArray(exams) ? exams.length : 0;
    document.getElementById("stat-results").textContent = Array.isArray(results) ? results.length : 0;
    document.getElementById("stat-requests").textContent = Array.isArray(requests) ? requests.length : 0;
  } catch {}
}

async function loadUsers() {
  const container = document.getElementById("users-list");
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const users = await listUsers(getToken());
    if (!Array.isArray(users) || users.length === 0) { container.innerHTML = '<p class="text-muted">No users found.</p>'; return; }
    let html = '<table class="data-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th>Action</th></tr></thead><tbody>';
    users.forEach(u => {
      const roleBadge = u.role === "admin" ? "badge-danger" : u.role === "teacher" ? "badge-info" : "badge-primary";
      html += '<tr><td>' + u.name + '</td><td>' + u.username + '</td>'
        + '<td><span class="badge ' + roleBadge + '">' + u.role + '</span></td>'
        + '<td>' + (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-") + '</td>'
        + '<td><button class="btn btn-danger btn-sm del-user" data-user="' + u.username + '">Delete</button></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    container.querySelectorAll(".del-user").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Delete user " + btn.dataset.user + "?")) {
          try {
            await deleteUser(getToken(), btn.dataset.user);
            showToast("User deleted", "success");
            loadUsers();
            loadStats();
          } catch (err) { showToast("Failed: " + err.message, "error"); }
        }
      });
    });
  } catch (err) { container.innerHTML = '<p class="text-danger">Failed to load users</p>'; }
}

async function loadRequests() {
  const container = document.getElementById("requests-list");
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const reqs = await getRequests();
    if (!Array.isArray(reqs) || reqs.length === 0) { container.innerHTML = '<p class="text-muted">No requests.</p>'; return; }
    let html = '<table class="data-table"><thead><tr><th>Name</th><th>Number</th><th>Request</th><th>Date</th><th>Status</th></tr></thead><tbody>';
    reqs.reverse().forEach(r => {
      html += '<tr><td>' + r.name + '</td><td>' + r.number + '</td><td>' + r.request + '</td>'
        + '<td>' + new Date(r.date).toLocaleDateString() + '</td>'
        + '<td><span class="badge badge-warning">' + r.status + '</span></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch { container.innerHTML = '<p class="text-muted">Failed to load.</p>'; }
}

// Add User
document.getElementById("add-user-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("new-name").value,
    username: document.getElementById("new-username").value,
    password: document.getElementById("new-password").value,
    role: document.getElementById("new-role").value
  };
  try {
    await addUser(getToken(), data);
    showToast("User added: " + data.username, "success");
    document.getElementById("add-user-form").reset();
    loadUsers();
    loadStats();
  } catch (err) { showToast("Failed: " + err.message, "error"); }
});