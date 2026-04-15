export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail?: string;
  items: Array<{ description: string; amount: number }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid";
  createdAt: string;
}

const STORAGE_KEY = "peculivo_invoices";

/* ---------- Local persistence ---------- */

export function getInvoices(): InvoiceData[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveInvoice(inv: InvoiceData): InvoiceData[] {
  const list = getInvoices();
  list.unshift(inv);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function deleteInvoice(id: string): InvoiceData[] {
  const list = getInvoices().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

/* ---------- Build invoice from intent entities ---------- */

function findEntity(entities: Record<string, string>, ...keys: string[]): string {
  // Try exact match first, then case-insensitive partial match
  for (const k of keys) {
    if (entities[k]) return entities[k];
  }
  const lowerEntries = Object.entries(entities);
  for (const k of keys) {
    const found = lowerEntries.find(([key]) => key.toLowerCase().includes(k.toLowerCase()));
    if (found) return found[1];
  }
  return "";
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Strip currency words/symbols: €, $, EUR, Euro, euros, dollars, etc.
  let cleaned = raw.replace(/[€$£]/g, "").replace(/\b(EUR|Euro|euros?|USD|dollars?|GBP|pounds?)\b/gi, "").trim();
  // Handle European format: 1.000,50 → 1000.50 or 1.000 → 1000
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Handle comma as decimal: 1000,50 → 1000.50
  else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(",", ".");
  }
  // Handle comma as thousands: 1,000 or 1,000.50
  else {
    cleaned = cleaned.replace(/,/g, "");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function buildInvoiceFromEntities(
  entities: Record<string, string>
): InvoiceData {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 30);

  const count = getInvoices().length + 1;
  const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;

  const amountRaw = findEntity(entities, "amount", "fee", "price", "total", "sum", "betrag");
  const subtotal = parseAmount(amountRaw);
  const description = findEntity(entities, "project_name", "reason", "description", "topic", "project", "service", "grund", "beschreibung") || "Services rendered";
  const clientName = findEntity(entities, "contact", "client", "client_name", "name", "kunde", "kontakt") || "Client";
  const taxRate = 19;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Detect currency from the raw amount string
  let currency = "EUR";
  if (amountRaw) {
    if (/\$|USD|dollar/i.test(amountRaw)) currency = "USD";
    else if (/£|GBP|pound/i.test(amountRaw)) currency = "GBP";
  }
  if (entities.currency) currency = entities.currency.toUpperCase();

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    invoiceNumber,
    date: now.toISOString().split("T")[0],
    dueDate: due.toISOString().split("T")[0],
    clientName,
    clientEmail: entities.email,
    items: [{ description, amount: subtotal }],
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency,
    status: "draft",
    createdAt: now.toISOString(),
  };
}

/* ---------- PDF generation ---------- */

function fmt(n: number, currency: string): string {
  const sym = currency === "EUR" ? "\u20AC" : currency === "USD" ? "$" : currency;
  return `${sym}${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function generatePDF(inv: InvoiceData): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = margin;

  // Colors
  const primary = [26, 115, 232] as const; // #1a73e8
  const dark = [32, 33, 36] as const;
  const gray = [95, 99, 104] as const;
  const lightBg = [245, 247, 250] as const;
  const lineColor = [218, 220, 224] as const;

  // ---- Header band ----
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, 28);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(inv.invoiceNumber, W - margin, 20, { align: "right" });
  doc.text(`Date: ${inv.date}`, W - margin, 27, { align: "right" });
  doc.text(`Due: ${inv.dueDate}`, W - margin, 34, { align: "right" });

  y = 60;

  // ---- From / To ----
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin, y);
  doc.text("BILL TO", margin + contentW / 2, y);

  y += 6;
  doc.setTextColor(...dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Peculivo", margin, y);
  doc.text(inv.clientName, margin + contentW / 2, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text("CRM for European Freelancers", margin, y);
  if (inv.clientEmail) {
    doc.text(inv.clientEmail, margin + contentW / 2, y);
  }

  y += 16;

  // ---- Table header ----
  doc.setFillColor(...lightBg);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setDrawColor(...lineColor);
  doc.line(margin, y, margin + contentW, y);
  doc.line(margin, y + 10, margin + contentW, y + 10);

  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("#", margin + 4, y + 7);
  doc.text("DESCRIPTION", margin + 14, y + 7);
  doc.text("AMOUNT", margin + contentW - 4, y + 7, { align: "right" });

  y += 10;

  // ---- Table rows ----
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...dark);
  doc.setFontSize(10);

  inv.items.forEach((item, idx) => {
    y += 10;
    doc.text(String(idx + 1), margin + 4, y);
    doc.text(item.description, margin + 14, y);
    doc.text(fmt(item.amount, inv.currency), margin + contentW - 4, y, {
      align: "right",
    });
  });

  y += 6;
  doc.setDrawColor(...lineColor);
  doc.line(margin, y, margin + contentW, y);

  // ---- Totals ----
  const totalsX = margin + contentW - 80;

  y += 10;
  doc.setTextColor(...gray);
  doc.setFontSize(10);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(...dark);
  doc.text(fmt(inv.subtotal, inv.currency), margin + contentW - 4, y, {
    align: "right",
  });

  y += 8;
  doc.setTextColor(...gray);
  doc.text(`Tax (${inv.taxRate}%)`, totalsX, y);
  doc.setTextColor(...dark);
  doc.text(fmt(inv.taxAmount, inv.currency), margin + contentW - 4, y, {
    align: "right",
  });

  y += 4;
  doc.setDrawColor(...lineColor);
  doc.line(totalsX, y, margin + contentW, y);

  y += 8;
  doc.setFillColor(...primary);
  doc.rect(totalsX - 4, y - 6, contentW - totalsX + margin + 4, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", totalsX, y + 2);
  doc.text(fmt(inv.total, inv.currency), margin + contentW - 4, y + 2, {
    align: "right",
  });

  // ---- Footer ----
  y += 30;
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Terms: Due within 30 days of invoice date.", margin, y);
  y += 5;
  doc.text(
    "Please transfer to the bank account provided separately.",
    margin,
    y
  );

  // Bottom line
  doc.setFillColor(...primary);
  doc.rect(0, 287, W, 3, "F");

  return doc.output("datauristring");
}
