import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Email {
  id: string;
  to: string;
  toEmail?: string;
  subject: string;
  body: string;
  context: string; // original user request
  sentAt: string;
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

export interface EmailDraft {
  to: string;
  toEmail?: string;
  subject: string;
  body: string;
  context: string;
}

interface EmailsContextValue {
  emails: Email[];
  sendEmail: (draft: EmailDraft) => Email;
  removeEmail: (id: string) => void;
}

const EmailsContext = createContext<EmailsContextValue | null>(null);

export function EmailsProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);

  useEffect(() => {
    setEmails(load());
  }, []);

  const sendEmail = useCallback((draft: EmailDraft) => {
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

  return (
    <EmailsContext.Provider value={{ emails, sendEmail, removeEmail }}>
      {children}
    </EmailsContext.Provider>
  );
}

export function useEmails() {
  const ctx = useContext(EmailsContext);
  if (!ctx) throw new Error("useEmails must be used inside EmailsProvider");
  return ctx;
}
