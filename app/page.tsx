"use client";

import { Copy, Trash2, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

type Payload = {
  data: any;
  receivedAt: string;
};

function highlightText(text: string, search: string) {
  if (!search) return text;
  const regex = new RegExp(
    `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300 text-black rounded px-1">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function useReconnectingEventSource(
  url: string,
  onMessage: (data: any) => void,
  onOpen?: () => void,
  maxRetries: number = 5
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      retryCountRef.current = 0;
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      
      if (isUnmountedRef.current) return;
      
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;
        
        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [url, onMessage, onOpen, maxRetries]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);
}

export default function WebhooksPage() {
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<
    "connecting" | "reconnecting" | "ready" | "error"
  >("connecting");
  const [tunnelError, setTunnelError] = useState<string | null>(null);
  const [copiedTunnel, setCopiedTunnel] = useState(false);
  const [isTunnelCollapsed, setIsTunnelCollapsed] = useState(false);
  const [showReconnectToast, setShowReconnectToast] = useState(false);
  const previousTunnelStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch("/api/webhook");
        const data = await res.json();
        setPayloads(data.reverse());
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      }
    };

    fetchInitialData();
  }, []);

  const handleWebhookMessage = useCallback((data: any) => {
    switch (data.type) {
      case "connected":
        setConnectionStatus("connected");
        break;
      case "new_payload":
      case "payloads_updated":
      case "status_change":
        setPayloads(data.allPayloads);
        if (data.isPaused !== undefined) {
          setIsPaused(data.isPaused);
        }
        break;
    }
  }, []);

  const handleWebhookOpen = useCallback(() => {
    setConnectionStatus("connected");
  }, []);

  useReconnectingEventSource(
    "/api/webhook/stream",
    handleWebhookMessage,
    handleWebhookOpen
  );

  const handleTunnelMessage = useCallback((data: any) => {
    const previousStatus = previousTunnelStatusRef.current;
    
    setTunnelStatus(data.status);
    setTunnelError(data.error || null);
    
    if (data.url) {
      setTunnelUrl(data.url);
    }
    
    if (previousStatus === "reconnecting" && data.status === "ready" && data.url) {
      setShowReconnectToast(true);
      setTimeout(() => setShowReconnectToast(false), 3000);
    }
    
    previousTunnelStatusRef.current = data.status;
  }, []);

  useReconnectingEventSource(
    "/api/tunnel-status/stream",
    handleTunnelMessage
  );

  const clearPayloads = async (e: any, id?: number) => {
    try {
      const correctIndex =
        id !== undefined ? payloads.length - 1 - id : undefined;
      await fetch(`/api/webhook?id=${correctIndex ?? ""}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Erro ao limpar webhooks:", error);
    }
  };

  const pauseWebhook = async () => {
    try {
      await fetch("/api/webhook", { method: "PUT" });
    } catch (error) {
      console.error("Erro ao pausar o webhook: ", error);
    }
  };

  const copyToClipboard = async (data: any, index: number) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  const copyTunnelUrl = async () => {
    if (tunnelUrl) {
      try {
        await navigator.clipboard.writeText(tunnelUrl);
        setCopiedTunnel(true);
        setTimeout(() => setCopiedTunnel(false), 2000);
      } catch (error) {
        console.error("Erro ao copiar URL:", error);
      }
    }
  };

  const filteredPayloads = payloads.filter((p) =>
    JSON.stringify(p.data, null, 2).toLowerCase().includes(search.toLowerCase())
  );

  return (
      <div className="max-w-3xl mx-auto p-5 relative">
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTunnelCollapsed(!isTunnelCollapsed)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title={isTunnelCollapsed ? "Expandir" : "Colapsar"}
            >
              {isTunnelCollapsed ? (
                <ChevronUp className="w-5 h-5 text-purple-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-300" />
              )}
            </button>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {tunnelStatus === "connecting" ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : tunnelStatus === "reconnecting" ? (
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  ) : tunnelStatus === "ready" ? (
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                  <span className="text-sm font-medium text-purple-200">
                    {tunnelStatus === "connecting"
                      ? "Conectando tunnel..."
                      : tunnelStatus === "reconnecting"
                      ? "Tunnel expired, trying to reconnect..."
                      : tunnelStatus === "ready"
                      ? "Webhook URL pública:"
                      : "Erro ao conectar tunnel"}
                  </span>
                </div>
                {tunnelStatus === "error" && tunnelError && (
                  <span className="text-xs text-red-300 ml-7">{tunnelError}</span>
                )}
              </div>
          </div>
          {!isTunnelCollapsed && tunnelUrl && (
            <div className="flex items-center gap-2 flex-wrap">
              <code className="px-3 py-1.5 bg-black/40 rounded-md text-sm text-green-400 font-mono break-all">
                {tunnelUrl}
              </code>
              <div className="flex gap-2">
                <button
                  onClick={copyTunnelUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {copiedTunnel ? (
                    <>
                      <span className="text-green-300">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar
                    </>
                  )}
                </button>
                <a
                  href={tunnelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <ExternalLink size={16} />
                  Testar
                </a>
              </div>
            </div>
          )}
          {showReconnectToast && (
            <div className="absolute bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-pulse">
              <span>✅ Tunnel reconnected!</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks Recebidos</h1>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === "connected"
                ? "Conectado"
                : connectionStatus === "connecting"
                ? "Conectando..."
                : "Desconectado"}
            </span>
          </div>
        </div>
        <div className="flex gap-5 items-center justify-center">
          <button
            onClick={clearPayloads}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition"
          >
            Limpar Dados
          </button>
          <button
            onClick={pauseWebhook}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition"
          >
            {isPaused ? "Despausar requisições" : "Pausar requisições"}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Pesquisar nos dados recebidos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"
        />
      </div>

      {filteredPayloads.length === 0 && (
        <p className="text-gray-500">Nenhum webhook recebido ainda.</p>
      )}

      <p className="text-gray-500 text-sm mb-5">Quantidade de webhooks: {filteredPayloads.length}</p>
      
      {filteredPayloads.map((p, i) => {
        const jsonString = JSON.stringify(p.data, null, 2);
        return (
          <div
            key={`${p.receivedAt}-${i}`}
            className={`${
              p.data.fromMe ? "bg-slate-800" : "bg-gray-900"
            } text-white p-4 mb-4 rounded-lg max-h-96 overflow-auto`}
          >
            <div className="w-full flex justify-between items-center mb-2">
              <div className="text-xs text-gray-400">
                Recebido em: {p.receivedAt}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => copyToClipboard(p.data, i)}
                  className="hover:bg-gray-700 p-1 rounded transition-colors cursor-pointer"
                  title="Copiar JSON"
                >
                  {copiedIndex === i ? (
                    <span className="text-green-400 text-xs">Copiado!</span>
                  ) : (
                    <Copy size={20} className="text-white" />
                  )}
                </button>

                <button
                  onClick={() => clearPayloads(null, i)}
                  className="hover:bg-gray-700 p-1 rounded transition-colors cursor-pointer"
                  title="Excluir JSON"
                >
                  <Trash2 size={20} className="text-white" />
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap break-words break-all text-sm leading-relaxed max-w-full overflow-auto">
              {highlightText(jsonString, search)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
