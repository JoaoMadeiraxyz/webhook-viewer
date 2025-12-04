This is a pretty basic webhook visualizer tool that helps you when developing with webhooks on localhost.
(It may be possible to use the tool in production if you deploy it, but it isn't fully optimized for production).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the visualizer.

You can use the URL `http://localhost:3000/api/webhook` to send POST requests to the webhook.

The project offers utility tools like searching with text highlight, delete requests from the history individually or clear all the history, and lock the API so it won't receive new requests from the webhook until re-enabled.

![128B6952-9138-4D85-AE57-67C0041CA9FB](https://github.com/user-attachments/assets/86ee8fec-5047-4332-b8cc-52b7cd2015ea)
