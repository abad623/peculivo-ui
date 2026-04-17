import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  contact?: string;
  createdAt: string;
}

const STORAGE_KEY = "peculivo_reminders";

function loadReminders(): Reminder[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReminders(list: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface RemindersContextValue {
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, "id" | "createdAt">) => Reminder;
  removeReminder: (id: string) => void;
  getRemindersForDate: (date: string) => Reminder[];
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setReminders(loadReminders());
  }, []);

  const addReminder = useCallback((r: Omit<Reminder, "id" | "createdAt">) => {
    const reminder: Reminder = {
      ...r,
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [reminder, ...loadReminders()];
    saveReminders(updated);
    setReminders(updated);
    return reminder;
  }, []);

  const removeReminder = useCallback((id: string) => {
    const updated = loadReminders().filter((r) => r.id !== id);
    saveReminders(updated);
    setReminders(updated);
  }, []);

  const getRemindersForDate = useCallback(
    (date: string) => reminders.filter((r) => r.date === date),
    [reminders]
  );

  return (
    <RemindersContext.Provider
      value={{ reminders, addReminder, removeReminder, getRemindersForDate }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used inside RemindersProvider");
  return ctx;
}
