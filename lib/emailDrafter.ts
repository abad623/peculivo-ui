/**
 * Use the Qwen model (intent API) to draft an email from context.
 */

const DRAFT_SYSTEM = `You are a professional email writer for a European freelancer using Peculivo CRM.
Write a professional, concise email based on the user's request.
Match the language of the user's request (German if they spoke German, etc.).

Respond with ONLY valid JSON:
{"subject": "Email subject line", "body": "Full email body text"}

Keep emails professional but warm. Use appropriate greetings and sign-offs.
Sign off as the freelancer (don't use a specific name, use "Best regards" or equivalent).`;

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
      max_tokens: 1024,
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

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { subject: `Email to ${contactName}`, body: content };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject || `Email to ${contactName}`,
      body: parsed.body || content,
    };
  } catch {
    return { subject: `Email to ${contactName}`, body: content };
  }
}
