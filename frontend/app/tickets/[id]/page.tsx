"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TicketDetail, TicketEvent } from "../../../lib/types";
import { fetchTicket } from "../../../lib/api";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CHANNEL_ICONS,
  CHANNEL_COLORS,
  TYPE_LABELS,
  STATUS_COLORS,
  EVENT_LABELS,
  EVENT_ICONS,
  timeAgo,
} from "../../../lib/constants";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTicket(id);
        setTicket(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load ticket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
          <Link href="/" className="text-blue-600 hover:underline">
            Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const notionUrl = ticket.notion_page_id
    ? `https://notion.so/${ticket.notion_page_id}`
    : null;

  // Sort events chronologically (oldest first) for the timeline
  const sortedEvents = [...ticket.events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Back to tickets
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Title + badges */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {ticket.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                PRIORITY_COLORS[ticket.priority] || "bg-gray-200"
              }`}
            >
              {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                CHANNEL_COLORS[ticket.original_channel] || ""
              }`}
            >
              <span>{CHANNEL_ICONS[ticket.original_channel]}</span>
              {ticket.original_channel}
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLORS[ticket.status] || ""
              }`}
            >
              {ticket.status}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
            </span>
          </div>
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Description
            </h2>
            <p className="text-gray-800 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>
        )}

        {/* Reporter + meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reporter */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
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

          {/* Sources */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Sources
            </h2>
            {ticket.sources.length > 0 ? (
              <ul className="space-y-1">
                {ticket.sources.map((source, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 capitalize">{source.platform}</span>
                    {source.external_url && (
                      <a
                        href={source.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View original
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">No sources linked</p>
            )}
          </div>
        </div>

        {/* Links row: Notion */}
        {notionUrl && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              View in Notion
            </a>
          </div>
        )}

        {/* AI Triage */}
        {ticket.enrichment_status === "completed" && (
          <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
            <h2 className="text-sm font-semibold text-indigo-800 uppercase mb-3">
              AI Triage
            </h2>
            <div className="space-y-2">
              {ticket.ai_summary && (
                <p className="text-gray-800">{ticket.ai_summary}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm">
                {ticket.ai_suggested_type && (
                  <span className="text-gray-600">
                    Suggested type:{" "}
                    <span className="font-medium text-gray-900">
                      {TYPE_LABELS[ticket.ai_suggested_type] || ticket.ai_suggested_type}
                    </span>
                  </span>
                )}
                {ticket.ai_suggested_priority != null && (
                  <span className="text-gray-600">
                    Suggested priority:{" "}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        PRIORITY_COLORS[ticket.ai_suggested_priority] || "bg-gray-200"
                      }`}
                    >
                      {PRIORITY_LABELS[ticket.ai_suggested_priority] ||
                        `P${ticket.ai_suggested_priority}`}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Event timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-4">
            Timeline
          </h2>
          <div className="space-y-4">
            {sortedEvents.map((event, i) => (
              <TimelineEvent key={i} event={event} isLast={i === sortedEvents.length - 1} />
            ))}
          </div>
        </div>

        {/* Raw data toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">
              Data
            </h2>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {showRawData ? "Formatted" : "Raw data"}
            </button>
          </div>
          {showRawData && (
            <pre className="bg-gray-50 rounded p-3 text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(
                { metadata: ticket.metadata, sources: ticket.sources, tags: ticket.tags },
                null,
                2
              )}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}

function TimelineEvent({
  event,
  isLast,
}: {
  event: TicketEvent;
  isLast: boolean;
}) {
  const icon = EVENT_ICONS[event.event_type] || "\u{25CB}";
  const label = EVENT_LABELS[event.event_type] || event.event_type;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="text-lg">{icon}</span>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{timeAgo(event.created_at)}</p>
        {event.data && Object.keys(event.data).length > 0 && (
          <EventData data={event.data} eventType={event.event_type} />
        )}
      </div>
    </div>
  );
}

function EventData({
  data,
  eventType,
}: {
  data: Record<string, unknown>;
  eventType: string;
}) {
  if (eventType === "status_changed") {
    return (
      <p className="text-xs text-gray-500 mt-1">
        {String(data.old_status)} &rarr; {String(data.new_status)}
      </p>
    );
  }

  return (
    <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
