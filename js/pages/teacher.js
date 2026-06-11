import { initTheme } from "../shared/theme.js";
import { login, fetchData, saveData } from "../shared/api.js";
import { getToken, getUser, setAuth, clearAuth, isLoggedIn } from "../shared/auth.js";
import { showToast } from "../shared/notifications.js";
import { generateId } from "../shared/utils.js";

initTheme();

(async () => {
  const ok = await isLoggedIn();
  if (ok && getUser().role === "teacher") {
    showDashboard();
  } else if (ok) {
    showToast("Access denied - Teacher only", "error");
    clearAuth();
  } else {
    clearAuth();
  }
  updateUserBadge();
})();

function updateUserBadge() {
  const user = getUser();
  if (user) {
    document.getElementById("user-badge").textContent = user.name;
    document.getElementById("user-badge").classList.remove("hidden");
    document.getElementById("logout-btn").classList.remove("hidden");
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const result = await login(document.getElementById("login-user").value, document.getElementById("login-pass").value);
    if (result.user.role !== "teacher") { showToast("Teacher access only", "error"); return; }
    setAuth(result.token, result.user);
    showToast("Welcome, " + result.user.name + "!", "success");
    updateUserBadge();
    showDashboard();
  } catch (err) { showToast(err.message, "error"); }
});

document.getElementById("logout-btn").addEventListener("click", () => { clearAuth(); location.reload(); });

function showDashboard() {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");
  loadMyExams();
  loadStudentResults();
}

// Create Exam
document.getElementById("new-exam-btn").addEventListener("click", () => {
  document.getElementById("create-exam-section").classList.remove("hidden");
  document.getElementById("exam-form").reset();
  document.getElementById("questions-container").innerHTML = "";
  document.getElementById("save-exam-btn").disabled = true;
});

document.getElementById("cancel-exam-btn").addEventListener("click", () => {
  document.getElementById("create-exam-section").classList.add("hidden");
});

document.getElementById("generate-qs-btn").addEventListener("click", () => {
  const num = parseInt(document.getElementById("exam-numq").value) || 10;
  const container = document.getElementById("questions-container");
  container.innerHTML = "";
  for (let i = 0; i < num; i++) {
    const div = document.createElement("div");
    div.className = "glass-card mb-1";
    div.style.padding = "var(--space-lg)";
    let html = '<h4 style="margin-bottom:var(--space-md)">Question ' + (i + 1) + '</h4>'
      + '<div class="form-group"><label class="form-label">Question Text</label>'
      + '<input type="text" class="form-input q-text" data-i="' + i + '" placeholder="Enter question" required></div>'
      + '<div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--space-sm)">';
    for (let j = 0; j < 4; j++) {
      html += '<div class="form-group"><label class="form-label">Option ' + String.fromCharCode(65 + j) + '</label>'
        + '<input type="text" class="form-input q-opt" data-i="' + i + '" data-j="' + j + '" placeholder="Option ' + String.fromCharCode(65 + j) + '" required></div>';
    }
    html += '</div>';
    html += '<div class="form-group"><label class="form-label">Correct Answer</label>'
      + '<select class="form-select q-correct" data-i="' + i + '">'
      + '<option value="0">Option A</option><option value="1">Option B</option>'
      + '<option value="2">Option C</option><option value="3">Option D</option></select></div>';
    div.innerHTML = html;
    container.appendChild(div);
  }
  document.getElementById("save-exam-btn").disabled = false;
});

document.getElementById("exam-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const num = parseInt(document.getElementById("exam-numq").value);
  const questions = [];
  let valid = true;
  for (let i = 0; i < num; i++) {
    const text = document.querySelector('.q-text[data-i="' + i + '"]').value;
    const opts = [];
    for (let j = 0; j < 4; j++) {
      const v = document.querySelector('.q-opt[data-i="' + i + '"][data-j="' + j + '"]').value;
      if (!v) valid = false;
      opts.push(v);
    }
    const correct = parseInt(document.querySelector('.q-correct[data-i="' + i + '"]').value);
    if (!text) valid = false;
    questions.push({ question: text, options: opts, correctIndex: correct });
  }
  if (!valid) { showToast("Please fill all question fields", "warning"); return; }
  const exam = {
    id: generateId(),
    class: document.getElementById("exam-class").value,
    subject: document.getElementById("exam-subject").value,
    questions: questions,
    time: parseInt(document.getElementById("exam-time").value),
    totalMarks: parseInt(document.getElementById("exam-marks").value),
    passingPct: parseInt(document.getElementById("exam-passpct").value),
    approved: true,
    createdBy: getUser().username,
    createdAt: new Date().toISOString()
  };
  try {
    const existing = await fetchData("data/exams.json");
    const arr = Array.isArray(existing) ? existing : [];
    arr.push(exam);
    await saveData("data/exams.json", arr);
    showToast("Exam created successfully!", "success");
    document.getElementById("create-exam-section").classList.add("hidden");
    loadMyExams();
  } catch (err) { showToast("Failed to save exam", "error"); }
});

async function loadMyExams() {
  const container = document.getElementById("my-exams-list");
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const exams = await fetchData("data/exams.json");
    const user = getUser();
    const mine = (Array.isArray(exams) ? exams : []).filter(e => e.createdBy === user.username).reverse();
    if (mine.length === 0) { container.innerHTML = '<p class="text-center text-muted">No exams created yet.</p>'; return; }
    let html = '<table class="data-table"><thead><tr><th>Subject</th><th>Class</th><th>Questions</th><th>Time</th><th>Date</th></tr></thead><tbody>';
    mine.forEach(e => {
      html += '<tr><td>' + e.subject + '</td><td>' + e.class + '</td><td>' + e.questions.length + '</td><td>' + e.time + ' min</td><td>' + new Date(e.createdAt).toLocaleDateString() + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch { container.innerHTML = '<p class="text-center text-muted">Failed to load.</p>'; }
}

async function loadStudentResults() {
  const container = document.getElementById("student-results-list");
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const results = await fetchData("data/results.json");
    const exams = await fetchData("data/exams.json");
    const user = getUser();
    const myExamIds = (Array.isArray(exams) ? exams : []).filter(e => e.createdBy === user.username).map(e => e.id);
    const relevant = (Array.isArray(results) ? results : []).filter(r => myExamIds.includes(r.examId)).reverse();
    if (relevant.length === 0) { container.innerHTML = '<p class="text-center text-muted">No student results yet.</p>'; return; }
    let html = '<table class="data-table"><thead><tr><th>Student</th><th>Subject</th><th>Class</th><th>Marks</th><th>%</th><th>Status</th></tr></thead><tbody>';
    relevant.forEach(r => {
      html += '<tr><td>' + r.studentName + '</td><td>' + r.examSubject + '</td><td>' + r.examClass + '</td>'
        + '<td>' + r.takenMarks + '/' + r.totalMarks + '</td><td>' + r.percentage + '%</td>'
        + '<td><span class="badge ' + (r.passed ? "badge-success" : "badge-danger") + '">' + (r.passed ? "Pass" : "Fail") + '</span></td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch { container.innerHTML = '<p class="text-center text-muted">Failed to load.</p>'; }
}