const API_BASE = "/api";

export async function fetchData(file) {
  const r = await fetch(API_BASE + "/data?file=" + encodeURIComponent(file));
  if (!r.ok) throw new Error("Fetch failed");
  return r.json();
}

export async function saveData(file, data) {
  const r = await fetch(API_BASE + "/data?file=" + encodeURIComponent(file), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
  return r.json();
}

export async function login(username, password) {
  const r = await fetch(API_BASE + "/auth?action=login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Login failed");
  return d;
}

export async function verifyToken(token) {
  const r = await fetch(API_BASE + "/auth?action=verify", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return r.json();
}

export async function addUser(adminToken, userData) {
  const r = await fetch(API_BASE + "/auth?action=adduser", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminToken, ...userData })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Failed");
  return d;
}

export async function deleteUser(adminToken, username) {
  const r = await fetch(API_BASE + "/auth?action=deluser", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminToken, username })
  });
  return r.json();
}

export async function listUsers(adminToken) {
  const r = await fetch(API_BASE + "/auth?action=listusers", {
    headers: { "x-admin-token": adminToken }
  });
  return r.json();
}

export async function submitRequest(data) {
  const r = await fetch(API_BASE + "/request", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

export async function getRequests() {
  const r = await fetch(API_BASE + "/request");
  return r.json();
}