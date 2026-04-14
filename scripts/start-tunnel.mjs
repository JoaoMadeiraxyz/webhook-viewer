import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.argv[2] || 3000;

const tunnelUrlPath = path.join(__dirname, '..', '.tunnel-url');

fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'connecting', url: null }));

function parseTunnelUrl(data) {
  const match = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

async function connect() {
  let tunnelProcess = null;
  let tunnelUrl = null;

  try {
    tunnelProcess = spawn('cloudflared', [
      'tunnel',
      '--url', `http://localhost:${port}`
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    tunnelProcess.stdout.on('data', (data) => {
      console.log(`[cloudflared] ${data.toString().trim()}`);
      if (!tunnelUrl) {
        const url = parseTunnelUrl(data);
        if (url) {
          tunnelUrl = url;
          console.log(`\n🚀 Cloudflare tunnel established!`);
          console.log(`   Public URL: ${url}`);
          console.log(`   Webhook URL: ${url}/api/webhook\n`);
          fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'ready', url }));
        }
      }
    });

    tunnelProcess.stderr.on('data', (data) => {
      console.error(`[cloudflared] ${data.toString().trim()}`);
      if (!tunnelUrl) {
        const url = parseTunnelUrl(data);
        if (url) {
          tunnelUrl = url;
          console.log(`\n🚀 Cloudflare tunnel established!`);
          console.log(`   Public URL: ${url}`);
          console.log(`   Webhook URL: ${url}/api/webhook\n`);
          fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'ready', url }));
        }
      }
    });

    tunnelProcess.on('error', (err) => {
      let errorMessage = err.message;
      if (err.code === 'ENOENT') {
        errorMessage = 'cloudflared is not installed. Please install it to use the public tunnel feature. See README.md for installation instructions.';
        console.error('\n❌ cloudflared not found!');
        console.error('\nInstall cloudflared:');
        console.error('  macOS:   brew install cloudflare/cloudflare/cloudflared');
        console.error('  Linux:   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared && chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/');
        console.error('  Windows: winget install Cloudflare.cloudflared');
        console.error('\nOr visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n');
      } else {
        console.error('Failed to start cloudflared:', err);
      }
      fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'error', url: null, error: errorMessage }));
      process.exit(1);
    });

    tunnelProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`cloudflared exited with code ${code}`);
        fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'error', url: null }));
        process.exit(1);
      }
    });

    const cleanup = () => {
      if (tunnelProcess) {
        tunnelProcess.kill('SIGTERM');
      }
      try {
        fs.unlinkSync(tunnelUrlPath);
      } catch (e) {}
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    console.error('Failed to establish cloudflare tunnel:', error);
    fs.writeFileSync(tunnelUrlPath, JSON.stringify({ status: 'error', url: null, error: error.message }));
    if (tunnelProcess) {
      tunnelProcess.kill();
    }
    process.exit(1);
  }
}

connect();
