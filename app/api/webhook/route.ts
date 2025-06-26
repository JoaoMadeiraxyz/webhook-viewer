import {
  getPayloads,
  addPayload,
  clearPayloads,
  getPausedState,
  togglePausedState,
  notifyClients,
} from "../../../lib/webhook-state";

export async function POST(request: Request) {
  if (getPausedState()) {
    return new Response(
      JSON.stringify({ error: "Serviço temporariamente indisponível" }),
      { status: 503 }
    );
  }

  let data: any;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const newPayload = addPayload(data);

  notifyClients({
    type: "new_payload",
    payload: newPayload,
    allPayloads: [...getPayloads()].reverse(),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function PUT() {
  const newPausedState = togglePausedState();

  notifyClients({
    type: "status_change",
    isPaused: newPausedState,
    allPayloads: [...getPayloads()].reverse(),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function GET() {
  return new Response(JSON.stringify(getPayloads()), { status: 200 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id && isNaN(Number(id))) {
    return new Response(JSON.stringify({ error: "Invalid id" }), {
      status: 400,
    });
  }

  clearPayloads(id ? Number(id) : undefined);

  notifyClients({
    type: "payloads_updated",
    allPayloads: [...getPayloads()].reverse(),
  });

  return new Response(JSON.stringify({ ok: true, id }), { status: 200 });
}
