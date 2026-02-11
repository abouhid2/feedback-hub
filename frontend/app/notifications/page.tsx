"use client";

import { useEffect, useState, useCallback } from "react";
import { Notification } from "../../lib/types";
import { fetchNotifications } from "../../lib/api";
import {
  CHANNEL_COLORS,
  CHANNEL_ICONS,
  NOTIFICATION_STATUS_COLORS,
  NOTIFICATION_STATUS_LABELS,
  timeAgo,
} from "../../lib/constants";

const CHANNEL_OPTIONS = ["all", "slack", "intercom", "whatsapp"];
const STATUS_OPTIONS = ["all", "pending", "sent", "failed", "pending_batch_review"];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const refresh = useCallback(async () => {
    try {
      const data = await fetchNotifications({
        channel: channelFilter,
        status: statusFilter,
      });
      setNotifications(data);
    } catch {
      // silent — auto-refresh will retry
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="min-h-screen">
      <header className="header-sticky">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notification History</h1>
            <p className="text-sm text-white/70">
              All notifications sent, pending, and failed
            </p>
          </div>
          <div className="text-right text-sm text-white/70">
            Auto-refreshing every 10s
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="card mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Channel
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="input-field ml-2 w-auto inline-block"
            >
              {CHANNEL_OPTIONS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch === "all" ? "All Channels" : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-700">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field ml-2 w-auto inline-block"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Statuses" : (NOTIFICATION_STATUS_LABELS[s] || s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No notifications yet</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th">Status</th>
                  <th className="table-th">Channel</th>
                  <th className="table-th">Recipient</th>
                  <th className="table-th">Content</th>
                  <th className="table-th">Delivered</th>
                  <th className="table-th">Created</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`badge ${NOTIFICATION_STATUS_COLORS[n.status] || "bg-gray-100 text-gray-800"}`}>
                        {NOTIFICATION_STATUS_LABELS[n.status] || n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge-channel ${CHANNEL_COLORS[n.channel] || "bg-gray-100 text-gray-800"}`}>
                        {CHANNEL_ICONS[n.channel] || ""} {n.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{n.recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                      <div className="truncate">{n.content}</div>
                      {n.status === "failed" && n.last_error && (
                        <div className="text-xs text-red-600 mt-0.5 truncate">{n.last_error}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {n.delivered_at ? timeAgo(n.delivered_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {timeAgo(n.created_at)}
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
