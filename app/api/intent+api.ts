import { INTENT_API_URL } from "@/lib/config";

const INTENT_API_KEY = process.env.INTENT_API_KEY ?? "";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const upstream = await fetch(`${INTENT_API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": INTENT_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Proxy error" },
      { status: 502 },
    );
  }
}
