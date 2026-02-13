"use client";

import { useState } from "react";
import { GroupingSuggestion, SuggestionTicket } from "../../lib/types";
import { createTicketGroup, addTicketsToGroup } from "../../lib/api";
import { CHANNEL_ICONS, CHANNEL_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from "../../lib/constants";

interface SuggestionsPanelProps {
  suggestions: GroupingSuggestion[];
  tickets: SuggestionTicket[];
  onDone: () => void;
  onToast: (message: string, type: "success" | "error") => void;
}

export default function SuggestionsPanel({ suggestions: initialSuggestions, tickets, onDone, onToast }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const ticketMap = new Map<string, SuggestionTicket>();
  tickets.forEach((t) => ticketMap.set(t.id, t));

  const dismiss = (index: number) => {
    const next = suggestions.filter((_, i) => i !== index);
    setSuggestions(next);
    if (next.length === 0) onDone();
  };

  const handleCreateGroup = async (suggestion: GroupingSuggestion, index: number) => {
    setLoadingIndex(index);
    try {
      await createTicketGroup(suggestion.name, suggestion.ticket_ids, suggestion.ticket_ids[0]);
      onToast(`Group "${suggestion.name}" created`, "success");
      dismiss(index);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to create group", "error");
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleAddToGroup = async (suggestion: GroupingSuggestion, index: number) => {
    setLoadingIndex(index);
    try {
      const groupedTicket = suggestion.ticket_ids
        .map((id) => ticketMap.get(id))
        .find((t) => t?.ticket_group_id);

      if (!groupedTicket?.ticket_group_id) return;

      const ungroupedIds = suggestion.ticket_ids.filter((id) => {
        const t = ticketMap.get(id);
        return !t?.ticket_group_id;
      });

      await addTicketsToGroup(groupedTicket.ticket_group_id, ungroupedIds);
      onToast(`Added ${ungroupedIds.length} ticket${ungroupedIds.length !== 1 ? "s" : ""} to group "${groupedTicket.ticket_group_name}"`, "success");
      dismiss(index);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to add tickets to group", "error");
    } finally {
      setLoadingIndex(null);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          AI Suggestions ({suggestions.length})
        </h3>
        <button
          onClick={onDone}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Dismiss all
        </button>
      </div>

      {suggestions.map((suggestion, index) => {
        const suggestionTickets = suggestion.ticket_ids
          .map((id) => ticketMap.get(id))
          .filter(Boolean) as SuggestionTicket[];

        const hasGroupedTickets = suggestionTickets.some((t) => t.ticket_group_id);
        const allUngrouped = suggestionTickets.every((t) => !t.ticket_group_id);

        return (
          <div key={index} className="card border border-indigo-100 bg-indigo-50/30">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{suggestion.name}</h4>
                <p className="text-sm text-gray-500 mt-0.5">{suggestion.reason}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {allUngrouped ? (
                  <button
                    onClick={() => handleCreateGroup(suggestion, index)}
                    disabled={loadingIndex === index}
                    className="btn-primary px-3 py-1.5 text-sm"
                  >
                    {loadingIndex === index ? "Creating..." : "Create Group"}
                  </button>
                ) : hasGroupedTickets ? (
                  <button
                    onClick={() => handleAddToGroup(suggestion, index)}
                    disabled={loadingIndex === index}
                    className="btn-primary px-3 py-1.5 text-sm"
                  >
                    {loadingIndex === index ? "Adding..." : "Add to Group"}
                  </button>
                ) : null}
                <button
                  onClick={() => dismiss(index)}
                  className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="border-t border-indigo-100 pt-2">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1 px-2">Title</th>
                    <th className="text-left py-1 px-2">Channel</th>
                    <th className="text-left py-1 px-2">Priority</th>
                    <th className="text-left py-1 px-2">Group</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestionTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-indigo-50">
                      <td className="py-1.5 px-2 text-sm text-gray-800">{ticket.title}</td>
                      <td className="py-1.5 px-2">
                        <span className={`badge-channel text-xs ${CHANNEL_COLORS[ticket.original_channel] || ""}`}>
                          {CHANNEL_ICONS[ticket.original_channel]} {ticket.original_channel}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`badge-priority text-xs ${PRIORITY_COLORS[ticket.priority] || "bg-gray-200"}`}>
                          {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-sm">
                        {ticket.ticket_group_name ? (
                          <span className="badge bg-indigo-100 text-indigo-700 text-xs">
                            {ticket.ticket_group_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">ungrouped</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
