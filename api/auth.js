
const jwt = require('jsonwebtoken');
const https = require('https');
const OWNER = 'hasilpurofficial4-creator';
const REPO = 'STUDY-DATA';
const BRANCH = 'main';
const SECRET = process.env.JWT_SECRET || 'studyhub_lahore_secret_2024';

function gh(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com', path: urlPath, method,
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'StudyHub', 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function readJSON(file, token) {
  const r = await gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + file + '?ref=' + BRANCH, null, token);
  if (r.status === 200 && r.data.content) return JSON.parse(Buffer.from(r.data.content, 'base64').toString());
  return null;
}

async function writeJSON(file, content, token) {
  const existing = await gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + file + '?ref=' + BRANCH, null, token);
  const sha = existing.status === 200 ? existing.data.sha : undefined;
  const body = { message: 'Auth update', content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  return gh('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + file, body, token);
}

module.exports = async (req, res) => {
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server config error' });

  const { action } = req.query;

  // LOGIN
  if (action === 'login' && req.method === 'POST') {
    const { username, password } = req.body;
    const users = (await readJSON('data/users.json', token)) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const jwtToken = jwt.sign({ username: user.username, role: user.role, name: user.name }, SECRET, { expiresIn: '24h' });
    return res.status(200).json({ token: jwtToken, user: { username: user.username, role: user.role, name: user.name } });
  }

  // VERIFY TOKEN
  if (action === 'verify' && req.method === 'POST') {
    const { token: t } = req.body;
    try {
      const decoded = jwt.verify(t, SECRET);
      return res.status(200).json({ valid: true, user: decoded });
    } catch { return res.status(401).json({ valid: false }); }
  }

  // ADD USER (admin only)
  if (action === 'adduser' && req.method === 'POST') {
    const { adminToken, username, password, role, name } = req.body;
    try {
      const admin = jwt.verify(adminToken, SECRET);
      if (admin.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    } catch { return res.status(401).json({ error: 'Unauthorized' }); }
    const users = (await readJSON('data/users.json', token)) || [];
    if (users.find(u => u.username === username)) return res.status(409).json({ error: 'User exists' });
    users.push({ username, password, role: role || 'student', name: name || username, createdAt: new Date().toISOString() });
    await writeJSON('data/users.json', users, token);
    return res.status(200).json({ ok: true });
  }

  // DELETE USER (admin only)
  if (action === 'deluser' && req.method === 'POST') {
    const { adminToken, username } = req.body;
    try {
      const admin = jwt.verify(adminToken, SECRET);
      if (admin.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    } catch { return res.status(401).json({ error: 'Unauthorized' }); }
    let users = (await readJSON('data/users.json', token)) || [];
    users = users.filter(u => u.username !== username);
    await writeJSON('data/users.json', users, token);
    return res.status(200).json({ ok: true });
  }

  // LIST USERS (admin only)
  if (action === 'listusers' && req.method === 'GET') {
    const adminToken = req.headers['x-admin-token'];
    try {
      const admin = jwt.verify(adminToken, SECRET);
      if (admin.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    } catch { return res.status(401).json({ error: 'Unauthorized' }); }
    const users = (await readJSON('data/users.json', token)) || [];
    return res.status(200).json(users.map(u => ({ username: u.username, role: u.role, name: u.name, createdAt: u.createdAt })));
  }

  res.status(400).json({ error: 'Invalid action' });
};
