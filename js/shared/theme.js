export function initTheme() {
  const stored = localStorage.getItem("shl_theme") || "dark";
  document.documentElement.setAttribute("data-theme", stored);
  updateToggleIcon(stored);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.addEventListener("click", toggle);
  updateDateTime();
  setInterval(updateDateTime, 30000);
}

function toggle() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("shl_theme", next);
  updateToggleIcon(next);
}

function updateToggleIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.innerHTML = theme === "dark"
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
}

function updateDateTime() {
  const el = document.getElementById("header-datetime");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " | " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}