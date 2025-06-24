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
  payloads.push({ data, receivedAt: new Date().toISOString() });
  if (payloads.length > 20) payloads = payloads.slice(-20);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function PUT() {
  isPaused = !isPaused;
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function GET() {
  return new Response(JSON.stringify(payloads), { status: 200 });
}

export async function DELETE() {
  payloads = [];
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
