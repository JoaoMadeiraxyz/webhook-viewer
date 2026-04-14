# Webhook Viewer

A simple webhook visualizer tool that helps you when developing with webhooks on localhost.

## Prerequisites

- Node.js 18+
- cloudflared (Cloudflare Tunnel CLI) - for public URL feature

## Installing cloudflared

The public URL feature requires `cloudflared` to be installed on your system.

### macOS

```bash
brew install cloudflared
```

### Linux

Binaries, Debian and RPM packages for Linux [can be found here](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/#linux).

### Windows

You can install cloudflared on windows machines following the [steps here](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/#windows).

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the visualizer.

## Using the Public URL

When you run `npm run dev`, a public tunnel URL is automatically generated using Cloudflare Tunnel. This URL is displayed in the UI and can be used to receive webhooks from external services.

**Example URL:** `https://random-name.trycloudflare.com/api/webhook`

### Features

- **No account required** - Cloudflare quick tunnels work without signup
- **No warning screen** - Unlike ngrok's free tier, there's no interstitial page
- **Random URL** - A new random URL is generated each time you restart the server

### How to use

1. Start the dev server: `npm run dev`
2. Wait for the tunnel to connect (green indicator in UI)
3. Copy the public URL from the UI
4. Use this URL as your webhook endpoint in external services

## Local Webhook URL

You can also use the local URL for testing:

```
http://localhost:3000/api/webhook
```

## Features

- Real-time webhook visualization
- Search with text highlighting
- Delete requests individually or clear all history
- Pause/resume webhook reception
- Collapsible public URL section
- Error handling with installation instructions

## Troubleshooting

### "cloudflared not installed" error

If you see this error in the UI, install cloudflared using the instructions above.

### Tunnel not connecting

- Check if port 3000 is available
- Check your internet connection
- Try restarting the dev server

### Port already in use

If port 3000 is already in use, you can run on a different port:

```bash
npm run dev:default
```

This runs the server on port 3001.

## Screenshot

![Webhook Viewer Screenshot](https://github.com/user-attachments/assets/86ee8fec-5047-4332-b8cc-52b7cd2015ea)
