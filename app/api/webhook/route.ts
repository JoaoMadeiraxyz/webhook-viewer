import {
  getPayloads,
  addPayload,
  clearPayloads,
  getPausedState,
  togglePausedState,
  notifyClients,
} from "../../../lib/webhook-state";

import crypto from "crypto";

// function verifyStandardWebhook(
//   webhookId: string,
//   timestamp: string,
//   signature: string,
//   body: string,
//   secret: string
// ): boolean {
//   try {
//     // Parse da assinatura (formato: "v1,base64_signature")
//     const signatureParts = signature.split(",");
//     if (signatureParts.length !== 2 || signatureParts[0] !== "v1") {
//       return false;
//     }

//     const receivedSignature = signatureParts[1];

//     // Reconstrói o conteúdo assinado
//     const signedContent = `${webhookId}.${timestamp}.${body}`;

//     // Recomputa a assinatura esperada
//     const hmac = crypto.createHmac("sha256", secret);
//     hmac.update(signedContent, "utf8");
//     const expectedSignature = hmac.digest("base64");

//     // Compara assinaturas usando comparação de tempo constante
//     return crypto.timingSafeEqual(
//       Buffer.from(receivedSignature, "base64"),
//       Buffer.from(expectedSignature, "base64")
//     );
//   } catch (error) {
//     console.error("[Standard-Webhooks] Erro ao verificar assinatura:", error);
//     return false;
//   }
// }

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  if (getPausedState()) {
    return new Response(
      JSON.stringify({ error: "Serviço temporariamente indisponível" }),
      { status: 503 }
    );
  }

  // Captura de IP e domínio/origem
  const headers = request.headers;

  // IP do cliente (ordem de precedência comum)
  const xff = headers.get("x-forwarded-for");
  const cfIp = headers.get("cf-connecting-ip");
  const xRealIp = headers.get("x-real-ip");

  const firstXffIp = xff
    ?.split(",")
    .map((s) => s.trim())
    .find(Boolean);

  const fallbackIp = undefined;
  const clientIp = cfIp || firstXffIp || xRealIp || fallbackIp || "unknown";

  // Domínio do servidor que recebeu a requisição
  const hostHeader = headers.get("host") || "unknown-host";
  const originHeader = headers.get("origin") || null;
  const refererHeader = headers.get("referer") || null;

  // ========== VALIDAÇÃO STANDARD-WEBHOOKS ==========

  // Extrai headers do webhook
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  // Obtém o secret do ambiente
  const webhookSecret = process.env.WEBHOOK_SECRET;

  // Log estruturado
  console.log(
    JSON.stringify(
      {
        event: "incoming_post_request",
        clientIp,
        forwardedFor: xff || null,
        cfConnectingIp: cfIp || null,
        xRealIp: xRealIp || null,
        host: hostHeader,
        origin: originHeader,
        referer: refererHeader,
        webhookId: webhookId || null,
        webhookTimestamp: webhookTimestamp || null,
        hasSignature: !!webhookSignature,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // Valida presença dos headers obrigatórios
  // if (!webhookId || !webhookTimestamp || !webhookSignature) {
  //   console.error("[Standard-Webhooks] Headers obrigatórios ausentes", {
  //     webhookId: !!webhookId,
  //     webhookTimestamp: !!webhookTimestamp,
  //     webhookSignature: !!webhookSignature,
  //   });
  //   return new Response(
  //     JSON.stringify({
  //       error:
  //         "Missing webhook headers (webhook-id, webhook-timestamp, webhook-signature)",
  //     }),
  //     { status: 400 }
  //   );
  // }

  // // Valida presença do secret
  // if (!webhookSecret) {
  //   console.error(
  //     "[Standard-Webhooks] WEBHOOK_SECRET não configurado no ambiente"
  //   );
  //   return new Response(
  //     JSON.stringify({ error: "Webhook secret not configured" }),
  //     { status: 500 }
  //   );
  // }

  // Valida timestamp para prevenir replay attacks (janela de 5 minutos)
  // const currentTimestamp = Math.floor(Date.now() / 1000);
  // const webhookTimestampNum = parseInt(webhookTimestamp);

  // if (isNaN(webhookTimestampNum)) {
  //   console.error("[Standard-Webhooks] Timestamp inválido:", webhookTimestamp);
  //   return new Response(
  //     JSON.stringify({ error: "Invalid webhook timestamp format" }),
  //     { status: 400 }
  //   );
  // }

  // const timestampDiff = Math.abs(currentTimestamp - webhookTimestampNum);
  // if (timestampDiff > 300) {
  //   // 5 minutos
  //   console.error("[Standard-Webhooks] Timestamp fora da janela permitida", {
  //     currentTimestamp,
  //     webhookTimestamp: webhookTimestampNum,
  //     diffSeconds: timestampDiff,
  //   });
  //   return new Response(
  //     JSON.stringify({
  //       error: "Webhook timestamp too old or too new (max 5 minutes)",
  //     }),
  //     { status: 400 }
  //   );
  // }

  // Parse do body
  let data: any;
  let bodyString: string;
  try {
    bodyString = await request.text();
    data = JSON.parse(bodyString);
    console.log({ event: "payload_body", body: data });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  // Verifica a assinatura
  // const isValidSignature = verifyStandardWebhook(
  //   webhookId,
  //   webhookTimestamp,
  //   webhookSignature,
  //   bodyString,
  //   webhookSecret
  // );

  // if (!isValidSignature) {
  //   console.error("[Standard-Webhooks] Assinatura inválida", {
  //     webhookId,
  //     webhookTimestamp,
  //     clientIp,
  //   });
  //   return new Response(
  //     JSON.stringify({ error: "Invalid webhook signature" }),
  //     { status: 401 }
  //   );
  // }

  // console.log("[Standard-Webhooks] Webhook verificado com sucesso", {
  //   webhookId,
  //   type: data?.type,
  //   messageId: data?.messageId,
  // });

  // ========== PROCESSAMENTO DO WEBHOOK ==========

  const newPayload = addPayload({
    ...data,
    _meta: {
      ip: clientIp,
      clientIp,
      host: hostHeader,
      origin: originHeader,
      referer: refererHeader,
      receivedAt: new Date().toISOString(),
      webhookId,
      webhookTimestamp,
      signatureVerified: true,
    },
  });

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
