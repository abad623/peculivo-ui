import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useEmails } from "@/lib/EmailsContext";

export default function EmailsScreen() {
  const { emails, removeEmail } = useEmails();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Emails</Text>
        <Text style={s.headerSub}>
          {emails.length} email{emails.length !== 1 ? "s" : ""} sent
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {emails.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{"\u2709\uFE0F"}</Text>
            <Text style={s.emptyTitle}>No emails sent yet</Text>
            <Text style={s.emptyText}>
              Say something like "Send an email to Thomas about the project
              update" in the Voice Assistant.
            </Text>
          </View>
        ) : (
          <>
            {/* Table header */}
            <View style={s.tableHeader}>
              <Text style={[s.th, s.colStatus]}>Status</Text>
              <Text style={[s.th, s.colTo]}>To</Text>
              <Text style={[s.th, s.colSubject]}>Subject</Text>
              <Text style={[s.th, s.colDate]}>Sent</Text>
              <Text style={[s.th, s.colActions]}>Actions</Text>
            </View>

            {emails.map((email) => (
              <React.Fragment key={email.id}>
                <TouchableOpacity
                  style={[
                    s.tableRow,
                    expandedId === email.id && s.tableRowExpanded,
                  ]}
                  onPress={() =>
                    setExpandedId(expandedId === email.id ? null : email.id)
                  }
                  activeOpacity={0.7}
                >
                  <View style={s.colStatus}>
                    <Text style={s.sentBadge}>Sent</Text>
                  </View>
                  <Text style={[s.td, s.colTo]}>{email.to}</Text>
                  <Text style={[s.td, s.colSubject]} numberOfLines={1}>
                    {email.subject}
                  </Text>
                  <Text style={[s.td, s.colDate]}>
                    {formatDate(email.sentAt)}
                  </Text>
                  <View style={s.colActions}>
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        removeEmail(email.id);
                      }}
                    >
                      <Text style={s.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {expandedId === email.id && (
                  <View style={s.expandedRow}>
                    <Text style={s.expandLabel}>To:</Text>
                    <Text style={s.expandValue}>
                      {email.to}
                      {email.toEmail ? ` <${email.toEmail}>` : ""}
                    </Text>
                    <Text style={s.expandLabel}>Subject:</Text>
                    <Text style={s.expandValue}>{email.subject}</Text>
                    <Text style={s.expandLabel}>Body:</Text>
                    <Text style={s.expandBody}>{email.body}</Text>
                    <Text style={s.expandLabel}>Original context:</Text>
                    <Text style={s.expandContext}>{email.context}</Text>
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

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#202124", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#5f6368", textAlign: "center", maxWidth: 340 },

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
  th: { fontSize: 12, fontWeight: "700", color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5 },
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

  colStatus: { width: 60, alignItems: "center" },
  colTo: { width: 140 },
  colSubject: { flex: 1, minWidth: 150 },
  colDate: { width: 140 },
  colActions: { width: 70, alignItems: "center" },

  sentBadge: {
    fontSize: 11, fontWeight: "700", color: "#2e7d32",
    backgroundColor: "#e8f5e9", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, overflow: "hidden",
  },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: "#ffcdd2" },
  deleteBtnText: { color: "#d32f2f", fontSize: 11, fontWeight: "600" },

  expandedRow: {
    paddingHorizontal: 24, paddingVertical: 16, backgroundColor: "#fafbff",
    borderWidth: 1, borderTopWidth: 0, borderColor: "#e0e0e0",
  },
  expandLabel: { fontSize: 11, fontWeight: "700", color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  expandValue: { fontSize: 14, color: "#333" },
  expandBody: { fontSize: 14, color: "#333", lineHeight: 22 },
  expandContext: { fontSize: 13, color: "#888", fontStyle: "italic" },
});
