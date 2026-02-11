"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchMetrics, MetricsSummary } from "../../lib/api";
import {
  PRIORITY_LABELS,
  TYPE_LABELS,
} from "../../lib/constants";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

// Hex colors for recharts (can't use Tailwind classes in SVG)
const CHANNEL_HEX: Record<string, string> = {
  slack: "#9333ea",
  intercom: "#2563eb",
  whatsapp: "#16a34a",
};

const STATUS_HEX: Record<string, string> = {
  open: "#10b981",
  in_progress: "#6366f1",
  resolved: "#6b7280",
  closed: "#9ca3af",
};

const PRIORITY_HEX: Record<number, string> = {
  0: "#dc2626",
  1: "#f97316",
  2: "#eab308",
  3: "#6366f1",
  4: "#9ca3af",
  5: "#d1d5db",
};

const TYPE_HEX: Record<string, string> = {
  bug: "#dc2626",
  feature_request: "#2563eb",
  question: "#eab308",
  incident: "#f97316",
};

export default function MetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);

  const navigateToFiltered = (filter: string, value: string) => {
    router.push(`/?${filter}=${encodeURIComponent(value)}`);
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchMetrics(period);
      setMetrics(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const byChannel = metrics
    ? Object.entries(metrics.by_channel).map(([name, value]) => ({ name, value }))
    : [];

  const byType = metrics
    ? Object.entries(metrics.by_type).map(([name, value]) => ({
        name: TYPE_LABELS[name] || name,
        key: name,
        value,
      }))
    : [];

  const byPriority = metrics
    ? Object.entries(metrics.by_priority)
        .map(([name, value]) => ({
          name: PRIORITY_LABELS[Number(name)] || `P${name}`,
          key: Number(name),
          value,
        }))
        .sort((a, b) => a.key - b.key)
    : [];

  const byStatus = metrics
    ? Object.entries(metrics.by_status).map(([name, value]) => ({ name, value }))
    : [];

  const statusOpen = metrics?.by_status?.open || 0;
  const statusInProgress = metrics?.by_status?.in_progress || 0;
  const statusResolved = metrics?.by_status?.resolved || 0;
  const statusClosed = metrics?.by_status?.closed || 0;

  return (
    <div>
      <header className="header-sticky">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Metrics Dashboard</h1>
            <p className="text-sm text-white/70">Ticket volume, distribution, and top reporters</p>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-white text-brand"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
      {loading && !metrics ? (
        <div className="text-center py-20 text-gray-400">Loading metrics...</div>
      ) : !metrics ? (
        <div className="text-center py-20 text-gray-400">Failed to load metrics.</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard label="Total" value={metrics.total} color="text-brand" onClick={() => router.push("/")} />
            <StatCard label="Open" value={statusOpen} color="text-emerald-600" onClick={() => navigateToFiltered("status", "open")} />
            <StatCard label="In Progress" value={statusInProgress} color="text-indigo-600" onClick={() => navigateToFiltered("status", "in_progress")} />
            <StatCard label="Resolved" value={statusResolved} color="text-gray-600" onClick={() => navigateToFiltered("status", "resolved")} />
            <StatCard label="Closed" value={statusClosed} color="text-gray-400" onClick={() => navigateToFiltered("status", "closed")} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* By Channel — Pie */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Channel</h3>
              {byChannel.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={byChannel}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                      className="cursor-pointer"
                      onClick={(data) => navigateToFiltered("channel", data.name)}
                    >
                      {byChannel.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CHANNEL_HEX[entry.name] || "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No data</p>
              )}
            </div>

            {/* By Type — Bar */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Type</h3>
              {byType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byType} className="cursor-pointer">
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Tickets"
                      onClick={(data) => navigateToFiltered("type", data.key)}
                    >
                      {byType.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={TYPE_HEX[entry.key] || "#6b7280"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No data</p>
              )}
            </div>

            {/* By Priority — Bar */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Priority</h3>
              {byPriority.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byPriority} className="cursor-pointer">
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Tickets"
                      onClick={(data) => navigateToFiltered("priority", String(data.key))}
                    >
                      {byPriority.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={PRIORITY_HEX[entry.key] || "#6b7280"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No data</p>
              )}
            </div>

            {/* By Status — Pie */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Status</h3>
              {byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                      className="cursor-pointer"
                      onClick={(data) => navigateToFiltered("status", data.name)}
                    >
                      {byStatus.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_HEX[entry.name] || "#6b7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No data</p>
              )}
            </div>
          </div>

          {/* Top Reporters Table */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Reporters</h3>
            {metrics.top_reporters.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 w-12">#</th>
                    <th className="pb-3">Reporter</th>
                    <th className="pb-3 text-right">Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.top_reporters.map((r, i) => (
                    <tr key={r.name} className="border-b last:border-0">
                      <td className="py-3 text-gray-400">{i + 1}</td>
                      <td className="py-3 font-medium text-gray-800">{r.name}</td>
                      <td className="py-3 text-right text-gray-600">{r.ticket_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-sm">No reporters yet</p>
            )}
          </div>
        </>
      )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <div
      className="card p-5 hover:border-brand/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
