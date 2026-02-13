export const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-red-600 text-white",
  1: "bg-orange-500 text-white",
  2: "bg-yellow-500 text-black",
  3: "bg-brand text-white",
  4: "bg-gray-400 text-white",
  5: "bg-gray-300 text-gray-600",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "P0 Critical",
  1: "P1 High",
  2: "P2 Medium",
  3: "P3 Normal",
  4: "P4 Low",
  5: "P5 Trivial",
};

export const CHANNEL_ICONS: Record<string, string> = {
  slack: "#",
  intercom: "\u{1F4AC}",
  whatsapp: "\u{1F4F1}",
};

export const CHANNEL_COLORS: Record<string, string> = {
  slack: "bg-purple-100 text-purple-800",
  intercom: "bg-blue-100 text-blue-800",
  whatsapp: "bg-green-100 text-green-800",
};

export const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature",
  question: "Question",
  incident: "Incident",
};

export const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-brand-light text-brand",
  resolved: "bg-gray-100 text-gray-600",
  closed: "bg-gray-200 text-gray-500",
};

export const EVENT_LABELS: Record<string, string> = {
  created: "Ticket created",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  commented: "Comment added",
  assigned: "Assigned",
  merged: "Merged",
  changelog_drafted: "Changelog drafted",
  changelog_approved: "Changelog approved",
  changelog_rejected: "Changelog rejected",
  notification_sent: "Notification sent",
  notification_failed: "Notification failed",
  synced_to_notion: "Synced to Notion",
  ai_triaged: "AI triage completed",
  ticket_grouped: "Added to group",
  group_resolved: "Group resolved",
  pii_redacted: "PII redacted before AI",
};

export const EVENT_ICONS: Record<string, string> = {
  created: "\u{1F4CB}",
  status_changed: "\u{1F504}",
  priority_changed: "\u{26A0}\u{FE0F}",
  commented: "\u{1F4AC}",
  assigned: "\u{1F464}",
  merged: "\u{1F517}",
  changelog_drafted: "\u{1F4DD}",
  changelog_approved: "\u{2705}",
  changelog_rejected: "\u{274C}",
  notification_sent: "\u{1F4E8}",
  notification_failed: "\u{1F6A8}",
  synced_to_notion: "\u{1F4D4}",
  ai_triaged: "\u{1F916}",
  ticket_grouped: "\u{1F4CE}",
  group_resolved: "\u{2705}",
  pii_redacted: "\u{1F6E1}\u{FE0F}",
};

export const CHANGELOG_STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  rejected: "bg-gray-100 text-gray-500 border-gray-300",
};

export const CHANGELOG_STATUS_LABELS: Record<string, string> = {
  draft: "Draft \u2014 Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const NOTIFICATION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
};

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
