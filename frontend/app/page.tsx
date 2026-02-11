"use client";

import { useEffect, useState, useCallback } from "react";
import { Ticket } from "../lib/types";
import { fetchTickets as apiFetchTickets, fetchMetrics } from "../lib/api";
import StatsCards from "../components/dashboard/StatsCards";
import SimulateButtons from "../components/dashboard/SimulateButtons";
import TicketFilters from "../components/dashboard/TicketFilters";
import TicketTable from "../components/dashboard/TicketTable";

interface Filters {
  channel: string;
  status: string;
  priority: string;
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<Filters>({ channel: "all", status: "all", priority: "all" });
  const [stats, setStats] = useState({ total: 0, slack: 0, intercom: 0, whatsapp: 0, critical: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSimulated = () => {
    setPage(1);
    refreshData();
  };

  return (
    <div className="min-h-screen">
      <header className="header-sticky">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Mainder Feedback Hub
            </h1>
            <p className="text-sm text-white/70">
              Multi-channel feedback ingestion &mdash; live prototype
            </p>
          </div>
          <div className="text-right text-sm text-white/70">
            {lastUpdated && (
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Auto-refreshing every 5s</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsCards stats={stats} />
        <SimulateButtons onSimulated={handleSimulated} />
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
          />
        )}
      </main>
    </div>
  );
}
