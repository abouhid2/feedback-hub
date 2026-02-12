"use client";

import Link from "next/link";
import { TicketGroup } from "../../lib/types";
import { CHANNEL_ICONS, CHANNEL_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, timeAgo } from "../../lib/constants";

interface TicketGroupCardProps {
  group: TicketGroup;
  onResolve: (group: TicketGroup) => void;
}

export default function TicketGroupCard({ group, onResolve }: TicketGroupCardProps) {
  return (
    <div className="card mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
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
        <div className="border-t border-gray-100 pt-3">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-1 px-2">Title</th>
                <th className="text-left py-1 px-2">Channel</th>
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
                  </td>
                  <td className="py-2 px-2">
                    <span className={`badge-channel text-xs ${CHANNEL_COLORS[ticket.original_channel] || ""}`}>
                      {CHANNEL_ICONS[ticket.original_channel]} {ticket.original_channel}
                    </span>
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
        </div>
      )}
    </div>
  );
}
