"use client";

import { useState } from "react";
import { TicketGroup } from "../../lib/types";
import { generateGroupContent } from "../../lib/api";
import ChangelogContentCreator from "../ChangelogContentCreator";

const CHANNELS = ["slack", "intercom", "whatsapp", "email", "in_app"];

interface ResolveModalProps {
  group: TicketGroup;
  onConfirm: (channel: string, content: string) => Promise<void>;
  onClose: () => void;
}

export default function ResolveModal({ group, onConfirm, onClose }: ResolveModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateGroupContent(group.id);
      setContent(result.content);
    } finally {
      setGenerating(false);
    }
  };

  const handleManualSubmit = async (text: string) => {
    setContent(text);
  };

  const handleSubmit = async () => {
    if (!content) return;
    setLoading(true);
    try {
      await onConfirm(channel, content);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditContent(content || "");
    setEditing(true);
  };

  const saveEdit = () => {
    setContent(editContent.trim());
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Resolve Group</h2>
        <p className="text-sm text-gray-500 mb-4">
          Resolving &quot;{group.name}&quot; will resolve all {group.ticket_count} tickets and send one notification.
        </p>

        {!content ? (
          <ChangelogContentCreator
            onGenerate={handleGenerate}
            onManualSubmit={handleManualSubmit}
            generating={generating}
            description="Create the resolution message to send to users."
            generateLabel="Generate with AI"
            manualPlaceholder="Write the resolution message..."
          />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Content
              </label>
              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="input-field"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={!editContent.trim()} className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary px-3 py-1.5 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {content}
                  <button
                    onClick={startEditing}
                    className="block mt-2 text-xs text-brand hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="input-field w-full"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setContent(null)}
                disabled={loading}
                className="btn-secondary px-4 py-2"
              >
                Back
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || editing}
                className="btn-primary px-4 py-2"
              >
                {loading ? "Resolving..." : "Resolve Group"}
              </button>
            </div>
          </div>
        )}

        {!content && (
          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="btn-secondary px-4 py-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
