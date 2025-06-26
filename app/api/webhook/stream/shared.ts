// app/api/webhook/stream/shared.ts

export type ClientController = ReadableStreamDefaultController;

export const clients = new Set<ClientController>();

export function notifyClients(data: any) {
  clients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      clients.delete(controller);
    }
  });
}
