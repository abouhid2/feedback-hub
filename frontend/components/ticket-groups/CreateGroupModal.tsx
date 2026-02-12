"use client";

import { useState } from "react";
import { Ticket } from "../../lib/types";

interface CreateGroupModalProps {
  tickets: Ticket[];
  onConfirm: (name: string, primaryTicketId: string) => Promise<void>;
  onClose: () => void;
}

export default function CreateGroupModal({ tickets, onConfirm, onClose }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [primaryId, setPrimaryId] = useState(tickets[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onConfirm(name.trim(), primaryId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Create Ticket Group</h2>
        <p className="text-sm text-gray-500 mb-4">
          Group {tickets.length} selected tickets together.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Group Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Login bug duplicates"
          autoFocus
        />

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Ticket
        </label>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {tickets.map((ticket) => (
            <label
              key={ticket.id}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                primaryId === ticket.id ? "border-brand bg-brand-light" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="primary"
                value={ticket.id}
                checked={primaryId === ticket.id}
                onChange={() => setPrimaryId(ticket.id)}
                className="text-brand"
              />
              <span className="text-sm text-gray-800 truncate">{ticket.title}</span>
              <span className="text-xs text-gray-400 ml-auto">{ticket.original_channel}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
