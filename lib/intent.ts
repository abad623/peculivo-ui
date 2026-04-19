export const INTENT_SYSTEM = `CRM intent classifier. Extract intents and entities from transcript. Respond ONLY with JSON.

Intents: GENERATE_INVOICE, SEND_EMAIL, SET_REMINDER, SEND_PAYMENT_REMINDER

Output format (JSON only, no other text):
{"intents":[{"intent":"GENERATE_INVOICE","confidence":0.95,"language":"en","entities":{"contact":"Thomas Bauer","amount":"3000","project_name":"website"}}],"language":"en"}

Rules: extract ALL entities (names, amounts, dates, companies). Multiple intents only for distinct actions. Language as ISO 639-1.`;

export interface IntentItem {
  intent: string;
  confidence: number;
  language: string;
  entities: Record<string, string>;
}

export interface IntentResponse {
  intents: IntentItem[];
  language: string;
}

function extractContent(data: any): string {
  if (typeof data === "string") return data;
  if (data?.choices?.[0]?.message?.content)
    return data.choices[0].message.content;
  if (data?.message?.content) return data.message.content;
  if (data?.response) return data.response;
  if (data?.content) return data.content;
  return JSON.stringify(data);
}

export async function classifyIntent(
  transcript: string
): Promise<IntentResponse> {
  // Route through local API proxy to avoid CORS issues
  const response = await fetch("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: INTENT_SYSTEM },
        { role: "user", content: transcript },
      ],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Intent API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  console.log("[Intent API] raw response:", JSON.stringify(data));
  const content = extractContent(data);
  console.log("[Intent API] extracted content:", content);

  // Try to parse JSON from the content (may have markdown fences)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Intent API returned non-JSON response");
  }

  let raw = jsonMatch[0];
  let parsed: IntentResponse;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // Qwen sometimes outputs literal newlines or unescaped chars inside JSON strings
    // Fix: escape newlines inside string values, remove trailing commas
    raw = raw
      .replace(/:\s*"([^"]*)"/gs, (_, val) =>
        ': "' + val.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"'
      )
      .replace(/,\s*([}\]])/g, "$1"); // trailing commas

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Intent API returned invalid JSON");
    }
  }

  if (!parsed.intents || !Array.isArray(parsed.intents)) {
    throw new Error("Invalid intent response format");
  }

  return parsed;
}
