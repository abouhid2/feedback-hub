"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Ticket } from "../lib/types";
import { fetchTickets as apiFetchTickets } from "../lib/api";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CHANNEL_ICONS,
  CHANNEL_COLORS,
  TYPE_LABELS,
  STATUS_COLORS,
  timeAgo,
} from "../lib/constants";

interface Filters {
  channel: string;
  status: string;
  priority: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "0", label: "P0 Critical" },
  { value: "1", label: "P1 High" },
  { value: "2", label: "P2 Medium" },
  { value: "3", label: "P3 Normal" },
  { value: "4", label: "P4 Low" },
];

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>({ channel: "all", status: "all", priority: "all" });

  const fetchTickets = useCallback(async () => {
    try {
      const data = await apiFetchTickets(filters);
      setTickets(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const stats = {
    total: tickets.length,
    slack: tickets.filter((t) => t.original_channel === "slack").length,
    intercom: tickets.filter((t) => t.original_channel === "intercom").length,
    whatsapp: tickets.filter((t) => t.original_channel === "whatsapp").length,
    critical: tickets.filter((t) => t.priority <= 1).length,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mainder Feedback Hub
            </h1>
            <p className="text-sm text-gray-500">
              Multi-channel feedback ingestion &mdash; live prototype
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            {lastUpdated && (
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Auto-refreshing every 5s</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Tickets" value={stats.total} color="text-gray-900" />
          <StatCard label="Slack" value={stats.slack} color="text-purple-600" />
          <StatCard label="Intercom" value={stats.intercom} color="text-blue-600" />
          <StatCard label="WhatsApp" value={stats.whatsapp} color="text-green-600" />
          <StatCard label="Critical (P0-P1)" value={stats.critical} color="text-red-600" />
        </div>

        {/* Channel Filters */}
        <div className="flex flex-wrap gap-2 mb-2">
          {["all", "slack", "intercom", "whatsapp"].map((ch) => (
            <button
              key={ch}
              onClick={() => updateFilter("channel", ch)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.channel === ch
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {ch === "all" ? "All channels" : ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("status", opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.status === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Priority Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter("priority", opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.priority === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">
              Failed to connect to API: {error}. Make sure Rails is running on port 3000.
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && tickets.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading tickets...</p>
            <p className="text-sm mt-2">
              Waiting for simulator to generate data
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && tickets.length === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No tickets yet</p>
            <p className="text-sm mt-2">
              Start the simulator with Sidekiq to generate webhook payloads
            </p>
          </div>
        )}

        {/* Ticket list */}
        {tickets.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Channel
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Reporter
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          PRIORITY_COLORS[ticket.priority] || "bg-gray-200"
                        }`}
                      >
                        {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
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
                        className="hover:text-blue-600 hover:underline"
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
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
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
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
