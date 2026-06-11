
const https = require('https');
const OWNER = 'hasilpurofficial4-creator';
const REPO = 'STUDY-DATA';
const BRANCH = 'main';

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
  const body = { message: 'Request update', content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  return gh('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + file, body, token);
}

module.exports = async (req, res) => {
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Server config error' });

  if (req.method === 'POST') {
    const { name, number, request: reqText } = req.body;
    if (!name || !number || !reqText) return res.status(400).json({ error: 'All fields required' });
    const requests = (await readJSON('data/requests.json', token)) || [];
    requests.push({ id: Date.now().toString(), name, number, request: reqText, date: new Date().toISOString(), status: 'pending' });
    await writeJSON('data/requests.json', requests, token);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const requests = (await readJSON('data/requests.json', token)) || [];
    return res.status(200).json(requests);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
