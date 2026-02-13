"use client";

import { useEffect, useState, useCallback } from "react";
import { TicketGroup } from "../../lib/types";
import { fetchTicketGroups, fetchTicketGroup, resolveTicketGroup, simulateIncident } from "../../lib/api";
import TicketGroupCard from "../../components/ticket-groups/TicketGroupCard";
import ResolveModal from "../../components/ticket-groups/ResolveModal";
import Toast from "../../components/Toast";
import PageHeader from "../../components/PageHeader";

export default function TicketGroupsPage() {
  const [groups, setGroups] = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [resolvingGroup, setResolvingGroup] = useState<TicketGroup | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [simulateLoading, setSimulateLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchTicketGroups(statusFilter !== "all" ? statusFilter : undefined);
      // Load full details (with tickets) for each group
      const detailed = await Promise.all(data.map((g) => fetchTicketGroup(g.id)));
      setGroups(detailed);
    } catch {
      setToast({ message: "Failed to load ticket groups", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSimulate = async () => {
    setSimulateLoading(true);
    try {
      await simulateIncident();
      setToast({ message: "Incident simulation started — tickets will appear in ~5 seconds", type: "success" });
      setTimeout(refresh, 5000);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Simulation failed", type: "error" });
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleResolve = async (channel: string, content: string) => {
    if (!resolvingGroup) return;
    try {
      await resolveTicketGroup(resolvingGroup.id, channel, content);
      setToast({ message: `Group "${resolvingGroup.name}" resolved`, type: "success" });
      setResolvingGroup(null);
      await refresh();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to resolve", type: "error" });
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Ticket Groups"
        subtitle="Group related tickets and resolve them together"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulate}
            disabled={simulateLoading}
            className="px-3 py-1.5 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {simulateLoading ? "Simulating..." : "Simulate Incident"}
          </button>
          <span className="text-xs text-gray-400 ml-1">Auto-refreshing every 10s</span>
        </div>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          {["all", "open", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setLoading(true); }}
              className={`px-3 py-1 text-sm rounded-md border ${
                statusFilter === s
                  ? "border-brand bg-brand-light text-brand font-medium"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading ticket groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No Open ticket groups</p>
            <p className="text-sm mt-2">
              Select tickets from the Dashboard and click &quot;Group Selected&quot; to create a group
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <TicketGroupCard
              key={group.id}
              group={group}
              onResolve={(g) => setResolvingGroup(g)}
            />
          ))
        )}
      </main>

      {resolvingGroup && (
        <ResolveModal
          group={resolvingGroup}
          onConfirm={handleResolve}
          onClose={() => setResolvingGroup(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
