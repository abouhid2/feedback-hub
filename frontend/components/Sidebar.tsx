"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { simulateTicket, simulateBatchReview } from "../lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/batch-reviews", label: "Batch Reviews" },
  { href: "/notifications", label: "Notifications" },
  { href: "/metrics", label: "Metrics" },
];

const CHANNELS = [
  { key: "slack" as const, label: "Slack", cls: "simulate-btn-slack" },
  { key: "intercom" as const, label: "Intercom", cls: "simulate-btn-intercom" },
  { key: "whatsapp" as const, label: "WhatsApp", cls: "simulate-btn-whatsapp" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [simulating, setSimulating] = useState<string | null>(null);

  const handleSimulateTicket = async (channel: "slack" | "intercom" | "whatsapp") => {
    setSimulating(channel);
    try {
      await simulateTicket(channel);
    } catch {
      // silent — dashboard will pick up via auto-refresh
    } finally {
      setSimulating(null);
    }
  };

  const handleSimulateBatch = async () => {
    setSimulating("batch");
    try {
      await simulateBatchReview();
    } catch {
      // silent
    } finally {
      setSimulating(null);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="text-2xl font-bold text-white">Mainder</h1>
        <p className="text-sm text-white/70">Feedback Hub</p>
      </div>

      <nav className="p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Navigation</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname === item.href ? "nav-link-active" : "nav-link"}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 pt-2">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Simulate Tickets</p>
        <div className="space-y-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => handleSimulateTicket(ch.key)}
              disabled={simulating !== null}
              className={`${ch.cls} w-full`}
            >
              {simulating === ch.key ? "Creating..." : ch.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Simulate Batch</p>
        <button
          onClick={handleSimulateBatch}
          disabled={simulating !== null}
          className="simulate-btn-batch w-full"
        >
          {simulating === "batch" ? "Creating..." : "Simulate Batch Review"}
        </button>
      </div>
    </aside>
  );
}
