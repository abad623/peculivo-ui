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

export function buildInvoiceFromEntities(
  entities: Record<string, string>
): InvoiceData {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 30);

  const count = getInvoices().length + 1;
  const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;

  const amount = parseFloat(entities.amount || entities.fee || entities.price || "0");
  const description =
    entities.reason || entities.description || entities.topic || entities.project || "Services rendered";
  const taxRate = 19; // EU standard
  const subtotal = amount || 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    invoiceNumber,
    date: now.toISOString().split("T")[0],
    dueDate: due.toISOString().split("T")[0],
    clientName: entities.contact || entities.client || entities.name || "Client",
    clientEmail: entities.email,
    items: [{ description, amount: subtotal }],
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: entities.currency || "EUR",
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
