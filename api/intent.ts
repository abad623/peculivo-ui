export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await request.json();

  const upstream = await fetch("https://intent.peculivo.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.INTENT_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
