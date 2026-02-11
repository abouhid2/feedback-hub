interface Filters {
  channel: string;
  status: string;
  priority: string;
}

interface TicketFiltersProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
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

export default function TicketFilters({ filters, onFilterChange }: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Channel</label>
        <select
          value={filters.channel}
          onChange={(e) => onFilterChange("channel", e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All channels</option>
          <option value="slack">Slack</option>
          <option value="intercom">Intercom</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="input-field w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Priority</label>
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange("priority", e.target.value)}
          className="input-field w-auto"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
