"use client";

import { useState } from "react";

export interface SuggestFilters {
  limit: number;
  order: "first" | "last";
  start_time: string;
  end_time: string;
}

interface SuggestFilterModalProps {
  onConfirm: (filters: SuggestFilters) => void;
  onClose: () => void;
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SuggestFilterModal({ onConfirm, onClose }: SuggestFilterModalProps) {
  const [order, setOrder] = useState<"first" | "last">("last");
  const [limit, setLimit] = useState(50);
  const [startTime, setStartTime] = useState(() => toLocalDatetime(new Date(Date.now() - 30 * 60 * 1000)));
  const [endTime, setEndTime] = useState(() => toLocalDatetime(new Date()));

  const handleSubmit = () => {
    onConfirm({
      limit,
      order,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Suggest Groups</h2>
        <p className="text-sm text-text-secondary mb-5">
          Configure which tickets to analyze for grouping suggestions.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Order
            </label>
            <div className="flex rounded-md border border-gray-200 overflow-hidden w-fit">
              <button
                onClick={() => setOrder("first")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  order === "first"
                    ? "bg-brand text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                First
              </button>
              <button
                onClick={() => setOrder("last")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  order === "last"
                    ? "bg-brand text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Last
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {order === "last" ? "Newest tickets first" : "Oldest tickets first"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Ticket Count
            </label>
            <input
              type="number"
              min={2}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
              className="input-field w-24"
            />
            <p className="text-xs text-gray-400 mt-1">Max 50 tickets per analysis</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5">
          <button onClick={onClose} className="btn-secondary px-4 py-2">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary px-4 py-2">
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
}
