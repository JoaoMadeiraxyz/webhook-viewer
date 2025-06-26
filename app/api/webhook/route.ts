import { notifyClients } from "./stream/shared";

let payloads: { data: any; receivedAt: string }[] = [];
let isPaused = false;

export async function POST(request: Request) {
  if (isPaused) {
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

  const newPayload = { data, receivedAt: new Date().toISOString() };
  payloads.push(newPayload);
  if (payloads.length > 20) payloads = payloads.slice(-20);

  notifyClients({
    type: "new_payload",
    payload: newPayload,
    allPayloads: [...payloads].reverse(),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function PUT() {
  isPaused = !isPaused;

  notifyClients({
    type: "status_change",
    isPaused,
    allPayloads: [...payloads].reverse(),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function GET() {
  return new Response(JSON.stringify(payloads), { status: 200 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id && isNaN(Number(id))) {
    return new Response(JSON.stringify({ error: "Invalid id" }), {
      status: 400,
    });
  }

  if (id) {
    payloads = payloads.filter((_, index) => index !== Number(id));
  } else {
    payloads = [];
  }

  notifyClients({
    type: "payloads_updated",
    allPayloads: [...payloads].reverse(),
  });

  return new Response(JSON.stringify({ ok: true, id }), { status: 200 });
}
