import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.argv[2] || 3000;
const API_BASE = `http://localhost:${port}`;

const stateFilePath = path.join(__dirname, '..', '.tunnel-state.json');

let retries = 0;
const MAX_RETRIES = 5;

function parseTunnelUrl(data) {
  const match = data.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

function writeStateToFile(state) {
  fs.writeFileSync(stateFilePath, JSON.stringify(state), 'utf-8');
}

async function updateTunnelStatus(status, url = null, error = null) {
  const state = { status, url, retries, error };
  writeStateToFile(state);
  
  try {
    await fetch(`${API_BASE}/api/tunnel-status/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, url, retries, error })
    });
  } catch (err) {
    console.error('[tunnel] Failed to update tunnel status:', err.message);
  }
}

async function connect() {
  let tunnelProcess = null;
  let tunnelUrl = null;
  let isReconnecting = false;

  try {
    await updateTunnelStatus('connecting', null, null);

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
          retries = 0;
          isReconnecting = false;
          console.log(`\n🚀 Cloudflare tunnel established!`);
          console.log(`   Public URL: ${url}`);
          console.log(`   Webhook URL: ${url}/api/webhook\n`);
          updateTunnelStatus('ready', url, null);
        }
      }
    });

    tunnelProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.error(`[cloudflared] ${output}`);
      
      if (!tunnelUrl) {
        const url = parseTunnelUrl(data);
        if (url) {
          tunnelUrl = url;
          retries = 0;
          isReconnecting = false;
          console.log(`\n🚀 Cloudflare tunnel established!`);
          console.log(`   Public URL: ${url}`);
          console.log(`   Webhook URL: ${url}/api/webhook\n`);
          updateTunnelStatus('ready', url, null);
        }
      } else if (output.includes('Serve tunnel error')) {
        isReconnecting = true;
        console.log('[tunnel] Connection lost, reconnecting...');
        updateTunnelStatus('reconnecting', tunnelUrl, null);
      } else if (output.includes('Registered tunnel connection') && isReconnecting) {
        isReconnecting = false;
        retries = 0;
        console.log('[tunnel] Tunnel reconnected successfully!');
        updateTunnelStatus('ready', tunnelUrl, null);
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
      updateTunnelStatus('error', null, errorMessage);
      process.exit(1);
    });

    tunnelProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`cloudflared exited with code ${code}`);
        retries++;
        
        if (retries < MAX_RETRIES) {
          console.log(`[tunnel] Reconnecting... (attempt ${retries}/${MAX_RETRIES})`);
          updateTunnelStatus('reconnecting', tunnelUrl, null);
          
          setTimeout(() => {
            tunnelUrl = null;
            connect();
          }, 2000);
        } else {
          console.error('[tunnel] Max reconnection attempts reached. Please restart manually.');
          updateTunnelStatus('error', null, 'Max reconnection attempts reached. Please restart manually.');
        }
      }
    });

    const cleanup = () => {
      if (tunnelProcess) {
        tunnelProcess.kill('SIGTERM');
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (error) {
    console.error('Failed to establish cloudflare tunnel:', error);
    updateTunnelStatus('error', null, error.message);
    if (tunnelProcess) {
      tunnelProcess.kill();
    }
    process.exit(1);
  }
}

connect();
