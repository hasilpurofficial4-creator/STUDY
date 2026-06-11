
const https = require('https');
const OWNER = 'hasilpurofficial4-creator';
const REPO = 'STUDY';
const BRANCH = 'main';

function gh(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StudyHubLahore',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function readFile(file, token) {
  const r = await gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + file + '?ref=' + BRANCH, null, token);
  if (r.status === 200 && r.data.content) {
    return JSON.parse(Buffer.from(r.data.content, 'base64').toString());
  }
  return null;
}

async function writeFile(file, content, token) {
  const existing = await gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + file + '?ref=' + BRANCH, null, token);
  const sha = existing.status === 200 ? existing.data.sha : undefined;
  const body = {
    message: 'Update ' + file,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    branch: BRANCH
  };
  if (sha) body.sha = sha;
  return gh('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + file, body, token);
}

module.exports = async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'file param required' });

  // Sanitize
  const safeFile = file.replace(/[^a-zA-Z0-9_\-.\/]/g, '');

  if (req.method === 'GET') {
    try {
      const data = await readFile(safeFile, token);
      res.status(200).json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'POST') {
    try {
      const r = await writeFile(safeFile, req.body, token);
      res.status(r.status).json({ ok: r.status < 300 });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};


