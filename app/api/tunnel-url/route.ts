import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const tunnelUrlPath = path.join(process.cwd(), ".tunnel-url");

    if (!fs.existsSync(tunnelUrlPath)) {
      return new Response(
        JSON.stringify({ status: "connecting", url: null }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const content = fs.readFileSync(tunnelUrlPath, "utf-8");
    const data = JSON.parse(content);

    if (data.status === "ready" && data.url) {
      return new Response(
        JSON.stringify({
          status: "ready",
          url: `${data.url}/api/webhook`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: data.status || "connecting", url: null, error: data.error || null }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", url: null }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
