"use client";

import { useState } from "react";
import { TicketEvent } from "../../lib/types";
import { EVENT_LABELS, EVENT_ICONS, timeAgo } from "../../lib/constants";

interface TicketTimelineProps {
  events: TicketEvent[];
}

export default function TicketTimeline({ events }: TicketTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <h2 className="section-title">
          Timeline
        </h2>
        <span className="text-xs text-gray-400 ml-1">{events.length} event{events.length !== 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="space-y-4 mt-4">
          {sortedEvents.map((event, i) => (
            <TimelineEvent
              key={i}
              event={event}
              isLast={i === sortedEvents.length - 1}
            />
          ))}
        </div>
      )}
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
  const icon = EVENT_ICONS[event.event_type] || "\u25CB";
  const label = EVENT_LABELS[event.event_type] || event.event_type;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="text-lg">{icon}</span>
        {!isLast && <div className="w-px flex-1 bg-brand/15 mt-1" />}
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

  if (eventType === "ticket_ungrouped") {
    const groupName = typeof data.group_name === "string" ? data.group_name : "a group";
    const reason = typeof data.reason === "string" ? data.reason : null;
    return (
      <p className="text-xs text-gray-500 mt-1">
        Removed from &ldquo;{groupName}&rdquo;{reason === "group_dissolved" ? " (group dissolved)" : ""}
      </p>
    );
  }

  if (eventType === "pii_redacted") {
    const types = Array.isArray(data.redacted_types) ? data.redacted_types as string[] : [];
    const labels: Record<string, string> = { email: "Email", phone: "Phone", password: "Password", ssn: "SSN" };
    const service = typeof data.service === "string" ? data.service : null;
    return (
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        {types.map((t) => (
          <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            {labels[t] || t} redacted
          </span>
        ))}
        {service && (
          <span className="text-xs text-gray-400">via {service}</span>
        )}
      </div>
    );
  }

  return (
    <pre className="code-inline text-gray-500 mt-1">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
