"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChangelogEntryWithTicket } from "../../lib/types";
import { fetchChangelogEntries } from "../../lib/api";
import {
  CHANGELOG_STATUS_COLORS,
  timeAgo,
} from "../../lib/constants";
import PageHeader from "../../components/PageHeader";

const STATUS_OPTIONS = ["all", "draft", "approved", "rejected"];

export default function ChangelogEntriesPage() {
  const [entries, setEntries] = useState<ChangelogEntryWithTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const refresh = useCallback(async () => {
    try {
      const data = await fetchChangelogEntries({ status: statusFilter });
      setEntries(data);
    } catch {
      // silent — auto-refresh will retry
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Changelog Entries"
        subtitle="AI-generated changelog drafts and their review status"
      >
        <span>Auto-refreshing every 10s</span>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="card mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field ml-2 w-auto inline-block"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading changelog entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No changelog entries yet</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th">Status</th>
                  <th className="table-th">Content</th>
                  <th className="table-th">Tickets</th>
                  <th className="table-th">AI Model</th>
                  <th className="table-th">Approved By</th>
                  <th className="table-th">Created</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`badge ${CHANGELOG_STATUS_COLORS[entry.status] || "bg-gray-100 text-gray-800"}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                      <div className="truncate">{entry.content}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.ticket ? (
                        <div className="space-y-1">
                          <Link href={`/tickets/${entry.ticket.id}`} className="link-brand block truncate max-w-[200px]">
                            {entry.ticket.title}
                          </Link>
                          {entry.related_tickets.map((rt) => (
                            <Link key={rt.id} href={`/tickets/${rt.id}`} className="text-gray-500 hover:text-brand block truncate max-w-[200px] text-xs">
                              + {rt.title}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.ai_model}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.approved_by || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{timeAgo(entry.created_at)}</td>
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
