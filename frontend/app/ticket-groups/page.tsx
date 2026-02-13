"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TicketGroup } from "../../lib/types";
import { fetchTicketGroups, fetchTicketGroup, resolveTicketGroup, simulateIncident } from "../../lib/api";
import TicketGroupCard from "../../components/ticket-groups/TicketGroupCard";
import ResolveModal from "../../components/ticket-groups/ResolveModal";
import Toast from "../../components/Toast";
import PageHeader from "../../components/PageHeader";
import SearchInput from "../../components/SearchInput";

export default function TicketGroupsPage() {
  const searchParams = useSearchParams();
  const highlightGroupId = searchParams.get("group");
  const [groups, setGroups] = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [resolvingGroup, setResolvingGroup] = useState<TicketGroup | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [search, setSearch] = useState("");

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

  const filteredGroups = groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Ticket Groups"
        subtitle="Group related tickets and resolve them together"
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="card mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); }}
              className="input-field text-sm py-1 pr-8"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or ID..."
            className="w-56"
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={handleSimulate}
              disabled={simulateLoading}
              className="px-3 py-1.5 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {simulateLoading ? "Simulating..." : "Simulate Incident"}
            </button>
            <div className="relative group">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-gray-400 text-xs cursor-help group-hover:text-gray-600 group-hover:border-gray-400">
                i
              </span>
              <div className="absolute bottom-full right-0 mb-2 w-56 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none z-50">
                Simulate 8 related tickets across channels over time to test auto-grouping
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading ticket groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{search ? "No groups match your search" : "No open ticket groups"}</p>
            <p className="text-sm mt-2">
              {search
                ? "Try a different name or ID"
                : "Select tickets from the Dashboard and click \"Group Selected\" to create a group"}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <TicketGroupCard
              key={group.id}
              group={group}
              highlight={group.id === highlightGroupId}
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
