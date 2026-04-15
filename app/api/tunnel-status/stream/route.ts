import { addTunnelClient, removeTunnelClient, getTunnelState } from "@/lib/tunnel-state";

export async function GET() {
  let currentController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      currentController = controller;
      addTunnelClient(controller);
    },
    cancel() {
      if (currentController) {
        removeTunnelClient(currentController);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
