"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TicketDetail } from "../../../lib/types";
import { fetchTicket } from "../../../lib/api";
import TicketBadges from "../../../components/ticket-detail/TicketBadges";
import AITriageCard from "../../../components/ticket-detail/AITriageCard";
import ChangelogReview from "../../../components/ticket-detail/ChangelogReview";
import TicketTimeline from "../../../components/ticket-detail/TicketTimeline";
import DataComparison from "../../../components/ticket-detail/DataComparison";
import SourcesList from "../../../components/ticket-detail/SourcesList";
import StatusActions from "../../../components/ticket-detail/StatusActions";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
