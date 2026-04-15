import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  InvoiceData,
  getInvoices,
  saveInvoice,
  deleteInvoice as deleteLocal,
  buildInvoiceFromEntities,
} from "./invoiceGenerator";

interface InvoicesContextValue {
  invoices: InvoiceData[];
  createInvoice: (entities: Record<string, string>, language?: string) => InvoiceData;
  removeInvoice: (id: string) => void;
  refresh: () => void;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);

  useEffect(() => {
    setInvoices(getInvoices());
  }, []);

  const createInvoice = useCallback((entities: Record<string, string>, language?: string) => {
    const inv = buildInvoiceFromEntities(entities, language);
    const updated = saveInvoice(inv);
    setInvoices(updated);
    return inv;
  }, []);

  const removeInvoice = useCallback((id: string) => {
    const updated = deleteLocal(id);
    setInvoices(updated);
  }, []);

  const refresh = useCallback(() => {
    setInvoices(getInvoices());
  }, []);

  return (
    <InvoicesContext.Provider value={{ invoices, createInvoice, removeInvoice, refresh }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error("useInvoices must be used inside InvoicesProvider");
  return ctx;
}
