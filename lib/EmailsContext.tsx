import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { draftEmail } from "./emailDrafter";

export interface Email {
  id: string;
  to: string;
  toEmail?: string;
  subject: string;
  body: string;
  context: string;
  sentAt: string;
}

export interface EmailDraft {
  to: string;
  toEmail?: string;
  subject: string;
  body: string;
  context: string;
}

const STORAGE_KEY = "peculivo_emails";

function load(): Email[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list: Email[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface EmailsContextValue {
  emails: Email[];
  sendEmail: (draft: EmailDraft) => Email;
  removeEmail: (id: string) => void;
  openComposer: (to: string, context: string, toEmail?: string) => void;
}

const EmailsContext = createContext<EmailsContextValue | null>(null);

export function EmailsProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [composing, setComposing] = useState<EmailDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setEmails(load());
  }, []);

  const sendEmailFn = useCallback((draft: EmailDraft) => {
    const email: Email = {
      ...draft,
      id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    const updated = [email, ...load()];
    save(updated);
    setEmails(updated);
    return email;
  }, []);

  const removeEmail = useCallback((id: string) => {
    const updated = load().filter((e) => e.id !== id);
    save(updated);
    setEmails(updated);
  }, []);

  const openComposer = useCallback(async (to: string, context: string, toEmail?: string) => {
    setIsGenerating(true);
    setComposing({ to, toEmail, subject: "Generating...", body: "", context });

    try {
      const result = await draftEmail(to, context);
      setComposing({ to, toEmail, subject: result.subject, body: result.body, context });
    } catch (err: any) {
      setComposing({
        to, toEmail,
        subject: `Email to ${to}`,
        body: `[Draft failed: ${err.message}]\n\nWrite your email here.`,
        context,
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!composing || !composing.body.trim()) return;
    sendEmailFn(composing);
    setComposing(null);
  }, [composing, sendEmailFn]);

  return (
    <EmailsContext.Provider value={{ emails, sendEmail: sendEmailFn, removeEmail, openComposer }}>
      {children}

      {/* Compose Modal — always mounted */}
      <Modal visible={!!composing} animationType="fade" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {isGenerating ? "Drafting email..." : "Compose Email"}
              </Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setComposing(null)}>
                <Text style={s.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {isGenerating ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color="#1a73e8" />
                <Text style={s.loadingText}>Generating email with AI...</Text>
              </View>
            ) : composing ? (
              <ScrollView style={s.composeBody}>
                <Text style={s.fieldLabel}>To</Text>
                <TextInput
                  style={s.fieldInput}
                  value={composing.to}
                  onChangeText={(v) => setComposing({ ...composing, to: v })}
                  placeholder="Recipient name"
                />
                <Text style={s.fieldLabel}>Email</Text>
                <TextInput
                  style={s.fieldInput}
                  value={composing.toEmail || ""}
                  onChangeText={(v) => setComposing({ ...composing, toEmail: v })}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                />
                <Text style={s.fieldLabel}>Subject</Text>
                <TextInput
                  style={s.fieldInput}
                  value={composing.subject}
                  onChangeText={(v) => setComposing({ ...composing, subject: v })}
                  placeholder="Email subject"
                />
                <Text style={s.fieldLabel}>Body</Text>
                <TextInput
                  style={[s.fieldInput, s.bodyInput]}
                  value={composing.body}
                  onChangeText={(v) => setComposing({ ...composing, body: v })}
                  placeholder="Email body"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.sendBtn, !composing.body.trim() && s.btnDisabled]}
                  onPress={handleSend}
                  disabled={!composing.body.trim()}
                >
                  <Text style={s.sendBtnText}>Send Email</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </EmailsContext.Provider>
  );
}

export function useEmails() {
  const ctx = useContext(EmailsContext);
  if (!ctx) throw new Error("useEmails must be used inside EmailsProvider");
  return ctx;
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "90%", maxWidth: 640, maxHeight: "90%", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", backgroundColor: "#fafafa",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#202124" },
  closeBtn: { backgroundColor: "#f0f0f0", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  closeBtnText: { color: "#333", fontSize: 13, fontWeight: "600" },
  loadingBox: { padding: 60, alignItems: "center", gap: 16 },
  loadingText: { fontSize: 14, color: "#5f6368" },
  composeBody: { padding: 20 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#5f6368", textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
  fieldInput: {
    borderWidth: 1, borderColor: "#dadce0", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: "#202124", backgroundColor: "#fff",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  bodyInput: { minHeight: 200, textAlignVertical: "top" },
  sendBtn: { backgroundColor: "#1a73e8", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 20, marginBottom: 20 },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
});
