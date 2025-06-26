import { clients } from "./shared";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Adiciona o cliente ao conjunto
      clients.add(controller);

      // Envia mensagem inicial
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    },
    cancel(controller) {
      // Remove o cliente quando a conexão é cancelada
      clients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
