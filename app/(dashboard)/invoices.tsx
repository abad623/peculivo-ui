import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { useInvoices } from "@/lib/InvoicesContext";
import { generatePDF, InvoiceData } from "@/lib/invoiceGenerator";

export default function InvoicesScreen() {
  const { invoices, removeInvoice } = useInvoices();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const openInvoice = useCallback(async (inv: InvoiceData) => {
    const uri = await generatePDF(inv);
    setPdfUri(uri);
    setSelectedInvoice(inv);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedInvoice(null);
    setPdfUri(null);
  }, []);

  const downloadPdf = useCallback(() => {
    if (!pdfUri || !selectedInvoice) return;
    const link = document.createElement("a");
    link.href = pdfUri;
    link.download = `${selectedInvoice.invoiceNumber}.pdf`;
    link.click();
  }, [pdfUri, selectedInvoice]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function fmt(n: number, currency: string) {
    const sym = currency === "EUR" ? "\u20AC" : currency === "USD" ? "$" : currency;
    return `${sym}${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  }

  const statusColor = (s: string) =>
    s === "paid" ? "#2e7d32" : s === "sent" ? "#1565c0" : "#e65100";
  const statusBg = (s: string) =>
    s === "paid" ? "#e8f5e9" : s === "sent" ? "#e3f2fd" : "#fff3e0";

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Invoices</Text>
        <Text style={s.headerSub}>
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} generated
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {invoices.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{"\uD83E\uDDFE"}</Text>
            <Text style={s.emptyTitle}>No invoices yet</Text>
            <Text style={s.emptyText}>
              Say something like "Create an invoice for Thomas Bauer for 3000
              euros for the website project" in the Voice Assistant.
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {invoices.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={s.card}
                onPress={() => openInvoice(inv)}
                activeOpacity={0.7}
              >
                {/* Card header */}
                <View style={s.cardTop}>
                  <Text style={s.invoiceNum}>{inv.invoiceNumber}</Text>
                  <Text
                    style={[
                      s.statusBadge,
                      { color: statusColor(inv.status), backgroundColor: statusBg(inv.status) },
                    ]}
                  >
                    {inv.status}
                  </Text>
                </View>

                {/* Client */}
                <Text style={s.clientName}>{inv.clientName}</Text>

                {/* Items preview */}
                <Text style={s.itemPreview} numberOfLines={1}>
                  {inv.items.map((i) => i.description).join(", ")}
                </Text>

                {/* Footer */}
                <View style={s.cardBottom}>
                  <Text style={s.dateText}>{formatDate(inv.date)}</Text>
                  <Text style={s.totalText}>{fmt(inv.total, inv.currency)}</Text>
                </View>

                {/* Delete */}
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    removeInvoice(inv.id);
                  }}
                >
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* PDF Modal */}
      <Modal visible={!!selectedInvoice} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {selectedInvoice?.invoiceNumber} — {selectedInvoice?.clientName}
              </Text>
              <View style={s.modalActions}>
                {Platform.OS === "web" && (
                  <TouchableOpacity style={s.downloadBtn} onPress={downloadPdf}>
                    <Text style={s.downloadBtnText}>Download PDF</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.closeBtn} onPress={closeModal}>
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PDF viewer */}
            {Platform.OS === "web" && pdfUri ? (
              <iframe
                src={pdfUri}
                style={{
                  flex: 1,
                  width: "100%",
                  border: "none",
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                }}
                title="Invoice PDF"
              />
            ) : (
              <View style={s.noPdf}>
                <Text style={s.noPdfText}>
                  PDF preview is only available on web.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#202124" },
  headerSub: { fontSize: 13, color: "#5f6368", marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  /* Empty state */
  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#202124", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#5f6368", textAlign: "center", maxWidth: 340 },

  /* Card grid */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  invoiceNum: { fontSize: 16, fontWeight: "700", color: "#1a73e8" },
  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  clientName: { fontSize: 15, fontWeight: "600", color: "#202124", marginBottom: 4 },
  itemPreview: { fontSize: 13, color: "#5f6368", marginBottom: 12 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  dateText: { fontSize: 12, color: "#999" },
  totalText: { fontSize: 18, fontWeight: "700", color: "#202124" },
  deleteBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  deleteBtnText: { color: "#d32f2f", fontSize: 11, fontWeight: "600" },

  /* Modal */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "90%",
    maxWidth: 800,
    height: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fafafa",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#202124" },
  modalActions: { flexDirection: "row", gap: 8 },
  downloadBtn: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  closeBtn: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeBtnText: { color: "#333", fontSize: 13, fontWeight: "600" },

  noPdf: { flex: 1, justifyContent: "center", alignItems: "center" },
  noPdfText: { color: "#999", fontSize: 14 },
});
