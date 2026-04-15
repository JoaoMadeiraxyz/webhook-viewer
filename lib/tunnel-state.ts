import fs from "fs";
import path from "path";

export type TunnelStatus = "connecting" | "reconnecting" | "ready" | "error";

export interface TunnelState {
  status: TunnelStatus;
  url?: string;
  retries: number;
  error?: string;
}

export type ClientController = ReadableStreamDefaultController;

const clients = new Set<ClientController>();
const stateFilePath = path.join(process.cwd(), ".tunnel-state.json");

let tunnelState: TunnelState = {
  status: "connecting",
  url: undefined,
  retries: 0,
  error: undefined,
};

function loadStateFromFile(): TunnelState | null {
  try {
    if (fs.existsSync(stateFilePath)) {
      const content = fs.readFileSync(stateFilePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Tunnel-State] Failed to load state from file:", error);
  }
  return null;
}

function saveStateToFile() {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(tunnelState), "utf-8");
  } catch (error) {
    console.error("[Tunnel-State] Failed to save state to file:", error);
  }
}

export function getTunnelState(): TunnelState {
  const savedState = loadStateFromFile();
  if (savedState) {
    tunnelState = savedState;
  }
  return tunnelState;
}

export function addTunnelClient(controller: ClientController) {
  clients.add(controller);
  const currentState = getTunnelState();
  controller.enqueue(`data: ${JSON.stringify(currentState)}\n\n`);
}

export function removeTunnelClient(controller: ClientController) {
  clients.delete(controller);
}

export function updateTunnelStatus(newState: Partial<TunnelState>) {
  tunnelState = { ...tunnelState, ...newState };
  saveStateToFile();
  notifyTunnelClients();
}

export function notifyTunnelClients(data?: any) {
  const payload = data || tunnelState;
  clients.forEach((controller) => {
    try {
      controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      clients.delete(controller);
    }
  });
}

export function incrementRetries(): number {
  tunnelState.retries += 1;
  saveStateToFile();
  return tunnelState.retries;
}

export function resetRetries() {
  tunnelState.retries = 0;
  saveStateToFile();
}

export function getRetries(): number {
  return tunnelState.retries;
}

export const MAX_RETRIES = 5;
