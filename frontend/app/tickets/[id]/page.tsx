"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TicketDetail, TicketGroup } from "../../../lib/types";
import { fetchTicket, fetchTicketGroups, addTicketsToGroup, removeTicketFromGroup } from "../../../lib/api";
import TicketBadges from "../../../components/ticket-detail/TicketBadges";
import AITriageCard from "../../../components/ticket-detail/AITriageCard";
import ChangelogReview from "../../../components/ticket-detail/ChangelogReview";
import TicketTimeline from "../../../components/ticket-detail/TicketTimeline";
import DataComparison from "../../../components/ticket-detail/DataComparison";
import SourcesList from "../../../components/ticket-detail/SourcesList";
import StatusActions from "../../../components/ticket-detail/StatusActions";
import SearchInput from "../../../components/SearchInput";
import Toast from "../../../components/Toast";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<TicketGroup[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const loadTicket = useCallback(async () => {
    try {
      const data = await fetchTicket(id);
      setTicket(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleRemoveFromGroup = async () => {
    if (!ticket?.ticket_group) return;
    try {
      await removeTicketFromGroup(ticket.ticket_group.id, ticket.id);
      setToast({ message: "Removed from group", type: "success" });
      loadTicket();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to remove", type: "error" });
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    try {
      await addTicketsToGroup(groupId, [ticket!.id]);
      setToast({ message: "Added to group", type: "success" });
      setShowGroupPicker(false);
      loadTicket();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to add", type: "error" });
    }
  };

  const handleShowGroupPicker = async () => {
    try {
      const groups = await fetchTicketGroups("open");
      setOpenGroups(groups);
      setShowGroupPicker(true);
    } catch {
      setToast({ message: "Failed to load groups", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <p className="text-lg">Loading ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || "Ticket not found"}</p>
          <Link href="/" className="link-brand">
            Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const notionUrl = ticket.notion_page_id
    ? `https://notion.so/${ticket.notion_page_id}`
    : null;

  return (
    <div className="min-h-screen">
      <header className="header-sticky">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-text-secondary hover:text-text hover:underline">
            Back to tickets
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Title + badges + status actions */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {ticket.title}
          </h1>
          <TicketBadges
            priority={ticket.priority}
            channel={ticket.original_channel}
            status={ticket.status}
            ticketType={ticket.ticket_type}
          />
          <div className="mt-3">
            <StatusActions
              ticketId={ticket.id}
              currentStatus={ticket.status}
              onStatusChange={loadTicket}
            />
          </div>
        </div>

        {/* Ticket Group Info */}
        <div className="card">
          <h2 className="section-title mb-2">Ticket Group</h2>
          {ticket.ticket_group ? (
            <div className="flex items-center gap-3">
              <Link href="/ticket-groups" className="link-brand font-medium">
                {ticket.ticket_group.name}
              </Link>
              <span className={`badge text-xs ${
                ticket.ticket_group.status === "open"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {ticket.ticket_group.status}
              </span>
              <button
                onClick={handleRemoveFromGroup}
                className="btn-secondary text-xs px-2 py-1 ml-auto"
              >
                Remove from group
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Not in a group</span>
              <button
                onClick={handleShowGroupPicker}
                className="btn-secondary text-xs px-2 py-1"
              >
                Add to Group
              </button>
              {showGroupPicker && (
                <div className="ml-2 flex items-center gap-2">
                  {openGroups.length === 0 ? (
                    <span className="text-xs text-gray-400">No open groups</span>
                  ) : (
                    <>
                      <SearchInput
                        value={groupSearch}
                        onChange={setGroupSearch}
                        placeholder="Filter groups..."
                        className="w-40"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleAddToGroup(e.target.value);
                        }}
                        className="border border-gray-300 rounded text-xs px-2 py-1"
                        defaultValue=""
                      >
                        <option value="" disabled>Select a group...</option>
                        {openGroups
                          .filter((g) => {
                            if (!groupSearch) return true;
                            const q = groupSearch.toLowerCase();
                            return g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
                          })
                          .map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="card">
            <h2 className="section-title mb-2">
              Description
            </h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
        )}

        {/* Reporter + Sources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="section-title mb-2">
              Reporter
            </h2>
            {ticket.reporter ? (
              <div>
                <p className="text-gray-900 font-medium">{ticket.reporter.name}</p>
                {ticket.reporter.email && (
                  <p className="text-sm text-gray-500">{ticket.reporter.email}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Unknown</p>
            )}
          </div>

          <SourcesList sources={ticket.sources} />
        </div>

        {/* Notion link */}
        {notionUrl && (
          <div className="card">
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-brand font-medium"
            >
              View in Notion
            </a>
          </div>
        )}

        <AITriageCard
          aiSummary={ticket.ai_summary}
          aiSuggestedType={ticket.ai_suggested_type}
          aiSuggestedPriority={ticket.ai_suggested_priority}
          enrichmentStatus={ticket.enrichment_status}
        />

        <ChangelogReview ticketId={ticket.id} ticketStatus={ticket.status} />

        <TicketTimeline events={ticket.events} />

        <DataComparison ticket={ticket} />
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
