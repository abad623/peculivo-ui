import { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } from "./config";
import type { IntentResponse } from "./intent";

export interface IntentRecord {
  id: string;
  transcript: string;
  language: string;
  intents: IntentResponse["intents"];
  status: "confirmed" | "edited";
  createdAt: string;
  airtableId?: string;
}

const STORAGE_KEY = "peculivo_intents";

function loadLocal(): IntentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(records: IntentRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export function getLocalRecords(): IntentRecord[] {
  return loadLocal();
}

export function addLocalRecord(record: IntentRecord): IntentRecord[] {
  const records = loadLocal();
  records.unshift(record);
  saveLocal(records);
  return records;
}

export function updateLocalRecord(
  id: string,
  updates: Partial<IntentRecord>
): IntentRecord[] {
  const records = loadLocal();
  const idx = records.findIndex((r) => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveLocal(records);
  }
  return records;
}

export function deleteLocalRecord(id: string): IntentRecord[] {
  const records = loadLocal().filter((r) => r.id !== id);
  saveLocal(records);
  return records;
}

// Airtable REST API sync (optional — only if AIRTABLE_BASE_ID is set)

function airtableUrl() {
  if (!AIRTABLE_BASE_ID) return null;
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
}

const headers = {
  Authorization: `Bearer ${AIRTABLE_PAT}`,
  "Content-Type": "application/json",
};

export async function syncToAirtable(record: IntentRecord): Promise<string | null> {
  const url = airtableUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        records: [
          {
            fields: {
              Transcript: record.transcript,
              Language: record.language,
              Intent: record.intents.map((i) => i.intent).join(", "),
              Confidence: record.intents[0]?.confidence ?? 0,
              Entities: JSON.stringify(
                record.intents.map((i) => i.entities),
                null,
                2
              ),
              Status: record.status,
              CreatedAt: record.createdAt,
              RawJSON: JSON.stringify(record.intents, null, 2),
            },
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.records?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchAirtableRecords(): Promise<any[]> {
  const url = airtableUrl();
  if (!url) return [];

  try {
    const res = await fetch(`${url}?sort%5B0%5D%5Bfield%5D=CreatedAt&sort%5B0%5D%5Bdirection%5D=desc`, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.records ?? [];
  } catch {
    return [];
  }
}
