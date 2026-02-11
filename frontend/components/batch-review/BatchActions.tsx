"use client";

interface BatchActionsProps {
  totalCount: number;
  selectedCount: number;
  onApproveAll: () => void;
  onApproveSelected: () => void;
  onRejectAll: () => void;
  loading: string | null;
}

export default function BatchActions({
  totalCount,
  selectedCount,
  onApproveAll,
  onApproveSelected,
  onRejectAll,
  loading,
}: BatchActionsProps) {
  if (totalCount === 0) return null;

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3">
      <span className="text-sm text-gray-600">
        {selectedCount} of {totalCount} selected
      </span>
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onApproveSelected}
          disabled={selectedCount === 0 || loading !== null}
          className="btn-primary px-4 py-2 disabled:opacity-50"
        >
          {loading === "approve_selected" ? "Approving..." : `Approve Selected (${selectedCount})`}
        </button>
        <button
          onClick={onApproveAll}
          disabled={totalCount === 0 || loading !== null}
          className="btn-approve px-4 py-2 disabled:opacity-50"
        >
          {loading === "approve_all" ? "Approving..." : `Approve All (${totalCount})`}
        </button>
        <button
          onClick={onRejectAll}
          disabled={totalCount === 0 || loading !== null}
          className="btn-reject px-4 py-2 disabled:opacity-50"
        >
          {loading === "reject_all" ? "Rejecting..." : `Reject All (${totalCount})`}
        </button>
      </div>
    </div>
  );
}
