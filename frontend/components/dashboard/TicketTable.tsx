import Link from "next/link";
import { Ticket } from "../../lib/types";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CHANNEL_ICONS,
  CHANNEL_COLORS,
  TYPE_LABELS,
  STATUS_COLORS,
  timeAgo,
} from "../../lib/constants";

interface TicketTableProps {
  tickets: Ticket[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function TicketTable({ tickets, page, totalPages, onPageChange }: TicketTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-gray-200">
          <tr>
            <th className="table-th">Priority</th>
            <th className="table-th">Channel</th>
            <th className="table-th">Title</th>
            <th className="table-th">Type</th>
            <th className="table-th">Reporter</th>
            <th className="table-th">Status</th>
            <th className="table-th">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="hover:bg-brand-light transition-colors"
            >
              <td className="px-4 py-3">
                <span
                  className={`badge-priority ${
                    PRIORITY_COLORS[ticket.priority] || "bg-gray-200"
                  }`}
                >
                  {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`badge-channel ${
                    CHANNEL_COLORS[ticket.original_channel] || ""
                  }`}
                >
                  <span>{CHANNEL_ICONS[ticket.original_channel]}</span>
                  {ticket.original_channel}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="hover:text-brand hover:underline"
                >
                  {ticket.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {ticket.reporter?.name || "\u2014"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`badge ${
                    STATUS_COLORS[ticket.status] || ""
                  }`}
                >
                  {ticket.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {timeAgo(ticket.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-slate-50">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
