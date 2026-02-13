"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TicketGroup } from "../../lib/types";
import { CHANNEL_ICONS, CHANNEL_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, timeAgo } from "../../lib/constants";

const PII_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  password: "Password",
  ssn: "SSN",
};

interface TicketGroupCardProps {
  group: TicketGroup;
  highlight?: boolean;
  onResolve: (group: TicketGroup) => void;
}

export default function TicketGroupCard({ group, highlight, onResolve }: TicketGroupCardProps) {
  const [expanded, setExpanded] = useState(!!highlight);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  return (
    <div ref={cardRef} className={`card mb-3${highlight ? " ring-2 ring-brand ring-offset-2" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link href={`/ticket-groups/${group.id}`} className="text-lg font-semibold text-gray-900 hover:text-brand">
            {group.name}
          </Link>
          <p className="text-sm text-gray-500">
            {group.ticket_count} ticket{group.ticket_count !== 1 ? "s" : ""} &middot; Created {timeAgo(group.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              group.status === "open"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {group.status}
          </span>
          {group.status === "open" && (
            <button
              onClick={() => onResolve(group)}
              className="btn-primary px-3 py-1.5 text-sm"
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      {group.resolved_via_channel && (
        <p className="text-sm text-gray-500 mb-2">
          Resolved via <span className="font-medium">{group.resolved_via_channel}</span>
          {group.resolution_note && <> &mdash; {group.resolution_note}</>}
        </p>
      )}

      {group.tickets && group.tickets.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-1 w-full text-left"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {group.tickets.length} ticket{group.tickets.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <table className="w-full mt-1">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left py-1 px-2">Title</th>
                  <th className="text-left py-1 px-2">Priority</th>
                  <th className="text-left py-1 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-gray-50">
                    <td className="py-2 px-2 text-sm">
                      <Link href={`/tickets/${ticket.id}`} className="hover:text-brand hover:underline">
                        {ticket.id === group.primary_ticket_id && (
                          <span className="text-xs bg-brand-light text-brand rounded px-1 mr-1">Primary</span>
                        )}
                        {ticket.title}
                      </Link>
                      <span className={`badge-channel text-xs ml-1.5 ${CHANNEL_COLORS[ticket.original_channel] || ""}`}>
                        {CHANNEL_ICONS[ticket.original_channel]} {ticket.original_channel}
                      </span>
                      {ticket.pii_redacted_types && ticket.pii_redacted_types.length > 0 && (
                        <span
                          className="inline-flex ml-1.5"
                          title={`PII redacted before AI: ${ticket.pii_redacted_types.map(t => PII_LABELS[t] || t).join(", ")}`}
                        >
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`badge-priority text-xs ${PRIORITY_COLORS[ticket.priority] || "bg-gray-200"}`}>
                        {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-500">{ticket.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
