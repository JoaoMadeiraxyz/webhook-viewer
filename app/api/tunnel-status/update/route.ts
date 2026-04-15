import { updateTunnelStatus } from "@/lib/tunnel-state";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status, url, retries, error } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    updateTunnelStatus({ status, url, retries, error });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Tunnel-Status] Error updating tunnel status:", error);
    return NextResponse.json(
      { error: "Failed to update tunnel status" },
      { status: 500 }
    );
  }
}
