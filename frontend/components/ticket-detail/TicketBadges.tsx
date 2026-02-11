import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CHANNEL_ICONS,
  CHANNEL_COLORS,
  STATUS_COLORS,
  TYPE_LABELS,
} from "../../lib/constants";

interface TicketBadgesProps {
  priority: number;
  channel: string;
  status: string;
  ticketType: string;
}

export default function TicketBadges({
  priority,
  channel,
  status,
  ticketType,
}: TicketBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`badge-priority ${
          PRIORITY_COLORS[priority] || "bg-gray-200"
        }`}
      >
        {PRIORITY_LABELS[priority] || `P${priority}`}
      </span>
      <span
        className={`badge-channel ${
          CHANNEL_COLORS[channel] || ""
        }`}
      >
        <span>{CHANNEL_ICONS[channel]}</span>
        {channel}
      </span>
      <span
        className={`badge ${
          STATUS_COLORS[status] || ""
        }`}
      >
        {status}
      </span>
      <span className="badge bg-brand-light text-brand">
        {TYPE_LABELS[ticketType] || ticketType}
      </span>
    </div>
  );
}
