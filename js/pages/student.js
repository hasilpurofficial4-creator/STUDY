import { initTheme } from "../shared/theme.js";
import { login, fetchData, saveData } from "../shared/api.js";
import { getToken, getUser, setAuth, clearAuth, isLoggedIn } from "../shared/auth.js";
import { showToast } from "../shared/notifications.js";
import { shuffle } from "../shared/utils.js";

initTheme();

let currentExam = null;
let currentQ = 0;
let answers = {};
let timerInterval = null;
let timeLeft = 0;

// Check auth on load
(async () => {
  const ok = await isLoggedIn();
  if (ok) {
    showExamList();
  } else {
    clearAuth();
    document.getElementById("login-section").classList.remove("hidden");
  }
  updateUserBadge();
})();

function updateUserBadge() {
  const user = getUser();
  const badge = document.getElementById("user-badge");
  const logoutBtn = document.getElementById("logout-btn");
  if (user) {
    badge.textContent = user.name + " (" + user.role + ")";
    badge.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  }
}

// Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-user").value;
  const password = document.getElementById("login-pass").value;
  try {
    const result = await login(username, password);
    setAuth(result.token, result.user);
    showToast("Welcome back, " + result.user.name + "!", "success");
    updateUserBadge();
    showExamList();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", () => {
  clearAuth();
  location.reload();
});

// Show exam list
async function showExamList() {
  hideAll();
  document.getElementById("exam-list-section").classList.remove("hidden");
  document.getElementById("past-results-section").classList.remove("hidden");
  const list = document.getElementById("exam-list");
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const exams = await fetchData("data/exams.json");
    const approved = (Array.isArray(exams) ? exams : []).filter(e => e.approved);
    if (approved.length === 0) {
      list.innerHTML = "";
      document.getElementById("no-exams").classList.remove("hidden");
    } else {
      list.innerHTML = "";
      approved.forEach((exam, i) => {
        const card = document.createElement("div");
        card.className = "exam-card animate-fadeInUp stagger-" + Math.min(i + 1, 6);
        card.innerHTML = ''
          + '<div class="exam-card-info">'
          + '<h3>' + exam.subject + ' - Class ' + exam.class + '</h3>'
          + '<div class="exam-card-meta">'
          + '<span>📝 ' + exam.questions.length + ' Questions</span>'
          + '<span>⏱️ ' + exam.time + ' min</span>'
          + '<span>📊 ' + exam.totalMarks + ' Marks</span>'
          + '<span>✅ Pass: ' + exam.passingPct + '%</span>'
          + '</div></div>'
          + '<button class="btn btn-primary btn-sm">Start</button>';
        card.querySelector("button").addEventListener("click", () => startExam(exam));
        list.appendChild(card);
      });
    }
    loadPastResults();
  } catch (err) {
    list.innerHTML = "";
    showToast("Failed to load exams", "error");
  }
}

// Start exam
function startExam(exam) {
  hideAll();
  document.getElementById("exam-take-section").classList.remove("hidden");
  currentExam = exam;
  currentQ = 0;
  answers = {};
  document.getElementById("exam-title").textContent = exam.subject + " - Class " + exam.class;
  timeLeft = exam.time * 60;
  startTimer();
  renderQuestion();
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) { clearInterval(timerInterval); submitExam(); }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById("exam-timer");
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  el.textContent = "\u23F1\uFE0F " + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  el.className = "exam-timer";
  if (timeLeft < 60) el.classList.add("danger");
  else if (timeLeft < 300) el.classList.add("warning");
}

function renderQuestion() {
  const q = currentExam.questions[currentQ];
  const area = document.getElementById("question-area");
  const total = currentExam.questions.length;
  document.getElementById("exam-progress").textContent = "Question " + (currentQ + 1) + " of " + total;
  let html = '<div class="question-card">'
    + '<div class="question-number">Question ' + (currentQ + 1) + '</div>'
    + '<div class="question-text">' + q.question + '</div>'
    + '<div class="options-list">';
  q.options.forEach((opt, i) => {
    const sel = answers[currentQ] === i ? " selected" : "";
    html += '<div class="option-item' + sel + '" data-idx="' + i + '">'
      + '<div class="option-radio"></div>'
      + '<span>' + opt + '</span>'
      + '</div>';
  });
  html += '</div></div>';
  area.innerHTML = html;
  area.querySelectorAll(".option-item").forEach(el => {
    el.addEventListener("click", () => {
      area.querySelectorAll(".option-item").forEach(o => o.classList.remove("selected"));
      el.classList.add("selected");
      answers[currentQ] = parseInt(el.dataset.idx);
    });
  });
  document.getElementById("prev-btn").disabled = currentQ === 0;
  const isLast = currentQ === total - 1;
  document.getElementById("next-btn").classList.toggle("hidden", isLast);
  document.getElementById("submit-exam-btn").classList.toggle("hidden", !isLast);
}

document.getElementById("prev-btn").addEventListener("click", () => {
  if (currentQ > 0) { currentQ--; renderQuestion(); }
});
document.getElementById("next-btn").addEventListener("click", () => {
  if (currentQ < currentExam.questions.length - 1) { currentQ++; renderQuestion(); }
});
document.getElementById("submit-exam-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to submit?")) submitExam();
});

// Submit exam
async function submitExam() {
  clearInterval(timerInterval);
  const exam = currentExam;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  exam.questions.forEach((q, i) => {
    if (answers[i] === undefined) unanswered++;
    else if (answers[i] === q.correctIndex) correct++;
    else wrong++;
  });
  const total = exam.questions.length;
  const marksPerQ = exam.totalMarks / total;
  const takenMarks = Math.round(correct * marksPerQ * 100) / 100;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= exam.passingPct;
  const user = getUser();
  const result = {
    examId: exam.id, examSubject: exam.subject, examClass: exam.class,
    studentName: user ? user.name : "Unknown",
    studentUsername: user ? user.username : "unknown",
    correct, wrong, unanswered, total, takenMarks, totalMarks: exam.totalMarks,
    percentage: pct, ratio: correct + "/" + total,
    passingPct: exam.passingPct, passed,
    date: new Date().toISOString()
  };
  // Save result
  try {
    const results = await fetchData("data/results.json");
    const arr = Array.isArray(results) ? results : [];
    arr.push(result);
    await saveData("data/results.json", arr);
  } catch (err) {
    showToast("Failed to save result", "error");
  }
  showResult(result);
}

// Show result
function showResult(r) {
  hideAll();
  document.getElementById("result-section").classList.remove("hidden");
  document.getElementById("score-pct").textContent = r.percentage + "%";
  document.getElementById("score-circle").style.setProperty("--pct", r.percentage + "%");
  const status = document.getElementById("result-status");
  status.textContent = r.passed ? "PASSED" : "FAILED";
  status.className = "result-status " + (r.passed ? "pass" : "fail");
  const stats = document.getElementById("result-stats");
  stats.innerHTML = ''
    + statHTML(r.examClass, "Class")
    + statHTML(r.totalMarks, "Total Marks")
    + statHTML(r.takenMarks, "Marks Taken")
    + statHTML(r.correct, "Correct")
    + statHTML(r.wrong, "Wrong")
    + statHTML(r.percentage + "%", "Percentage")
    + statHTML(r.ratio, "Ratio");
  const details = document.getElementById("result-details");
  details.innerHTML = '<h3>Details</h3>' + ''
    + rowHTML("Subject", r.examSubject)
    + rowHTML("Student", r.studentName)
    + rowHTML("Date", new Date(r.date).toLocaleString())
    + rowHTML("Passing %", r.passingPct + "%")
    + rowHTML("Unanswered", String(r.unanswered));
}

function statHTML(val, label) {
  return '<div class="result-stat"><div class="result-stat-value">' + val + '</div><div class="result-stat-label">' + label + '</div></div>';
}
function rowHTML(label, val) {
  return '<div class="result-row"><span class="label">' + label + '</span><span class="value">' + val + '</span></div>';
}

// Download PDF
document.getElementById("download-pdf-btn").addEventListener("click", async () => {
  showToast("Generating PDF...", "info");
  const el = document.getElementById("result-download-area");
  try {
    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 10, w, h);
    pdf.save("StudyHub_Result.pdf");
    showToast("PDF downloaded!", "success");
  } catch (err) {
    showToast("PDF generation failed", "error");
  }
});

document.getElementById("back-exams-btn").addEventListener("click", showExamList);

// Past results
async function loadPastResults() {
  const container = document.getElementById("past-results-list");
  const user = getUser();
  if (!user) return;
  try {
    const results = await fetchData("data/results.json");
    const mine = (Array.isArray(results) ? results : []).filter(r => r.studentUsername === user.username).reverse();
    if (mine.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">No past results yet.</p>';
      return;
    }
    let html = '<table class="data-table"><thead><tr><th>Subject</th><th>Class</th><th>Marks</th><th>%</th><th>Status</th><th>Date</th></tr></thead><tbody>';
    mine.forEach(r => {
      html += '<tr>' + ''
        '<td>' + r.examSubject + '</td>' + ''
        '<td>' + r.examClass + '</td>' + ''
        '<td>' + r.takenMarks + '/' + r.totalMarks + '</td>' + ''
        '<td>' + r.percentage + '%</td>' + ''
        '<td><span class="badge ' + (r.passed ? "badge-success" : "badge-danger") + '">' + (r.passed ? "Pass" : "Fail") + '</span></td>' + ''
        '<td>' + new Date(r.date).toLocaleDateString() + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch {}
}

function hideAll() {
  ["login-section","exam-list-section","exam-take-section","result-section","past-results-section"].forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
}