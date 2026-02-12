"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NotificationDetail } from "../../../lib/types";
import { fetchNotification } from "../../../lib/api";
import {
  CHANNEL_COLORS,
  CHANNEL_ICONS,
  NOTIFICATION_STATUS_COLORS,
  NOTIFICATION_STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  CHANGELOG_STATUS_COLORS,
  timeAgo,
} from "../../../lib/constants";

export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [notification, setNotification] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotification(id);
      setNotification(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notification");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <p className="text-lg">Loading notification...</p>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || "Notification not found"}</p>
          <Link href="/notifications" className="link-brand">
            Back to notifications
          </Link>
        </div>
      </div>
    );
  }

  const n = notification;

  return (
    <div className="min-h-screen">
      <header className="header-sticky">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href="/notifications" className="text-sm text-text-secondary hover:text-text hover:underline">
            Back to notifications
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Status + Channel badges */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Notification Detail</h1>
          <div className="flex items-center gap-2">
            <span className={`badge ${NOTIFICATION_STATUS_COLORS[n.status] || "bg-gray-100 text-gray-800"}`}>
              {NOTIFICATION_STATUS_LABELS[n.status] || n.status}
            </span>
            <span className={`badge-channel ${CHANNEL_COLORS[n.channel] || "bg-gray-100 text-gray-800"}`}>
              {CHANNEL_ICONS[n.channel] || ""} {n.channel}
            </span>
          </div>
        </div>

        {/* Core info */}
        <div className="card">
          <h2 className="section-title mb-3">Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Recipient</dt>
              <dd className="text-gray-900 font-medium">{n.recipient}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">{timeAgo(n.created_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Delivered</dt>
              <dd className="text-gray-900">{n.delivered_at ? timeAgo(n.delivered_at) : "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Retry Count</dt>
              <dd className="text-gray-900">{n.retry_count}</dd>
            </div>
          </dl>
          {n.content && (
            <div className="mt-4">
              <dt className="text-sm text-gray-500 mb-1">Content</dt>
              <dd className="text-sm text-gray-800 bg-gray-50 rounded p-3 whitespace-pre-wrap">{n.content}</dd>
            </div>
          )}
        </div>

        {/* Error card (if failed) */}
        {n.status === "failed" && n.last_error && (
          <div className="card border-red-200 bg-red-50">
            <h2 className="section-title text-red-800 mb-2">Error Info</h2>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-red-600">Last Error</dt>
                <dd className="text-red-800 font-medium">{n.last_error}</dd>
              </div>
              <div>
                <dt className="text-red-600">Retry Count</dt>
                <dd className="text-red-800 font-medium">{n.retry_count}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Linked Tickets */}
        {n.ticket && (
          <div className="card">
            <h2 className="section-title mb-3">
              {n.related_tickets.length > 0 ? "Linked Tickets" : "Linked Ticket"}
            </h2>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/tickets/${n.ticket.id}`} className="link-brand font-medium text-base">
                    {n.ticket.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`badge text-xs ${STATUS_COLORS[n.ticket.status] || "bg-gray-100 text-gray-800"}`}>
                      {n.ticket.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {PRIORITY_LABELS[n.ticket.priority] || `P${n.ticket.priority}`}
                    </span>
                    {n.ticket.reporter && (
                      <span className="text-xs text-gray-500">
                        by {n.ticket.reporter.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {n.related_tickets.map((rt) => (
                <div key={rt.id} className="flex items-start justify-between border-t border-gray-100 pt-3">
                  <div>
                    <Link href={`/tickets/${rt.id}`} className="link-brand font-medium text-sm">
                      {rt.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge text-xs ${STATUS_COLORS[rt.status] || "bg-gray-100 text-gray-800"}`}>
                        {rt.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {PRIORITY_LABELS[rt.priority] || `P${rt.priority}`}
                      </span>
                      {rt.reporter && (
                        <span className="text-xs text-gray-500">
                          by {rt.reporter.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked Changelog Entry */}
        {n.changelog_entry && (
          <div className="card">
            <h2 className="section-title mb-3">Linked Changelog Entry</h2>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge text-xs ${CHANGELOG_STATUS_COLORS[n.changelog_entry.status] || "bg-gray-100 text-gray-800"}`}>
                {n.changelog_entry.status}
              </span>
              <span className="text-xs text-gray-500">Model: {n.changelog_entry.ai_model}</span>
              {n.changelog_entry.approved_by && (
                <span className="text-xs text-gray-500">
                  Approved by {n.changelog_entry.approved_by}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 bg-gray-50 rounded p-3 whitespace-pre-wrap">
              {n.changelog_entry.content}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
