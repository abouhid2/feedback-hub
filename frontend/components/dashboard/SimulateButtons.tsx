"use client";

import { useState } from "react";
import { simulateTicket } from "../../lib/api";

interface SimulateButtonsProps {
  onSimulated: () => void;
}

const CHANNELS = [
  { key: "slack" as const, label: "# Slack", border: "border-purple-200", bg: "bg-purple-50", text: "text-purple-700", hover: "hover:bg-purple-100" },
  { key: "intercom" as const, label: "💬 Intercom", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", hover: "hover:bg-blue-100" },
  { key: "whatsapp" as const, label: "📱 WhatsApp", border: "border-green-200", bg: "bg-green-50", text: "text-green-700", hover: "hover:bg-green-100" },
];

export default function SimulateButtons({ onSimulated }: SimulateButtonsProps) {
  const [simulating, setSimulating] = useState<string | null>(null);

  const handleSimulate = async (channel: "slack" | "intercom" | "whatsapp") => {
    setSimulating(channel);
    try {
      await simulateTicket(channel);
      await new Promise((r) => setTimeout(r, 300));
      onSimulated();
    } catch {
      // parent will pick up via next refresh
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-medium text-gray-500">Simulate:</span>
      {CHANNELS.map((ch) => (
        <button
          key={ch.key}
          onClick={() => handleSimulate(ch.key)}
          disabled={simulating !== null}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${ch.border} ${ch.bg} ${ch.text} ${ch.hover} disabled:opacity-50 transition-colors`}
        >
          {simulating === ch.key ? "Creating..." : ch.label}
        </button>
      ))}
    </div>
  );
}
