"use client";

import { useEffect, useState, useCallback } from "react";
import { GroupingSuggestion, SuggestionTicket } from "../../../lib/types";
import { suggestTicketGroups } from "../../../lib/api";
import SuggestFilterModal, { SuggestFilters } from "../../../components/ticket-groups/SuggestFilterModal";
import SuggestionsPanel from "../../../components/ticket-groups/SuggestionsPanel";
import Toast from "../../../components/Toast";
import PageHeader from "../../../components/PageHeader";

const STORAGE_KEY = "ai_suggestions";

interface StoredSuggestions {
  suggestions: GroupingSuggestion[];
  tickets: SuggestionTicket[];
  redactions: Record<string, string[]>;
}

function loadFromStorage(): StoredSuggestions | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.suggestions?.length > 0 && Array.isArray(parsed.tickets)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(data: StoredSuggestions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function AISuggestionsPage() {
  const [suggestions, setSuggestions] = useState<GroupingSuggestion[] | null>(null);
  const [suggestionTickets, setSuggestionTickets] = useState<SuggestionTicket[]>([]);
  const [redactions, setRedactions] = useState<Record<string, string[]>>({});
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setSuggestions(stored.suggestions);
      setSuggestionTickets(stored.tickets);
      setRedactions(stored.redactions || {});
    }
  }, []);

  const handleSuggest = useCallback(async (filters: SuggestFilters) => {
    setShowSuggestModal(false);
    setSuggestLoading(true);
    try {
      const result = await suggestTicketGroups(filters);
      if (result.suggestions.length === 0) {
        setToast({ message: `No grouping suggestions found (${result.ticket_count} tickets analyzed)`, type: "success" });
        setSuggestions(null);
        clearStorage();
      } else {
        setSuggestions(result.suggestions);
        setSuggestionTickets(result.tickets);
        setRedactions(result.redactions || {});
        saveToStorage({ suggestions: result.suggestions, tickets: result.tickets, redactions: result.redactions || {} });
      }
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to get suggestions", type: "error" });
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const handleDone = useCallback(() => {
    setSuggestions(null);
    setSuggestionTickets([]);
    setRedactions({});
    clearStorage();
  }, []);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="AI Suggestions"
        subtitle="AI-powered grouping suggestions for ungrouped tickets"
      >
        <button
          onClick={() => setShowSuggestModal(true)}
          disabled={suggestLoading}
          className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {suggestLoading ? "Analyzing..." : "AI Suggest Groups"}
        </button>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {suggestLoading && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Analyzing tickets...</p>
            <p className="text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {!suggestLoading && suggestions && suggestions.length > 0 && (
          <SuggestionsPanel
            suggestions={suggestions}
            tickets={suggestionTickets}
            redactions={redactions}
            onDone={handleDone}
            onToast={(message, type) => setToast({ message, type })}
          />
        )}

        {!suggestLoading && (!suggestions || suggestions.length === 0) && (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <p className="text-lg">No AI suggestions yet</p>
            <p className="text-sm mt-2 mb-4">
              Run an analysis to get AI-powered grouping suggestions for your tickets
            </p>
            <button
              onClick={() => setShowSuggestModal(true)}
              className="btn-primary px-4 py-2"
            >
              AI Suggest Groups
            </button>
          </div>
        )}
      </main>

      {showSuggestModal && (
        <SuggestFilterModal
          onConfirm={handleSuggest}
          onClose={() => setShowSuggestModal(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
