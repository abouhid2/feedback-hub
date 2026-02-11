"use client";

import { BatchNotification } from "../../lib/types";
import { CHANNEL_ICONS, CHANNEL_COLORS, timeAgo } from "../../lib/constants";

interface NotificationTableProps {
  notifications: BatchNotification[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}

export default function NotificationTable({
  notifications,
  selectedIds,
  onToggle,
  onToggleAll,
  allSelected,
}: NotificationTableProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">No pending batch reviews</p>
        <p className="text-sm mt-2">
          Batch review is triggered when more than 5 changelogs are approved within 5 minutes
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="table-th w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="rounded border-gray-300"
              />
            </th>
            <th className="table-th">Channel</th>
            <th className="table-th">Recipient</th>
            <th className="table-th">Content</th>
            <th className="table-th">Created</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((n) => (
            <tr
              key={n.id}
              className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selectedIds.has(n.id) ? "bg-brand-light" : ""
              }`}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(n.id)}
                  onChange={() => onToggle(n.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-4 py-3">
                <span className={`badge-channel ${CHANNEL_COLORS[n.channel] || "bg-gray-100 text-gray-600"}`}>
                  {CHANNEL_ICONS[n.channel] || ""} {n.channel}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                {n.recipient}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
                {n.content}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {timeAgo(n.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
