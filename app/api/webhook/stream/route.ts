import { clients } from "./shared";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    },
    cancel() {
      // Remove o cliente ao cancelar
      clients.forEach((controller) => clients.delete(controller));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
export function notifyClients(data: any) {
  clients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      clients.delete(controller);
    }
  });
}
