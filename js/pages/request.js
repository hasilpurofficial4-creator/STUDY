import { initTheme } from "../shared/theme.js";
import { submitRequest } from "../shared/api.js";
import { showToast } from "../shared/notifications.js";

initTheme();

document.getElementById("request-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("req-name").value,
    number: document.getElementById("req-number").value,
    request: document.getElementById("req-text").value
  };
  try {
    await submitRequest(data);
    showToast("Request submitted!", "success");
    document.getElementById("request-form").classList.add("hidden");
    document.querySelector(".login-title").classList.add("hidden");
    document.querySelector(".login-subtitle").classList.add("hidden");
    document.getElementById("success-msg").classList.remove("hidden");
  } catch (err) {
    showToast("Failed to submit. Try again.", "error");
  }
});