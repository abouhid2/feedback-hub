"use client";

import { useState } from "react";
import { TicketGroup } from "../../lib/types";
import { generateGroupContent, previewGroupContent } from "../../lib/api";
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

  const handleGenerate = async (options?: { prompt?: string; systemPrompt?: string; resolutionNotes?: string }) => {
    setGenerating(true);
    try {
      const result = await generateGroupContent(group.id, options);
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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Resolve Group</h2>
        <p className="text-sm text-text-secondary mb-4">
          Resolving &quot;{group.name}&quot; will resolve all {group.ticket_count} tickets and send one notification.
        </p>

        {!content ? (
          <ChangelogContentCreator
            onGenerate={handleGenerate}
            onPreview={() => previewGroupContent(group.id)}
            onManualSubmit={handleManualSubmit}
            onCancel={onClose}
            generating={generating}
            description="Create the resolution message to send to users."
            generateLabel="Generate with AI"
            manualPlaceholder="Write the resolution message..."
          />
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
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
                    <button onClick={saveEdit} disabled={!editContent.trim()} className="btn-primary px-3 py-1.5 disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary px-3 py-1.5">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-inset rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {content}
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={startEditing}
                      className="text-xs text-brand hover:text-brand-dark font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setContent(null)}
                      className="text-xs text-brand hover:text-brand-dark font-medium"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
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
      </div>
    </div>
  );
}
