"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Ticket } from "../lib/types";
import { fetchTickets as apiFetchTickets, fetchMetrics, simulateTicket, createTicketGroup } from "../lib/api";
import StatsCards from "../components/dashboard/StatsCards";
import TicketFilters from "../components/dashboard/TicketFilters";
import TicketTable from "../components/dashboard/TicketTable";
import PageHeader from "../components/PageHeader";
import CreateGroupModal from "../components/ticket-groups/CreateGroupModal";
import Toast from "../components/Toast";

const CHANNELS = [
  { key: "slack" as const, label: "Slack", cls: "simulate-btn-slack" },
  { key: "intercom" as const, label: "Intercom", cls: "simulate-btn-intercom" },
  { key: "whatsapp" as const, label: "WhatsApp", cls: "simulate-btn-whatsapp" },
];

interface Filters {
  channel: string;
  status: string;
  priority: string;
  type: string;
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>({
    channel: searchParams.get("channel") || "all",
    status: searchParams.get("status") || "open",
    priority: searchParams.get("priority") || "all",
    type: searchParams.get("type") || "all",
  });
  const [stats, setStats] = useState({ total: 0, slack: 0, intercom: 0, whatsapp: 0, critical: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [paused, setPaused] = useState(false);

  // Auto-pause when selecting tickets
  const effectivePaused = paused || selectedIds.size > 0;

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

  const refreshData = useCallback(async () => {
    try {
      const [ticketData, metricsData] = await Promise.all([
        apiFetchTickets({ ...filters, page, per_page: 20 }),
        fetchMetrics(),
      ]);
      setTickets(ticketData.tickets);
      setTotalPages(ticketData.pagination.total_pages);
      setStats({
        total: metricsData.total,
        slack: metricsData.by_channel.slack || 0,
        intercom: metricsData.by_channel.intercom || 0,
        whatsapp: metricsData.by_channel.whatsapp || 0,
        critical: (metricsData.by_priority["0"] || 0) + (metricsData.by_priority["1"] || 0),
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (!effectivePaused) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [refreshData, effectivePaused]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (tickets.every((t) => selectedIds.has(t.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  };

  const selectedTickets = tickets.filter((t) => selectedIds.has(t.id));

  const handleCreateGroup = async (name: string, primaryTicketId: string) => {
    try {
      await createTicketGroup(name, Array.from(selectedIds), primaryTicketId);
      setToast({ message: `Group "${name}" created with ${selectedIds.size} tickets`, type: "success" });
      setSelectedIds(new Set());
      setShowCreateGroup(false);
      await refreshData();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to create group", type: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard" subtitle="All tickets across channels">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/60 uppercase mr-1">Simulate:</span>
          {CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => handleSimulateTicket(ch.key)}
              disabled={simulating !== null}
              className={`${ch.cls} text-xs px-3 py-1`}
            >
              {simulating === ch.key ? "..." : ch.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {lastUpdated && (
            <span className="text-xs text-text-muted">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setPaused((p) => !p)}
            className={`inline-flex items-center gap-1.5 ${effectivePaused ? "toggle-active" : "toggle-inactive"}`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              effectivePaused ? "bg-amber-500" : "bg-green-500 animate-pulse"
            }`} />
            {effectivePaused
              ? (selectedIds.size > 0 && !paused ? "Paused (selecting)" : "Paused")
              : "Live"}
          </button>
        </div>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsCards stats={stats} />
        <TicketFilters filters={filters} onFilterChange={handleFilterChange} />

        {error && (
          <div className="card-error mb-4">
            <p className="text-red-700 text-sm">
              Failed to connect to API: {error}. Make sure Rails is running on port 3000.
            </p>
          </div>
        )}

        {loading && tickets.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading tickets...</p>
            <p className="text-sm mt-2">Waiting for simulator to generate data</p>
          </div>
        )}

        {!loading && tickets.length === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No tickets yet</p>
            <p className="text-sm mt-2">Start the simulator with Sidekiq to generate webhook payloads</p>
          </div>
        )}

        {tickets.length > 0 && (
          <TicketTable
            tickets={tickets}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
          />
        )}

        {/* Floating action bar for group creation */}
        {selectedIds.size >= 2 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 z-40">
            <span className="text-sm">
              {selectedIds.size} tickets selected
            </span>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-brand hover:bg-brand/90 text-white px-4 py-1.5 rounded-md text-sm font-medium"
            >
              Group Selected
            </button>
          </div>
        )}
      </main>

      {showCreateGroup && (
        <CreateGroupModal
          tickets={selectedTickets}
          onConfirm={handleCreateGroup}
          onClose={() => setShowCreateGroup(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
