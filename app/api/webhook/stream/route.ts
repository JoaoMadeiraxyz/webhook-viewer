import { addClient, removeClient } from "@/lib/webhook-state";

export async function GET() {
  let currentController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      currentController = controller;
      addClient(controller);
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    },
    cancel() {
      if (currentController) {
        removeClient(currentController);
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
