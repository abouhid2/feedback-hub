"use client";

import { useState } from "react";

interface ChangelogContentCreatorProps {
  onGenerate: () => Promise<void>;
  onManualSubmit: (content: string) => Promise<void>;
  generating: boolean;
  description?: string;
  generateLabel?: string;
  manualPlaceholder?: string;
}

export default function ChangelogContentCreator({
  onGenerate,
  onManualSubmit,
  generating,
  description,
  generateLabel = "Generate with AI",
  manualPlaceholder = "Write your changelog entry...",
}: ChangelogContentCreatorProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleManualCreate = async () => {
    if (!manualContent.trim()) return;
    setSubmitting(true);
    try {
      await onManualSubmit(manualContent.trim());
      setShowManualForm(false);
      setManualContent("");
    } finally {
      setSubmitting(false);
    }
  };

  if (showManualForm) {
    return (
      <div className="space-y-3">
        <textarea
          value={manualContent}
          onChange={(e) => setManualContent(e.target.value)}
          rows={5}
          placeholder={manualPlaceholder}
          className="input-field"
        />
        <div className="flex gap-2">
          <button
            onClick={handleManualCreate}
            disabled={submitting || !manualContent.trim()}
            className="btn-primary px-3 py-1.5 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Draft"}
          </button>
          <button
            onClick={() => { setShowManualForm(false); setManualContent(""); }}
            disabled={submitting}
            className="btn-secondary px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={generating}
          className="btn-primary px-4 py-2"
        >
          {generating ? "Generating..." : generateLabel}
        </button>
        <button
          onClick={() => setShowManualForm(true)}
          disabled={generating}
          className="btn-secondary px-4 py-2"
        >
          Write Manually
        </button>
      </div>
    </div>
  );
}
