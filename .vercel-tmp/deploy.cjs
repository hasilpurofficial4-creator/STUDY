
const { spawnSync } = require('child_process');
const path = require('path');
const dir = path.resolve(__dirname, '..');
try {
  const result = spawnSync('npx', ['vercel', '--prod', '--yes'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true,
    timeout: 300000
  });
  console.log(result.stdout || '');
  if (result.stderr) console.error(result.stderr);
  if (result.status !== 0) process.exit(1);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
