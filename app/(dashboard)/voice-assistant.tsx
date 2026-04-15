import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { transcribeAudio } from "@/lib/whisper";
import { classifyIntent, IntentItem } from "@/lib/intent";
import { useIntents } from "@/lib/IntentsContext";
import { useInvoices } from "@/lib/InvoicesContext";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isVoice?: boolean;
  intentData?: { intents: IntentItem[]; language: string };
  intentStatus?: "pending" | "confirmed" | "editing";
  transcript?: string; // original transcript that produced this intent
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const INTENT_COLORS: Record<string, string> = {
  ADD_CONTACT: "#4caf50",
  UPDATE_CONTACT: "#2196f3",
  LOG_ACTIVITY: "#9c27b0",
  LOG_TIME: "#ff9800",
  CREATE_PROJECT: "#00bcd4",
  UPDATE_PROJECT: "#3f51b5",
  GENERATE_INVOICE: "#e91e63",
  SEND_INVOICE: "#f44336",
  GENERATE_CONTRACT: "#607d8b",
  SET_REMINDER: "#ffc107",
  MARK_PAYMENT: "#4caf50",
  SEND_PAYMENT_REMINDER: "#ff5722",
  QUERY: "#795548",
  UNKNOWN: "#9e9e9e",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VoiceAssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your Peculivo voice assistant. Type a message or tap the microphone to speak.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIntents, setEditIntents] = useState<IntentItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();
  const { addRecord } = useIntents();
  const { createInvoice } = useInvoices();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const addMessage = useCallback(
    (msg: Omit<ChatMessage, "id">) => {
      const m = { ...msg, id: uid() };
      setMessages((prev) => [...prev, m]);
      scrollToBottom();
      return m.id;
    },
    [scrollToBottom]
  );

  const updateMessage = useCallback(
    (id: string, updates: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
      );
    },
    []
  );

  /* ---------- Process transcript through intent API ---------- */

  const processTranscript = useCallback(
    async (transcript: string) => {
      setIsProcessing(true);
      const thinkingId = addMessage({
        role: "assistant",
        text: "Analyzing intent...",
      });

      try {
        const result = await classifyIntent(transcript);
        updateMessage(thinkingId, {
          text: "Here's what I understood:",
          intentData: result,
          intentStatus: "pending",
          transcript,
        });
      } catch (err: any) {
        updateMessage(thinkingId, {
          text: `Error classifying intent: ${err.message}`,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [addMessage, updateMessage]
  );

  /* ---------- Send text message ---------- */

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    setInputText("");

    addMessage({ role: "user", text });
    await processTranscript(text);
  }, [inputText, isProcessing, addMessage, processTranscript]);

  /* ---------- Voice toggle ---------- */

  const handleVoiceToggle = useCallback(async () => {
    if (isProcessing) return;

    if (isRecording) {
      try {
        const audioBlob = await stopRecording();
        setIsProcessing(true);
        const transcribingId = addMessage({
          role: "assistant",
          text: "Transcribing audio...",
        });

        try {
          const whisperResult = await transcribeAudio(audioBlob);
          updateMessage(transcribingId, {
            text: `Transcribed (${whisperResult.language}):`,
          });
          addMessage({
            role: "user",
            text: whisperResult.transcript,
            isVoice: true,
          });
          await processTranscript(whisperResult.transcript);
        } catch (err: any) {
          updateMessage(transcribingId, {
            text: `Transcription error: ${err.message}`,
          });
          setIsProcessing(false);
        }
      } catch (err: any) {
        addMessage({ role: "assistant", text: `Recording error: ${err.message}` });
      }
    } else {
      try {
        await startRecording();
      } catch (err: any) {
        addMessage({
          role: "assistant",
          text: `Microphone error: ${err.message}`,
        });
      }
    }
  }, [
    isRecording,
    isProcessing,
    stopRecording,
    startRecording,
    addMessage,
    updateMessage,
    processTranscript,
  ]);

  /* ---------- Confirm intent ---------- */

  const handleConfirm = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.intentData || !msg.transcript) return;
      updateMessage(msg.id, { intentStatus: "confirmed" });

      await addRecord(
        msg.transcript,
        msg.intentData.language,
        msg.intentData.intents,
        "confirmed"
      );

      // Auto-generate invoice if GENERATE_INVOICE intent detected
      const invoiceIntent = msg.intentData.intents.find(
        (i) => i.intent === "GENERATE_INVOICE"
      );
      if (invoiceIntent) {
        const inv = createInvoice(invoiceIntent.entities, msg.intentData.language);
        addMessage({
          role: "assistant",
          text: `Saved! Invoice ${inv.invoiceNumber} created for ${inv.clientName} — ${inv.currency === "EUR" ? "\u20AC" : "$"}${inv.total.toFixed(2)}. View it in the Invoices tab.`,
        });
      } else {
        addMessage({
          role: "assistant",
          text: "Saved! The intent has been recorded.",
        });
      }
    },
    [updateMessage, addRecord, addMessage, createInvoice]
  );

  /* ---------- Edit intent ---------- */

  const handleStartEdit = useCallback(
    (msg: ChatMessage) => {
      if (!msg.intentData) return;
      setEditingId(msg.id);
      setEditIntents(JSON.parse(JSON.stringify(msg.intentData.intents)));
      updateMessage(msg.id, { intentStatus: "editing" });
    },
    [updateMessage]
  );

  const handleSaveEdit = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.intentData || !msg.transcript) return;

      const updatedData = { ...msg.intentData, intents: editIntents };
      updateMessage(msg.id, { intentData: updatedData, intentStatus: "confirmed" });
      setEditingId(null);

      await addRecord(
        msg.transcript,
        updatedData.language,
        editIntents,
        "edited"
      );

      const invoiceIntent = editIntents.find(
        (i) => i.intent === "GENERATE_INVOICE"
      );
      if (invoiceIntent) {
        const inv = createInvoice(invoiceIntent.entities, updatedData.language);
        addMessage({
          role: "assistant",
          text: `Saved! Invoice ${inv.invoiceNumber} created for ${inv.clientName} — ${inv.currency === "EUR" ? "\u20AC" : "$"}${inv.total.toFixed(2)}. View it in the Invoices tab.`,
        });
      } else {
        addMessage({
          role: "assistant",
          text: "Saved the edited intent!",
        });
      }
    },
    [editIntents, updateMessage, addRecord, addMessage, createInvoice]
  );

  const handleCancelEdit = useCallback(
    (msgId: string) => {
      setEditingId(null);
      updateMessage(msgId, { intentStatus: "pending" });
    },
    [updateMessage]
  );

  const updateEditEntity = useCallback(
    (intentIdx: number, key: string, value: string) => {
      setEditIntents((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        copy[intentIdx].entities[key] = value;
        return copy;
      });
    },
    []
  );

  const updateEditIntentType = useCallback(
    (intentIdx: number, newType: string) => {
      setEditIntents((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        copy[intentIdx].intent = newType;
        return copy;
      });
    },
    []
  );

  /* ---------- Render helpers ---------- */

  const renderIntentCard = (msg: ChatMessage) => {
    if (!msg.intentData) return null;
    const isEditing = msg.intentStatus === "editing" && editingId === msg.id;
    const intents = isEditing ? editIntents : msg.intentData.intents;

    return (
      <View style={s.intentCard}>
        <Text style={s.intentLang}>
          Language: {msg.intentData.language.toUpperCase()}
        </Text>

        {intents.map((intent, idx) => (
          <View key={idx} style={s.intentItem}>
            <View style={s.intentHeader}>
              {isEditing ? (
                <TextInput
                  style={[s.intentBadge, { backgroundColor: INTENT_COLORS[intent.intent] || "#666", color: "#fff" }]}
                  value={intent.intent}
                  onChangeText={(v) => updateEditIntentType(idx, v.toUpperCase())}
                />
              ) : (
                <Text
                  style={[
                    s.intentBadge,
                    { backgroundColor: INTENT_COLORS[intent.intent] || "#666" },
                  ]}
                >
                  {intent.intent}
                </Text>
              )}
              <Text style={s.confidence}>
                {(intent.confidence * 100).toFixed(0)}%
              </Text>
            </View>

            {Object.entries(intent.entities).length > 0 && (
              <View style={s.entities}>
                {Object.entries(intent.entities).map(([key, val]) => (
                  <View key={key} style={s.entityRow}>
                    <Text style={s.entityKey}>{key}:</Text>
                    {isEditing ? (
                      <TextInput
                        style={s.entityInput}
                        value={String(val)}
                        onChangeText={(v) => updateEditEntity(idx, key, v)}
                      />
                    ) : (
                      <Text style={s.entityVal}>{String(val)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Action buttons */}
        {msg.intentStatus === "pending" && (
          <View style={s.intentActions}>
            <Text style={s.confirmQuestion}>Is this correct?</Text>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.actionBtn, s.confirmBtn]}
                onPress={() => handleConfirm(msg)}
              >
                <Text style={s.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.editBtn]}
                onPress={() => handleStartEdit(msg)}
              >
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isEditing && (
          <View style={s.intentActions}>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.actionBtn, s.confirmBtn]}
                onPress={() => handleSaveEdit(msg)}
              >
                <Text style={s.confirmBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.editBtn]}
                onPress={() => handleCancelEdit(msg.id)}
              >
                <Text style={s.editBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {msg.intentStatus === "confirmed" && !isEditing && (
          <View style={s.savedBadge}>
            <Text style={s.savedText}>Saved</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === "user";
    return (
      <View
        key={msg.id}
        style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAssistant]}
      >
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
          {msg.isVoice && (
            <Text style={s.voiceLabel}>Voice message</Text>
          )}
          <Text style={[s.msgText, isUser && s.msgTextUser]}>{msg.text}</Text>
          {msg.intentData && renderIntentCard(msg)}
        </View>
      </View>
    );
  };

  /* ---------- Main render ---------- */

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Voice Assistant</Text>
        <Text style={s.headerSub}>
          Speak or type to classify CRM intents
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={s.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {isProcessing && (
          <View style={[s.msgRow, s.msgRowAssistant]}>
            <View style={[s.bubble, s.bubbleAssistant]}>
              <ActivityIndicator size="small" color="#1a73e8" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Recording indicator */}
      {isRecording && (
        <View style={s.recordingBar}>
          <View style={s.recordingDot} />
          <Text style={s.recordingText}>Recording... tap mic to stop</Text>
        </View>
      )}

      {/* Input area */}
      <View style={s.inputArea}>
        <TextInput
          style={s.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          editable={!isProcessing}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!inputText.trim() || isProcessing) && s.btnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
        >
          <Text style={s.sendBtnText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.micBtn,
            isRecording && s.micBtnRecording,
            isProcessing && s.btnDisabled,
          ]}
          onPress={handleVoiceToggle}
          disabled={isProcessing}
        >
          <Text style={s.micBtnText}>{isRecording ? "\u23F9" : "\uD83C\uDF99\uFE0F"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#202124" },
  headerSub: { fontSize: 13, color: "#5f6368", marginTop: 2 },

  /* Messages */
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  msgRow: { marginBottom: 12, flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAssistant: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: "#1a73e8",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  voiceLabel: {
    fontSize: 10,
    color: "#ffffffaa",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  msgText: { fontSize: 15, color: "#202124", lineHeight: 22 },
  msgTextUser: { color: "#fff" },

  /* Intent card */
  intentCard: {
    marginTop: 10,
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e4ea",
  },
  intentLang: {
    fontSize: 11,
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  intentItem: { marginBottom: 8 },
  intentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  intentBadge: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  confidence: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
    fontWeight: "600",
  },

  entities: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
    marginLeft: 4,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  entityKey: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginRight: 6,
    minWidth: 70,
  },
  entityVal: { fontSize: 13, color: "#333" },
  entityInput: {
    fontSize: 13,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#1a73e8",
    paddingVertical: 2,
    paddingHorizontal: 4,
    flex: 1,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },

  intentActions: { marginTop: 10 },
  confirmQuestion: {
    fontSize: 13,
    color: "#555",
    marginBottom: 8,
    fontWeight: "500",
  },
  btnRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtn: { backgroundColor: "#1a73e8" },
  confirmBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  editBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dadce0",
  },
  editBtnText: { color: "#333", fontSize: 13, fontWeight: "600" },

  savedBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savedText: { color: "#2e7d32", fontSize: 12, fontWeight: "600" },

  /* Recording bar */
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff3f3",
    borderTopWidth: 1,
    borderTopColor: "#ffcccc",
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f44336",
    marginRight: 10,
  },
  recordingText: { color: "#d32f2f", fontSize: 13, fontWeight: "500" },

  /* Input area */
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: "#202124",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  },
  sendBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
  },
  micBtnRecording: { backgroundColor: "#ffcdd2" },
  micBtnText: { fontSize: 20 },
  btnDisabled: { opacity: 0.5 },
});
