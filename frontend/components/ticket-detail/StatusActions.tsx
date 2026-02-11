"use client";

import { useState } from "react";
import { simulateStatus } from "../../lib/api";
import Toast from "../Toast";

interface StatusActionsProps {
  ticketId: string;
  currentStatus: string;
  onStatusChange: () => void;
}

const TRANSITIONS: Record<string, { label: string; status: string }[]> = {
  open: [
    { label: "Start Progress", status: "in_progress" },
    { label: "Resolve", status: "resolved" },
    { label: "Close", status: "closed" },
  ],
  in_progress: [
    { label: "Resolve", status: "resolved" },
    { label: "Close", status: "closed" },
  ],
  resolved: [
    { label: "Reopen", status: "open" },
    { label: "Close", status: "closed" },
  ],
  closed: [
    { label: "Reopen", status: "open" },
  ],
};

export default function StatusActions({ ticketId, currentStatus, onStatusChange }: StatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const transitions = TRANSITIONS[currentStatus] || [];
  if (transitions.length === 0) return null;

  const handleTransition = async (status: string) => {
    setLoading(status);
    try {
      await simulateStatus(ticketId, status);
      setToast({ message: `Status changed to ${status}`, type: "success" });
      onStatusChange();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to update status", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Simulate Notion Actions:</span>
        {transitions.map((t) => (
          <button
            key={t.status}
            onClick={() => handleTransition(t.status)}
            disabled={loading !== null}
            className="btn-secondary px-3 py-1.5 disabled:opacity-50"
          >
            {loading === t.status ? "Updating..." : t.label}
          </button>
        ))}
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
