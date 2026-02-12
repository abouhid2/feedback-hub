"use client";

import { useState } from "react";
import { ChangelogPreview } from "../lib/api";

interface ChangelogContentCreatorProps {
  onGenerate: (customPrompt?: string) => Promise<void>;
  onManualSubmit: (content: string) => Promise<void>;
  onPreview?: () => Promise<ChangelogPreview>;
  generating: boolean;
  description?: string;
  generateLabel?: string;
  manualPlaceholder?: string;
}

export default function ChangelogContentCreator({
  onGenerate,
  onManualSubmit,
  onPreview,
  generating,
  description,
  generateLabel = "Generate with AI",
  manualPlaceholder = "Write your changelog entry...",
}: ChangelogContentCreatorProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<ChangelogPreview | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = async () => {
    if (!onPreview) {
      await onGenerate();
      return;
    }
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await onPreview();
      setPreview(data);
      setEditedPrompt(data.scrubbed);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmGenerate = async () => {
    await onGenerate(editedPrompt);
    setPreview(null);
  };

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

  // Preview state
  if (preview) {
    const hasRedactions = preview.redactions.length > 0;
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          AI prompt preview
        </p>

        {hasRedactions && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <p className="text-xs font-medium text-amber-800 mb-1">
              {preview.redactions.length} sensitive item(s) will be redacted before sending to AI:
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {preview.redactions.map((r, i) => (
                <li key={i} className="font-mono">
                  <span className="font-semibold">[{r.type.toUpperCase()}]</span>{" "}
                  <span className="line-through text-red-600">{r.original}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          <p className="text-xs font-medium text-gray-500 mb-1">
            {hasRedactions ? "Scrubbed text (sent to OpenAI):" : "Text sent to OpenAI:"}
          </p>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={6}
            className="w-full text-sm text-gray-800 font-mono leading-relaxed bg-white border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-brand focus:border-transparent resize-y"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirmGenerate}
            disabled={generating}
            className="btn-primary px-4 py-2"
          >
            {generating ? "Generating..." : "Confirm & Generate"}
          </button>
          <button
            onClick={() => setPreview(null)}
            disabled={generating}
            className="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Manual form state
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

  // Default state
  return (
    <div>
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      {previewError && (
        <p className="text-red-600 text-sm mb-2">{previewError}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={generating || loadingPreview}
          className="btn-primary px-4 py-2"
        >
          {loadingPreview ? "Loading preview..." : generateLabel}
        </button>
        <button
          onClick={() => setShowManualForm(true)}
          disabled={generating || loadingPreview}
          className="btn-secondary px-4 py-2"
        >
          Write Manually
        </button>
      </div>
    </div>
  );
}
