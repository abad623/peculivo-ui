/**
 * Parse date and time from intent entities into structured values.
 * Handles: "tomorrow", "next Monday", "Friday", "March 20th", "2026-04-20",
 * "in 3 days", "next week", "morgen", "naechsten Montag", "Freitag", etc.
 */

const DAY_NAMES_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_NAMES_DE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const MONTH_NAMES_DE = [
  "januar", "februar", "m\u00e4rz", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "dezember",
];

function nextWeekday(dayIndex: number): Date {
  const now = new Date();
  const current = now.getDay();
  let diff = dayIndex - current;
  if (diff <= 0) diff += 7;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result;
}

export function parseDate(raw: string): string {
  if (!raw) {
    // Default: tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  const lower = raw.toLowerCase().trim();

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(lower)) {
    return lower.slice(0, 10);
  }

  // DD.MM.YYYY (European)
  const euMatch = lower.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) {
    return `${euMatch[3]}-${euMatch[2].padStart(2, "0")}-${euMatch[1].padStart(2, "0")}`;
  }

  const now = new Date();

  // Relative days
  if (/\b(today|heute)\b/.test(lower)) {
    return now.toISOString().split("T")[0];
  }
  if (/\b(tomorrow|morgen)\b/.test(lower)) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().split("T")[0];
  }
  if (/\b(next week|n[aä]chste woche)\b/.test(lower)) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().split("T")[0];
  }
  if (/\b(end of (the )?month|monatsende)\b/.test(lower)) {
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return eom.toISOString().split("T")[0];
  }

  // "in X days/tagen"
  const inDays = lower.match(/in\s+(\d+)\s+(days?|tagen?)/);
  if (inDays) {
    now.setDate(now.getDate() + parseInt(inDays[1]));
    return now.toISOString().split("T")[0];
  }

  // Day name (EN)
  for (let i = 0; i < DAY_NAMES_EN.length; i++) {
    if (lower.includes(DAY_NAMES_EN[i])) {
      return nextWeekday(i).toISOString().split("T")[0];
    }
  }
  // Day name (DE)
  for (let i = 0; i < DAY_NAMES_DE.length; i++) {
    if (lower.includes(DAY_NAMES_DE[i])) {
      return nextWeekday(i).toISOString().split("T")[0];
    }
  }

  // "Month Day" e.g. "March 20th", "20. M\u00e4rz"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i]) || lower.includes(MONTH_NAMES_DE[i])) {
      const dayMatch = lower.match(/(\d{1,2})/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 1;
      const year = now.getMonth() > i ? now.getFullYear() + 1 : now.getFullYear();
      return `${year}-${String(i + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback: tomorrow
  now.setDate(now.getDate() + 1);
  return now.toISOString().split("T")[0];
}

export function parseTime(raw: string): string {
  if (!raw) return "09:00";

  const lower = raw.toLowerCase().trim();

  // HH:mm or HH.mm
  const hhmm = lower.match(/(\d{1,2})[:.h](\d{2})/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }

  // "3pm", "9am", "15 Uhr"
  const ampm = lower.match(/(\d{1,2})\s*(am|pm|uhr)/);
  if (ampm) {
    let h = parseInt(ampm[1]);
    if (ampm[2] === "pm" && h < 12) h += 12;
    if (ampm[2] === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }

  // Bare number (likely hour)
  const bare = lower.match(/^(\d{1,2})$/);
  if (bare) {
    const h = parseInt(bare[1]);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  }

  return "09:00";
}

export function buildReminderFromEntities(entities: Record<string, string>) {
  const findKey = (...keys: string[]) => {
    for (const k of keys) {
      if (entities[k]) return entities[k];
    }
    for (const k of keys) {
      const found = Object.entries(entities).find(([ek]) =>
        ek.toLowerCase().includes(k.toLowerCase())
      );
      if (found) return found[1];
    }
    return "";
  };

  const dateRaw = findKey("date", "datum", "when", "wann", "day", "tag");
  const timeRaw = findKey("time", "zeit", "uhrzeit", "hour");
  const description = findKey("reason", "description", "topic", "task", "action", "grund", "beschreibung", "aufgabe") || "Reminder";
  const contact = findKey("contact", "client", "name", "kunde", "kontakt");

  return {
    title: description.length > 50 ? description.slice(0, 50) + "..." : description,
    description,
    date: parseDate(dateRaw),
    time: parseTime(timeRaw),
    contact: contact || undefined,
  };
}
