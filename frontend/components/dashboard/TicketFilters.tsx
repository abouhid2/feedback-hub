import { useState, useEffect, useRef } from "react";

interface Filters {
  channel: string;
  status: string;
  priority: string;
  type: string;
}

interface TicketFiltersProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
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
  { value: "0", label: "P0" },
  { value: "1", label: "P1" },
  { value: "2", label: "P2" },
  { value: "3", label: "P3" },
  { value: "4", label: "P4" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature" },
  { value: "question", label: "Question" },
  { value: "incident", label: "Incident" },
];

export default function TicketFilters({ filters, onFilterChange, search, onSearchChange }: TicketFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 300);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Search tickets..."
          className="input-field w-48"
        />
      </div>
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
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
        <select
          value={filters.type}
          onChange={(e) => onFilterChange("type", e.target.value)}
          className="input-field w-auto"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
