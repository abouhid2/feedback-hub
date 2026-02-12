"use client";

import { useEffect, useState, useCallback } from "react";
import { ChangelogEntry } from "../../lib/types";
import {
  fetchChangelog,
  generateChangelog,
  previewChangelog,
  approveChangelog,
  rejectChangelog,
  updateChangelogDraft,
  createManualChangelog,
} from "../../lib/api";
import {
  CHANGELOG_STATUS_COLORS,
  CHANGELOG_STATUS_LABELS,
} from "../../lib/constants";
import Toast from "../Toast";
import ChangelogContentCreator from "../ChangelogContentCreator";

interface Props {
  ticketId: string;
  ticketStatus: string;
}

export default function ChangelogReview({ ticketId, ticketStatus }: Props) {
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const entry = await fetchChangelog(ticketId);
    setChangelog(entry);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async (options?: { prompt?: string; systemPrompt?: string; resolutionNotes?: string; force?: boolean }) => {
    setActionLoading(true);
    try {
      const entry = await generateChangelog(ticketId, options);
      setChangelog(entry);
      setRegenerating(false);
      setToast({ message: "Changelog generated successfully", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to generate changelog", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async (options?: { prompt?: string; systemPrompt?: string; resolutionNotes?: string }) => {
    await handleGenerate({ ...options, force: true });
  };

  const handleManualCreate = async (content: string) => {
    setActionLoading(true);
    try {
      const entry = await createManualChangelog(ticketId, content);
      setChangelog(entry);
      setToast({ message: "Manual changelog draft created", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to create changelog", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const entry = await approveChangelog(ticketId, "admin@feedback-hub.com");
      setChangelog(entry);
      setToast({ message: "Changelog approved", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to approve", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const entry = await rejectChangelog(ticketId, "admin@feedback-hub.com", rejectReason);
      setChangelog(entry);
      setShowRejectForm(false);
      setRejectReason("");
      setToast({ message: "Changelog rejected", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to reject", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const entry = await updateChangelogDraft(ticketId, editContent);
      setChangelog(entry);
      setEditing(false);
      setToast({ message: "Draft updated", type: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to save", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const startEditing = () => {
    setEditContent(changelog?.content || "");
    setEditing(true);
    setShowRejectForm(false);
  };

  const toastEl = toast && (
    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  );

  if (loading) {
    return (
      <div className="card">
        <h2 className="section-title mb-2">
          Changelog Review
        </h2>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // No changelog and ticket is not resolved — don't render
  if (!changelog && ticketStatus !== "resolved") {
    return <>{toastEl}</>;
  }

  // No changelog but ticket is resolved — show generate / manual buttons
  if (!changelog) {
    return (
      <>
        <div className="card">
          <h2 className="section-title mb-3">
            Changelog Review
          </h2>
          <ChangelogContentCreator
            onGenerate={handleGenerate}
            onPreview={() => previewChangelog(ticketId)}
            onManualSubmit={handleManualCreate}
            generating={actionLoading}
            description="This ticket is resolved. Generate an AI changelog entry or write one manually."
          />
        </div>
        {toastEl}
      </>
    );
  }

  const statusColor = CHANGELOG_STATUS_COLORS[changelog.status] || "";
  const statusLabel = CHANGELOG_STATUS_LABELS[changelog.status] || changelog.status;

  // Approved state
  if (changelog.status === "approved") {
    return (
      <>
        <div className="card-success">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              Changelog Review
            </h2>
            <span className={`badge ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
            {changelog.content}
          </p>
          <p className="text-xs text-gray-500">
            Approved by {changelog.approved_by} on{" "}
            {changelog.approved_at
              ? new Date(changelog.approved_at).toLocaleString()
              : "—"}
          </p>
        </div>
        {toastEl}
      </>
    );
  }

  // Rejected state
  if (changelog.status === "rejected") {
    return (
      <>
        <div className="card-muted">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              Changelog Review
            </h2>
            <span className={`badge ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 whitespace-pre-wrap">
            {changelog.content}
          </p>
        </div>
        {toastEl}
      </>
    );
  }

  // Regenerating state — show the ContentCreator again
  if (regenerating) {
    return (
      <>
        <div className="card">
          <h2 className="section-title mb-3">
            Regenerate Changelog
          </h2>
          <ChangelogContentCreator
            onGenerate={handleRegenerate}
            onPreview={() => previewChangelog(ticketId)}
            onManualSubmit={handleManualCreate}
            onCancel={() => setRegenerating(false)}
            generating={actionLoading}
            description="Adjust the inputs below and regenerate a new AI draft."
          />
        </div>
        {toastEl}
      </>
    );
  }

  // Draft state
  return (
    <>
      <div className="card-warning">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">
            Changelog Review
          </h2>
          <span className={`badge ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {editing ? (
          <div className="space-y-3 animate-fade-in">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
              className="input-field"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="btn-primary px-3 py-1.5"
              >
                {actionLoading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : showRejectForm ? (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
              {changelog.content}
            </p>
            <input
              type="text"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input-field focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="btn-reject px-3 py-1.5 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Confirm Reject"}
              </button>
              <button
                onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                className="btn-secondary px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-4 leading-relaxed">
              {changelog.content}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn-approve px-3 py-1.5"
                >
                  {actionLoading ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={startEditing}
                  className="btn-secondary px-3 py-1.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => setRegenerating(true)}
                  className="btn-secondary px-3 py-1.5"
                >
                  Regenerate
                </button>
              </div>
              <button
                onClick={() => setShowRejectForm(true)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Reject
              </button>
            </div>
          </>
        )}
      </div>
      {toastEl}
    </>
  );
}
