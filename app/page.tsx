"use client";

import { useEffect, useState } from "react";

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

export default function WebhooksPage() {
  const [payloads, setPayloads] = useState<Payload[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPayloads = async () => {
      const res = await fetch("/api/webhook");
      const data = await res.json();
      setPayloads(data.reverse());
    };
    fetchPayloads();
    const interval = setInterval(fetchPayloads, 2000);
    return () => clearInterval(interval);
  }, []);

  const clearPayloads = async () => {
    try {
      await fetch("/api/webhook", { method: "DELETE" });
      setPayloads([]);
    } catch (error) {
      console.error("Erro ao limpar webhooks:", error);
    }
  };

  const pauseWebhook = async () => {
    try {
      await fetch("/api/webhook", { method: "PUT" });
      setIsPaused(!isPaused);
    } catch (error) {
      console.error("Erro ao pausar o webhook: ", error);
    }
  };

  // Filtra os payloads pelo termo de busca
  const filteredPayloads = payloads.filter((p) =>
    JSON.stringify(p.data, null, 2).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto p-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webhooks Recebidos</h1>
        <div className="flex gap-5 items-center justify-center">
          <button
            onClick={clearPayloads}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition"
          >
            Limpar Dados
          </button>
          {isPaused ? (
            <button
              onClick={pauseWebhook}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition"
            >
              Despausar requisições
            </button>
          ) : (
            <button
              onClick={pauseWebhook}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition"
            >
              Pausar requisições
            </button>
          )}
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

      {filteredPayloads.map((p, i) => {
        const jsonString = JSON.stringify(p.data, null, 2);
        return (
          <div
            key={i}
            className="bg-gray-900 text-white p-4 mb-4 rounded-lg max-h-96 overflow-auto"
          >
            <div className="text-xs text-gray-400 mb-2">
              Recebido em: {p.receivedAt}
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
