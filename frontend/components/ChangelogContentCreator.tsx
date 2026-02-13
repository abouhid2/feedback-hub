"use client";

import { useState } from "react";
import { ChangelogPreview } from "../lib/api";

interface GenerateOptions {
  prompt?: string;
  systemPrompt?: string;
  resolutionNotes?: string;
  model?: string;
}

const AI_MODELS = ["gpt-5.1", "gpt-4.1", "gpt-4o-mini", "o3-mini"];

interface ChangelogContentCreatorProps {
  onGenerate: (options?: GenerateOptions) => Promise<void>;
  onManualSubmit: (content: string) => Promise<void>;
  onPreview?: () => Promise<ChangelogPreview>;
  onCancel?: () => void;
  generating: boolean;
  description?: string;
  generateLabel?: string;
  manualPlaceholder?: string;
}

const MANUAL_TEMPLATE = `**What happened:**
[Describe the issue in simple, non-technical terms]

**How we fixed it:**
[Explain the resolution, focusing on the outcome]

**Going forward:**
[Brief reassurance that this has been resolved]`;

export default function ChangelogContentCreator({
  onGenerate,
  onManualSubmit,
  onPreview,
  onCancel,
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
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [editedSystemPrompt, setEditedSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);

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
      setEditedSystemPrompt(data.system_prompt);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Failed to load preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmGenerate = async () => {
    await onGenerate({
      prompt: editedPrompt,
      systemPrompt: editedSystemPrompt,
      resolutionNotes: resolutionNotes || undefined,
      model: selectedModel,
    });
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
      <div className="space-y-4 animate-fade-in">
        {/* Resolution notes */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            Resolution notes
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={3}
            placeholder="Explain what was done to fix this issue. Include PR links, technical context — the AI will translate this into a customer-friendly message."
            className="input-field font-mono text-xs leading-relaxed"
          />
        </div>

        {/* Redactions warning */}
        {hasRedactions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              {preview.redactions.length} sensitive item(s) redacted:
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {preview.redactions.map((r, i) => (
                <li key={i} className="font-mono">
                  <span className="font-bold">[{r.type.toUpperCase()}]</span>{" "}
                  <span className="line-through text-red-600">{r.original}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scrubbed ticket text */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            {hasRedactions ? "Scrubbed ticket text" : "Ticket text"}
          </label>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={8}
            className="input-field font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-text-muted mt-1">
            This is what will be sent to OpenAI. You can edit it before generating.
          </p>
        </div>

        {/* Model selector */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
            AI Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input-field w-auto font-mono text-sm"
          >
            {AI_MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* System prompt */}
        <div>
          <button
            type="button"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
          >
            <span>AI instructions (system prompt)</span>
            <svg
              className={`w-3.5 h-3.5 text-text-muted transition-transform ${showSystemPrompt ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSystemPrompt && (
            <div className="animate-fade-in">
              <textarea
                value={editedSystemPrompt}
                onChange={(e) => setEditedSystemPrompt(e.target.value)}
                rows={12}
                className="input-field font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-text-muted mt-1">
                Controls the AI&apos;s tone, structure, and behaviour.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => { setPreview(null); setPreviewError(null); }}
            disabled={generating}
            className="btn-secondary px-4 py-2"
          >
            Back
          </button>
          <button
            onClick={handleConfirmGenerate}
            disabled={generating}
            className="btn-primary px-4 py-2"
          >
            {generating ? "Generating..." : "Confirm & Generate"}
          </button>
        </div>
      </div>
    );
  }

  // Manual form state
  if (showManualForm) {
    return (
      <div className="space-y-3 animate-fade-in">
        <textarea
          value={manualContent}
          onChange={(e) => setManualContent(e.target.value)}
          rows={10}
          placeholder={manualPlaceholder}
          className="input-field"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowManualForm(false)}
            disabled={submitting}
            className="btn-secondary px-4 py-2"
          >
            Back
          </button>
          <button
            onClick={handleManualCreate}
            disabled={submitting || !manualContent.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Draft"}
          </button>
        </div>
      </div>
    );
  }

  // Default state
  return (
    <div>
      {description && (
        <p className="text-sm text-text-secondary mb-3">{description}</p>
      )}
      {previewError && (
        <p className="text-red-600 text-sm mb-2">{previewError}</p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={generating || loadingPreview}
            className="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => { setManualContent(MANUAL_TEMPLATE); setShowManualForm(true); }}
          disabled={generating || loadingPreview}
          className="btn-secondary px-4 py-2"
        >
          Write Manually
        </button>
        <button
          onClick={handlePreview}
          disabled={generating || loadingPreview}
          className="btn-primary px-4 py-2"
        >
          {loadingPreview ? "Loading preview..." : generateLabel}
        </button>
      </div>
    </div>
  );
}
