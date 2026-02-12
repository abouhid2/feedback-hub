"use client";

import { useEffect, useState, useCallback } from "react";
import { BatchNotification } from "../../lib/types";
import {
  fetchPendingBatchReviews,
  batchApproveAll,
  batchApproveSelected,
  batchRejectAll,
  simulateBatchReview,
} from "../../lib/api";
import BatchActions from "../../components/batch-review/BatchActions";
import NotificationTable from "../../components/batch-review/NotificationTable";
import Toast from "../../components/Toast";
import PageHeader from "../../components/PageHeader";

export default function BatchReviewsPage() {
  const [notifications, setNotifications] = useState<BatchNotification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleSimulateBatch = async () => {
    setSimulating(true);
    try {
      await simulateBatchReview();
      setToast({ message: "Batch review simulated", type: "success" });
      await refresh();
    } catch {
      setToast({ message: "Failed to simulate batch review", type: "error" });
    } finally {
      setSimulating(false);
    }
  };

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPendingBatchReviews();
      setNotifications(data);
      setSelectedIds(new Set());
    } catch {
      setToast({ message: "Failed to load batch reviews", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const allIds = notifications.map((n) => n.id);
  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleApproveAll = async () => {
    if (!confirm(`Approve all ${notifications.length} notifications and send them?`)) return;
    setActionLoading("approve_all");
    try {
      const result = await batchApproveAll(allIds);
      setToast({ message: `${result.approved} notifications approved and queued for delivery`, type: "success" });
      await refresh();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to approve", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Approve ${ids.length} selected notifications and send them?`)) return;
    setActionLoading("approve_selected");
    try {
      const result = await batchApproveSelected(ids);
      setToast({ message: `${result.approved} notifications approved and queued for delivery`, type: "success" });
      await refresh();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to approve", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAll = async () => {
    if (!confirm(`Reject all ${notifications.length} notifications? They will not be sent.`)) return;
    setActionLoading("reject_all");
    try {
      const result = await batchRejectAll(allIds);
      setToast({ message: `${result.rejected} notifications rejected`, type: "success" });
      await refresh();
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to reject", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Batch Review"
        subtitle="Review pending notifications before they are sent to reporters"
      >
        <button
          onClick={handleSimulateBatch}
          disabled={simulating}
          className="simulate-btn-batch text-xs px-3 py-1"
        >
          {simulating ? "Creating..." : "Simulate Batch"}
        </button>
        <span>Auto-refreshing every 10s</span>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {notifications.length > 0 && (
          <div className="card-warning mb-4 flex items-center gap-2">
            <span className="text-lg">&#9888;&#65039;</span>
            <p className="text-sm text-amber-800">
              <strong>{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</strong>{" "}
              held for batch review. These were triggered by a mass-resolution event (&gt;5 in 5 minutes).
              Review and approve before they are sent.
            </p>
          </div>
        )}

        <BatchActions
          totalCount={notifications.length}
          selectedCount={selectedIds.size}
          onApproveAll={handleApproveAll}
          onApproveSelected={handleApproveSelected}
          onRejectAll={handleRejectAll}
          loading={actionLoading}
        />

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Loading batch reviews...</p>
          </div>
        ) : (
          <NotificationTable
            notifications={notifications}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            allSelected={allSelected}
          />
        )}
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
