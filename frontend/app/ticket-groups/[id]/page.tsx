"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TicketGroup } from "../../../lib/types";
import { fetchTicketGroup, resolveTicketGroup } from "../../../lib/api";
import {
  CHANNEL_ICONS,
  CHANNEL_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  timeAgo,
} from "../../../lib/constants";
import ResolveModal from "../../../components/ticket-groups/ResolveModal";
import Toast from "../../../components/Toast";
import PageHeader from "../../../components/PageHeader";

const PII_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  password: "Password",
  ssn: "SSN",
};

export default function TicketGroupShowPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const [group, setGroup] = useState<TicketGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTicketGroup(groupId);
      setGroup(data);
    } catch {
      setToast({ message: "Failed to load ticket group", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleResolve = async (channel: string, content: string) => {
    if (!group) return;
    try {
      await resolveTicketGroup(group.id, channel, content);
      setToast({ message: `Group "${group.name}" resolved`, type: "success" });
      setResolving(false);
      await refresh();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to resolve", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Ticket Group" subtitle="Loading..." />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="text-center py-20 text-gray-400">Loading group...</div>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Ticket Group" subtitle="Not found" />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Group not found</p>
            <Link href="/ticket-groups" className="link-brand text-sm mt-2 inline-block">
              Back to all groups
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={group.name} subtitle={`${group.ticket_count} ticket${group.ticket_count !== 1 ? "s" : ""} · Created ${timeAgo(group.created_at)}`} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
        </div>

        {/* Status + Actions */}
        <div className="card mb-4 flex items-center gap-3">
          <span className={`badge ${group.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
            {group.status}
          </span>
          {group.resolved_via_channel && (
            <span className="text-sm text-gray-500">
              Resolved via <span className="font-medium">{group.resolved_via_channel}</span>
              {group.resolution_note && <> &mdash; {group.resolution_note}</>}
            </span>
          )}
          {group.status === "open" && (
            <button onClick={() => setResolving(true)} className="btn-primary px-3 py-1.5 text-sm ml-auto">
              Resolve Group
            </button>
          )}
        </div>

        {/* Tickets table */}
        {group.tickets && group.tickets.length > 0 && (
          <div className="card">
            <h2 className="section-title mb-3">Tickets</h2>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Priority</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Channel</th>
                  <th className="text-left py-2 px-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {group.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-sm">
                      <Link href={`/tickets/${ticket.id}`} className="hover:text-brand hover:underline">
                        {ticket.id === group.primary_ticket_id && (
                          <span className="text-xs bg-brand-light text-brand rounded px-1 mr-1">Primary</span>
                        )}
                        {ticket.title}
                      </Link>
                      {ticket.pii_redacted_types && ticket.pii_redacted_types.length > 0 && (
                        <span
                          className="inline-flex ml-1.5"
                          title={`PII redacted: ${ticket.pii_redacted_types.map(t => PII_LABELS[t] || t).join(", ")}`}
                        >
                          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                          </svg>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`badge-priority text-xs ${PRIORITY_COLORS[ticket.priority] || "bg-gray-200"}`}>
                        {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-500">{ticket.status}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge-channel text-xs ${CHANNEL_COLORS[ticket.original_channel] || ""}`}>
                        {CHANNEL_ICONS[ticket.original_channel]} {ticket.original_channel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-gray-400">{timeAgo(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {resolving && group && (
        <ResolveModal
          group={group}
          onConfirm={handleResolve}
          onClose={() => setResolving(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
