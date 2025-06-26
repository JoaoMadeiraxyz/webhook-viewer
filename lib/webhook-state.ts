export type ClientController = ReadableStreamDefaultController;

const clients = new Set<ClientController>();

let payloads: { data: any; receivedAt: string }[] = [];
let isPaused = false;

export function addClient(controller: ClientController) {
  clients.add(controller);
}

export function removeClient(controller: ClientController) {
  clients.delete(controller);
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

// Funções para gerenciar payloads
export function getPayloads() {
  return payloads;
}

export function addPayload(data: any) {
  const newPayload = { data, receivedAt: new Date().toISOString() };
  payloads.push(newPayload);
  if (payloads.length > 20) payloads = payloads.slice(-20);
  return newPayload;
}

export function clearPayloads(id?: number) {
  if (id !== undefined) {
    payloads = payloads.filter((_, index) => index !== id);
  } else {
    payloads = [];
  }
}

export function getPausedState() {
  return isPaused;
}

export function togglePausedState() {
  isPaused = !isPaused;
  return isPaused;
}
