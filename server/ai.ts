import OpenAI, { toFile } from "openai";

// Lazy client — reads env var at call time so Railway env is always current
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY environment variable is not set on this server.");
  return new OpenAI({ apiKey: key });
}

// ── Email analysis ────────────────────────────────────────────────────────────
export async function analyseEmail(rawText: string): Promise<{
  fromAddress: string | null;
  subject: string | null;
  receivedDate: string | null;
  summary: string;
  keyPoints: string[];
  hasRfi: boolean;
  rfis: Array<{ title: string; description: string; raisedBy: string | null }>;
}> {
  const prompt = `You are a construction project assistant. Analyse the following email and return a JSON object with these fields:

- fromAddress: sender email address if present, otherwise null
- subject: email subject if present, otherwise null  
- receivedDate: date the email was sent if present (ISO format YYYY-MM-DD), otherwise null
- summary: 2-3 sentence plain-English summary of what the email is about
- keyPoints: array of 3-6 concise bullet points covering the main issues, decisions or actions
- hasRfi: true if any Requests for Information are present or implied, otherwise false
- rfis: array of RFI objects extracted — each with title (short descriptive title), description (full detail of what is being requested), raisedBy (name or company if identifiable, otherwise null). Empty array if none.

Return ONLY valid JSON. No markdown, no explanation.

EMAIL:
${rawText}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    fromAddress: parsed.fromAddress ?? null,
    subject: parsed.subject ?? null,
    receivedDate: parsed.receivedDate ?? null,
    summary: parsed.summary ?? "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    hasRfi: !!parsed.hasRfi,
    rfis: Array.isArray(parsed.rfis) ? parsed.rfis : [],
  };
}

// ── Minutes analysis ──────────────────────────────────────────────────────────
export async function analyseMinutes(minutesText: string): Promise<{
  summary: string;
  decisions: string[];
  actions: Array<{ item: string; owner: string | null; due: string | null }>;
  attendeesSuggested: string[];
  hasRfi: boolean;
  rfis: Array<{ title: string; description: string; raisedBy: string | null }>;
}> {
  const prompt = `You are a construction project assistant. Analyse the following meeting minutes or transcript and return a JSON object with these fields:

- summary: 2-3 sentence plain-English summary of the meeting
- decisions: array of decisions made during the meeting (strings)
- actions: array of action items. Each action MUST include:
  - item: specific description of what needs to be done (be precise — include dates, amounts, locations mentioned)
  - owner: full name of who is responsible if mentioned, otherwise null
  - due: the due date or deadline in YYYY-MM-DD format if ANY date is mentioned in relation to this action — extract dates like "15th of May", "3rd of June", "end of week" etc. Use the current year (${new Date().getFullYear()}) if no year is stated. If no date is mentioned, use null.
- attendeesSuggested: array of full names mentioned that appear to be attendees
- hasRfi: true if any Requests for Information are raised or implied
- rfis: array of RFI objects — each with title, description, raisedBy (or null). Empty array if none.

IMPORTANT: Extract ALL specific dates, deadlines, and names mentioned. Do not generalise — if the transcript says "moving joinery to the 15th of May" the action item must say exactly that and due must be set to that date.

Return ONLY valid JSON. No markdown, no explanation.

MEETING MINUTES / TRANSCRIPT:
${minutesText}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary ?? "",
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    attendeesSuggested: Array.isArray(parsed.attendeesSuggested) ? parsed.attendeesSuggested : [],
    hasRfi: !!parsed.hasRfi,
    rfis: Array.isArray(parsed.rfis) ? parsed.rfis : [],
  };
}

// ── Audio transcription (Whisper) ─────────────────────────────────────────────
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  // Use Buffer + filename tuple — Node.js doesn't have the browser File API
  const buffer = Buffer.from(audioBase64, "base64");
  // Determine file extension from mimeType for Whisper to identify the format
  const ext = mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("mp3") || mimeType.includes("mpeg") ? "mp3"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("m4a") ? "m4a"
    : "webm";

  const response = await getOpenAI().audio.transcriptions.create({
    model: "whisper-1",
    file: await toFile(buffer, `recording.${ext}`, { type: mimeType }),
    language: "en",
  });

  return response.text;
}

// ── RFI document analysis ─────────────────────────────────────────────────────
export async function analyseRfi(rawText: string): Promise<{
  title: string;
  description: string;
  raisedBy: string | null;
  receivedDate: string | null;
  rfiNumber: string | null;
  summary: string;
  keyPoints: string[];
  rfis: Array<{ title: string; description: string; raisedBy: string | null }>;
}> {
  const prompt = `You are a construction project assistant. Analyse the following RFI (Request for Information) document or text and return a JSON object with these fields:

- title: a concise descriptive title for the RFI (e.g. "Structural connection detail — Level 12 beam")
- description: full detailed description of what is being requested or queried
- raisedBy: name or company raising the RFI if identifiable, otherwise null
- receivedDate: date the RFI was raised if present (ISO format YYYY-MM-DD), otherwise null
- rfiNumber: any RFI reference number present (e.g. "RFI-042"), otherwise null
- summary: 2-3 sentence plain-English summary of what the RFI is about and why it matters
- keyPoints: array of 3-6 concise bullet points covering the key questions, issues or information required
- rfis: if the document contains multiple distinct RFIs, extract each as an object with title, description, raisedBy. If only one RFI, return an array with that single item.

Return ONLY valid JSON. No markdown, no explanation.

RFI DOCUMENT:
${rawText}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    title: parsed.title ?? "Untitled RFI",
    description: parsed.description ?? "",
    raisedBy: parsed.raisedBy ?? null,
    receivedDate: parsed.receivedDate ?? null,
    rfiNumber: parsed.rfiNumber ?? null,
    summary: parsed.summary ?? "",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    rfis: Array.isArray(parsed.rfis) ? parsed.rfis : [],
  };
}
