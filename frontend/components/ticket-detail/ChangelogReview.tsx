"use client";

import { useEffect, useState, useCallback } from "react";
import { ChangelogEntry } from "../../lib/types";
import {
  fetchChangelog,
  generateChangelog,
  approveChangelog,
  rejectChangelog,
  updateChangelogDraft,
} from "../../lib/api";
import {
  CHANGELOG_STATUS_COLORS,
  CHANGELOG_STATUS_LABELS,
} from "../../lib/constants";

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

  const load = useCallback(async () => {
    setLoading(true);
    const entry = await fetchChangelog(ticketId);
    setChangelog(entry);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      const entry = await generateChangelog(ticketId);
      setChangelog(entry);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const entry = await approveChangelog(ticketId, "admin@mainder.com");
      setChangelog(entry);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const entry = await rejectChangelog(ticketId, "admin@mainder.com", rejectReason);
      setChangelog(entry);
      setShowRejectForm(false);
      setRejectReason("");
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
    } finally {
      setActionLoading(false);
    }
  };

  const startEditing = () => {
    setEditContent(changelog?.content || "");
    setEditing(true);
    setShowRejectForm(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
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
    return null;
  }

  // No changelog but ticket is resolved — show generate button
  if (!changelog) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Changelog Review
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          This ticket is resolved. Generate an AI changelog entry for review.
        </p>
        <button
          onClick={handleGenerate}
          disabled={actionLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {actionLoading ? "Generating..." : "Generate Changelog"}
        </button>
      </div>
    );
  }

  const statusColor = CHANGELOG_STATUS_COLORS[changelog.status] || "";
  const statusLabel = CHANGELOG_STATUS_LABELS[changelog.status] || changelog.status;

  // Approved state
  if (changelog.status === "approved") {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">
            Changelog Review
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
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
    );
  }

  // Rejected state
  if (changelog.status === "rejected") {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">
            Changelog Review
          </h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 whitespace-pre-wrap">
          {changelog.content}
        </p>
      </div>
    );
  }

  // Draft state
  return (
    <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">
          Changelog Review
        </h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="bg-amber-100 border border-amber-300 rounded-md px-3 py-2 mb-3">
        <p className="text-xs text-amber-800 font-medium">
          This AI-generated changelog entry requires human review before publishing.
        </p>
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : showRejectForm ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
            {changelog.content}
          </p>
          <input
            type="text"
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "Rejecting..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
              className="px-3 py-1.5 bg-white text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap mb-4">
            {changelog.content}
          </p>
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}
