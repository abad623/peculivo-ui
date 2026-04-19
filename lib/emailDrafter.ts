/**
 * Use the Qwen model (intent API) to draft an email from context.
 */

const DRAFT_SYSTEM = `Write a short professional email. Match the user's language. Respond ONLY with JSON:
{"subject":"subject","body":"email body"}
Sign off with "Best regards".`;

export interface DraftResult {
  subject: string;
  body: string;
}

export async function draftEmail(
  contactName: string,
  context: string
): Promise<DraftResult> {
  const prompt = `Write an email to ${contactName}. Context: ${context}`;

  const response = await fetch("/api/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: DRAFT_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`Draft API error (${response.status})`);
  }

  const data = await response.json();

  // Extract content from response
  let content = "";
  if (data?.message?.content) content = data.message.content;
  else if (data?.choices?.[0]?.message?.content) content = data.choices[0].message.content;
  else if (data?.response) content = data.response;
  else content = JSON.stringify(data);

  // Parse JSON from response — Qwen often puts literal newlines inside
  // JSON string values which makes JSON.parse fail, so we fix them first.
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { subject: `Email to ${contactName}`, body: content };
  }

  let raw = jsonMatch[0];

  try {
    // First try direct parse
    const parsed = JSON.parse(raw);
    return {
      subject: parsed.subject || `Email to ${contactName}`,
      body: parsed.body || content,
    };
  } catch {
    // Fix literal newlines inside JSON string values
    raw = raw.replace(/:\s*"([^"]*)"/gs, (_, val) => {
      return ': "' + val.replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
    });

    try {
      const parsed = JSON.parse(raw);
      return {
        subject: parsed.subject || `Email to ${contactName}`,
        body: (parsed.body || content).replace(/\\n/g, "\n"),
      };
    } catch {
      // Last resort: extract subject and body with regex
      const subjectMatch = content.match(/"subject"\s*:\s*"([^"]*?)"/);
      const bodyMatch = content.match(/"body"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);
      return {
        subject: subjectMatch?.[1] || `Email to ${contactName}`,
        body: bodyMatch?.[1]?.replace(/\\n/g, "\n") || content,
      };
    }
  }
}
