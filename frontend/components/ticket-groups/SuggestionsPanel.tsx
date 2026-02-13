"use client";

import { useState } from "react";
import Link from "next/link";
import { GroupingSuggestion, SuggestionTicket } from "../../lib/types";
import { createTicketGroup, addTicketsToGroup, fetchTicket } from "../../lib/api";
import { CHANNEL_ICONS, CHANNEL_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from "../../lib/constants";

const REDACTION_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  password: "Password",
  ssn: "SSN",
};

interface SuggestionsPanelProps {
  suggestions: GroupingSuggestion[];
  tickets: SuggestionTicket[];
  redactions?: Record<string, string[]>;
  onDone: () => void;
  onToast: (message: string, type: "success" | "error") => void;
}

interface CompletedGroup {
  groupId: string;
  groupName: string;
}

interface ConflictInfo {
  groupId: string;
  groupName: string;
  groupedTicketIds: string[];
  ungroupedTicketIds: string[];
}

export default function SuggestionsPanel({ suggestions: initialSuggestions, tickets, redactions, onDone, onToast }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Record<number, CompletedGroup>>({});
  const [conflicts, setConflicts] = useState<Record<number, ConflictInfo>>({});

  const ticketMap = new Map<string, SuggestionTicket>();
  tickets.forEach((t) => ticketMap.set(t.id, t));

  const dismiss = (index: number) => {
    const next = suggestions.filter((_, i) => i !== index);
    setSuggestions(next);
    if (next.length === 0) onDone();
  };

  const resolveConflict = async (suggestion: GroupingSuggestion, index: number) => {
    // Fetch fresh ticket data to find who's grouped and where
    const freshTickets = await Promise.all(
      suggestion.ticket_ids.map((id) => fetchTicket(id).catch(() => null))
    );

    const groupedTicket = freshTickets.find((t) => t?.ticket_group);
    if (!groupedTicket?.ticket_group) return null;

    const groupedIds = freshTickets.filter((t) => t?.ticket_group).map((t) => t!.id);
    const ungroupedIds = freshTickets.filter((t) => t && !t.ticket_group).map((t) => t!.id);

    const conflict: ConflictInfo = {
      groupId: groupedTicket.ticket_group.id,
      groupName: groupedTicket.ticket_group.name,
      groupedTicketIds: groupedIds,
      ungroupedTicketIds: ungroupedIds,
    };

    setConflicts((prev) => ({ ...prev, [index]: conflict }));
    return conflict;
  };

  const handleCreateGroup = async (suggestion: GroupingSuggestion, index: number) => {
    setLoadingIndex(index);
    try {
      const group = await createTicketGroup(suggestion.name, suggestion.ticket_ids, suggestion.ticket_ids[0]);
      setCompleted((prev) => ({ ...prev, [index]: { groupId: group.id, groupName: group.name } }));
      onToast(`Group "${suggestion.name}" created`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create group";
      if (msg.includes("already belong to a group")) {
        try {
          const conflict = await resolveConflict(suggestion, index);
          if (conflict) {
            onToast(
              `${conflict.groupedTicketIds.length} ticket${conflict.groupedTicketIds.length !== 1 ? "s" : ""} already in "${conflict.groupName}"`,
              "error"
            );
          } else {
            onToast(msg, "error");
          }
        } catch {
          onToast(msg, "error");
        }
      } else {
        onToast(msg, "error");
      }
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleAddUngrouped = async (index: number) => {
    const conflict = conflicts[index];
    if (!conflict) return;
    setLoadingIndex(index);
    try {
      const group = await addTicketsToGroup(conflict.groupId, conflict.ungroupedTicketIds);
      setCompleted((prev) => ({ ...prev, [index]: { groupId: group.id, groupName: group.name } }));
      setConflicts((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      onToast(
        `Added ${conflict.ungroupedTicketIds.length} ticket${conflict.ungroupedTicketIds.length !== 1 ? "s" : ""} to "${conflict.groupName}"`,
        "success"
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to add tickets", "error");
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

      if (!groupedTicket?.ticket_group_id) {
        onToast("No existing group found to add tickets to", "error");
        return;
      }

      const ungroupedIds = suggestion.ticket_ids.filter((id) => {
        const t = ticketMap.get(id);
        return !t?.ticket_group_id;
      });

      if (ungroupedIds.length === 0) {
        onToast(`All tickets are already grouped in "${groupedTicket.ticket_group_name}"`, "success");
        setCompleted((prev) => ({ ...prev, [index]: { groupId: groupedTicket.ticket_group_id!, groupName: groupedTicket.ticket_group_name || suggestion.name } }));
        return;
      }

      const group = await addTicketsToGroup(groupedTicket.ticket_group_id, ungroupedIds);
      setCompleted((prev) => ({ ...prev, [index]: { groupId: group.id, groupName: group.name } }));
      onToast(`Added ${ungroupedIds.length} ticket${ungroupedIds.length !== 1 ? "s" : ""} to group "${groupedTicket.ticket_group_name}"`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add tickets to group";
      if (msg.includes("already belong to a group")) {
        try {
          const conflict = await resolveConflict(suggestion, index);
          if (conflict && conflict.ungroupedTicketIds.length > 0) {
            onToast(
              `Some tickets moved since suggestions loaded — ${conflict.ungroupedTicketIds.length} can still be added`,
              "error"
            );
          } else if (conflict) {
            setCompleted((prev) => ({ ...prev, [index]: { groupId: conflict.groupId, groupName: conflict.groupName } }));
            onToast(`All tickets are already in "${conflict.groupName}"`, "success");
          } else {
            onToast(msg, "error");
          }
        } catch {
          onToast(msg, "error");
        }
      } else {
        onToast(msg, "error");
      }
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
        const allAlreadyGrouped = suggestionTickets.length > 0 && suggestionTickets.every((t) => t.ticket_group_id);

        return (
          <div key={index} className={`card border ${completed[index] ? "border-green-200 bg-green-50/30" : conflicts[index] ? "border-amber-200 bg-amber-50/30" : "border-indigo-100 bg-indigo-50/30"}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{suggestion.name}</h4>
                <p className="text-sm text-gray-500 mt-0.5">{suggestion.reason}</p>
                {conflicts[index] && (
                  <p className="text-xs text-amber-700 mt-1">
                    {conflicts[index].groupedTicketIds.length} ticket{conflicts[index].groupedTicketIds.length !== 1 ? "s" : ""} already
                    in &ldquo;{conflicts[index].groupName}&rdquo;
                    {conflicts[index].ungroupedTicketIds.length > 0 && (
                      <> &mdash; {conflicts[index].ungroupedTicketIds.length} can be added</>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {completed[index] ? (
                  <>
                    <Link
                      href={`/ticket-groups/${completed[index].groupId}`}
                      className="px-3 py-1.5 text-sm text-brand bg-brand-light rounded-lg hover:bg-brand-medium transition-colors"
                    >
                      View &ldquo;{completed[index].groupName}&rdquo;
                    </Link>
                    <button onClick={() => dismiss(index)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">
                      Dismiss
                    </button>
                  </>
                ) : conflicts[index] ? (
                  <>
                    <Link
                      href={`/ticket-groups/${conflicts[index].groupId}`}
                      className="px-3 py-1.5 text-sm text-brand bg-brand-light rounded-lg hover:bg-brand-medium transition-colors"
                    >
                      View &ldquo;{conflicts[index].groupName}&rdquo;
                    </Link>
                    {conflicts[index].ungroupedTicketIds.length > 0 && (
                      <button
                        onClick={() => handleAddUngrouped(index)}
                        disabled={loadingIndex === index}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        {loadingIndex === index
                          ? "Adding..."
                          : `Add ${conflicts[index].ungroupedTicketIds.length} to group`}
                      </button>
                    )}
                    <button onClick={() => dismiss(index)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">
                      Dismiss
                    </button>
                  </>
                ) : allAlreadyGrouped ? (
                  <>
                    <Link
                      href={`/ticket-groups/${suggestionTickets[0]?.ticket_group_id}`}
                      className="px-3 py-1.5 text-sm text-brand bg-brand-light rounded-lg hover:bg-brand-medium transition-colors"
                    >
                      View &ldquo;{suggestionTickets[0]?.ticket_group_name}&rdquo;
                    </Link>
                    <button onClick={() => dismiss(index)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
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
                    <button onClick={() => dismiss(index)} className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-indigo-100 pt-2">
              {suggestionTickets.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 px-2">No matching tickets found for this suggestion.</p>
              ) : (
                <div className="space-y-1 py-1">
                  {suggestionTickets.map((ticket) => {
                    const ticketRedactions = redactions?.[ticket.id];
                    return (
                      <div key={ticket.id} className="flex items-start gap-3 px-2 py-1 rounded hover:bg-indigo-50/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 truncate">{ticket.title}</span>
                            <span className={`badge-channel text-xs ${CHANNEL_COLORS[ticket.original_channel] || ""}`}>
                              {CHANNEL_ICONS[ticket.original_channel]} {ticket.original_channel}
                            </span>
                            <span className={`badge-priority text-xs ${PRIORITY_COLORS[ticket.priority] || "bg-gray-200"}`}>
                              {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                            </span>
                            {ticketRedactions && ticketRedactions.map((type) => (
                              <span
                                key={type}
                                className="inline-flex"
                                title={`${REDACTION_LABELS[type] || type} was redacted before sending to AI`}
                              >
                                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                                </svg>
                              </span>
                            ))}
                          </div>
                          {ticket.ticket_group_name ? (
                            <span className="badge bg-indigo-100 text-indigo-700 text-xs mt-0.5 inline-block">
                              {ticket.ticket_group_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs mt-0.5 inline-block">ungrouped</span>
                          )}
                          {(ticket.ai_summary || ticket.description) && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {ticket.ai_summary || ticket.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
