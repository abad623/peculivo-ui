import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useIntents } from "@/lib/IntentsContext";
import type { IntentRecord } from "@/lib/airtable";

const INTENT_COLORS: Record<string, string> = {
  GENERATE_INVOICE: "#e91e63",
  SEND_INVOICE: "#f44336",
  SET_REMINDER: "#ffc107",
  SEND_PAYMENT_REMINDER: "#ff5722",
};

export default function AirtableScreen() {
  const { records, deleteRecord } = useIntents();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Airtable</Text>
        <Text style={s.headerSub}>
          {records.length} intent{records.length !== 1 ? "s" : ""} recorded
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {records.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{"\uD83D\uDCCB"}</Text>
            <Text style={s.emptyTitle}>No intents yet</Text>
            <Text style={s.emptyText}>
              Use the Voice Assistant to record and classify intents. Confirmed
              intents will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Table header */}
            <View style={s.tableHeader}>
              <Text style={[s.th, s.colDate]}>Date</Text>
              <Text style={[s.th, s.colTranscript]}>Transcript</Text>
              <Text style={[s.th, s.colIntent]}>Intent</Text>
              <Text style={[s.th, s.colConfidence]}>Confidence</Text>
              <Text style={[s.th, s.colLang]}>Lang</Text>
              <Text style={[s.th, s.colStatus]}>Status</Text>
              <Text style={[s.th, s.colActions]}>Actions</Text>
            </View>

            {/* Table rows */}
            {records.map((rec) => (
              <React.Fragment key={rec.id}>
                <TouchableOpacity
                  style={[
                    s.tableRow,
                    expandedId === rec.id && s.tableRowExpanded,
                  ]}
                  onPress={() => toggleExpand(rec.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.td, s.colDate]}>
                    {formatDate(rec.createdAt)}
                  </Text>
                  <Text style={[s.td, s.colTranscript]} numberOfLines={1}>
                    {rec.transcript}
                  </Text>
                  <View style={[s.colIntent, { flexDirection: "row", flexWrap: "wrap", gap: 4 }]}>
                    {rec.intents.map((i, idx) => (
                      <Text
                        key={idx}
                        style={[
                          s.intentBadge,
                          {
                            backgroundColor:
                              INTENT_COLORS[i.intent] || "#666",
                          },
                        ]}
                      >
                        {i.intent}
                      </Text>
                    ))}
                  </View>
                  <Text style={[s.td, s.colConfidence]}>
                    {rec.intents[0]
                      ? `${(rec.intents[0].confidence * 100).toFixed(0)}%`
                      : "—"}
                  </Text>
                  <Text style={[s.td, s.colLang]}>
                    {rec.language.toUpperCase()}
                  </Text>
                  <View style={s.colStatus}>
                    <Text
                      style={[
                        s.statusBadge,
                        rec.status === "confirmed"
                          ? s.statusConfirmed
                          : s.statusEdited,
                      ]}
                    >
                      {rec.status}
                    </Text>
                  </View>
                  <View style={s.colActions}>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        deleteRecord(rec.id);
                      }}
                    >
                      <Text style={s.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Expanded detail */}
                {expandedId === rec.id && (
                  <View style={s.expandedRow}>
                    <Text style={s.expandLabel}>Full transcript:</Text>
                    <Text style={s.expandValue}>{rec.transcript}</Text>

                    {rec.intents.map((intent, idx) => (
                      <View key={idx} style={s.expandIntent}>
                        <Text style={s.expandIntentTitle}>
                          Intent #{idx + 1}: {intent.intent}
                        </Text>
                        <Text style={s.expandLabel}>Entities:</Text>
                        {Object.entries(intent.entities || {}).length > 0 ? (
                          Object.entries(intent.entities || {}).map(([k, v]) => (
                            <View key={k} style={s.expandEntityRow}>
                              <Text style={s.expandEntityKey}>{k}:</Text>
                              <Text style={s.expandEntityVal}>
                                {String(v)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={s.expandEntityVal}>None</Text>
                        )}
                      </View>
                    ))}

                    {rec.airtableId && (
                      <Text style={s.airtableIdText}>
                        Airtable ID: {rec.airtableId}
                      </Text>
                    )}
                  </View>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </ScrollView>
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
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#202124",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#5f6368",
    textAlign: "center",
    maxWidth: 300,
  },

  /* Table header */
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5f6368",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Columns */
  colDate: { width: 130 },
  colTranscript: { flex: 1, minWidth: 150 },
  colIntent: { width: 160 },
  colConfidence: { width: 80, textAlign: "center" },
  colLang: { width: 50, textAlign: "center" },
  colStatus: { width: 90, alignItems: "center" },
  colActions: { width: 70, alignItems: "center" },

  /* Table row */
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e0e0e0",
  },
  tableRowExpanded: { backgroundColor: "#f5f7ff" },
  td: { fontSize: 13, color: "#333" },

  intentBadge: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
  },

  statusBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  statusConfirmed: { backgroundColor: "#e8f5e9", color: "#2e7d32" },
  statusEdited: { backgroundColor: "#fff3e0", color: "#e65100" },

  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  deleteBtnText: { color: "#d32f2f", fontSize: 11, fontWeight: "600" },

  /* Expanded detail */
  expandedRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fafbff",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e0e0e0",
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5f6368",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
  },
  expandValue: { fontSize: 14, color: "#333", lineHeight: 20 },

  expandIntent: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1a73e8",
  },
  expandIntentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a73e8",
    marginBottom: 4,
  },
  expandEntityRow: { flexDirection: "row", marginBottom: 2 },
  expandEntityKey: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    minWidth: 80,
  },
  expandEntityVal: { fontSize: 13, color: "#333" },

  airtableIdText: {
    fontSize: 11,
    color: "#999",
    marginTop: 12,
    fontStyle: "italic",
  },
});
