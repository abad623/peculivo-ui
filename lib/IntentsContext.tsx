import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  IntentRecord,
  getLocalRecords,
  addLocalRecord,
  updateLocalRecord,
  deleteLocalRecord,
  syncToAirtable,
} from "./airtable";
import type { IntentResponse } from "./intent";

interface IntentsContextValue {
  records: IntentRecord[];
  addRecord: (
    transcript: string,
    language: string,
    intents: IntentResponse["intents"],
    status: "confirmed" | "edited"
  ) => Promise<void>;
  updateRecord: (id: string, updates: Partial<IntentRecord>) => void;
  deleteRecord: (id: string) => void;
  refresh: () => void;
}

const IntentsContext = createContext<IntentsContextValue | null>(null);

export function IntentsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<IntentRecord[]>([]);

  useEffect(() => {
    setRecords(getLocalRecords());
  }, []);

  const refresh = useCallback(() => {
    setRecords(getLocalRecords());
  }, []);

  const addRecord = useCallback(
    async (
      transcript: string,
      language: string,
      intents: IntentResponse["intents"],
      status: "confirmed" | "edited"
    ) => {
      const record: IntentRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        transcript,
        language,
        intents,
        status,
        createdAt: new Date().toISOString(),
      };

      const updated = addLocalRecord(record);
      setRecords(updated);

      // Try Airtable sync in background
      const airtableId = await syncToAirtable(record);
      if (airtableId) {
        const synced = updateLocalRecord(record.id, { airtableId });
        setRecords(synced);
      }
    },
    []
  );

  const updateRecordFn = useCallback(
    (id: string, updates: Partial<IntentRecord>) => {
      const updated = updateLocalRecord(id, updates);
      setRecords(updated);
    },
    []
  );

  const deleteRecordFn = useCallback((id: string) => {
    const updated = deleteLocalRecord(id);
    setRecords(updated);
  }, []);

  return (
    <IntentsContext.Provider
      value={{
        records,
        addRecord,
        updateRecord: updateRecordFn,
        deleteRecord: deleteRecordFn,
        refresh,
      }}
    >
      {children}
    </IntentsContext.Provider>
  );
}

export function useIntents() {
  const ctx = useContext(IntentsContext);
  if (!ctx) throw new Error("useIntents must be used inside IntentsProvider");
  return ctx;
}
