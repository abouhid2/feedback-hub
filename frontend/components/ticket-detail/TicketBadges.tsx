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
        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
          PRIORITY_COLORS[priority] || "bg-gray-200"
        }`}
      >
        {PRIORITY_LABELS[priority] || `P${priority}`}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          CHANNEL_COLORS[channel] || ""
        }`}
      >
        <span>{CHANNEL_ICONS[channel]}</span>
        {channel}
      </span>
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
          STATUS_COLORS[status] || ""
        }`}
      >
        {status}
      </span>
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        {TYPE_LABELS[ticketType] || ticketType}
      </span>
    </div>
  );
}
