import {
  TYPE_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "../../lib/constants";

interface AITriageCardProps {
  aiSummary: string | null;
  aiSuggestedType: string | null;
  aiSuggestedPriority: number | null;
  enrichmentStatus: string | null;
}

export default function AITriageCard({
  aiSummary,
  aiSuggestedType,
  aiSuggestedPriority,
  enrichmentStatus,
}: AITriageCardProps) {
  if (enrichmentStatus !== "completed") return null;

  return (
    <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
      <h2 className="text-sm font-semibold text-indigo-800 uppercase mb-3">
        AI Triage
      </h2>
      <div className="space-y-2">
        {aiSummary && <p className="text-gray-800">{aiSummary}</p>}
        <div className="flex flex-wrap gap-3 text-sm">
          {aiSuggestedType && (
            <span className="text-gray-600">
              Suggested type:{" "}
              <span className="font-medium text-gray-900">
                {TYPE_LABELS[aiSuggestedType] || aiSuggestedType}
              </span>
            </span>
          )}
          {aiSuggestedPriority != null && (
            <span className="text-gray-600">
              Suggested priority:{" "}
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                  PRIORITY_COLORS[aiSuggestedPriority] || "bg-gray-200"
                }`}
              >
                {PRIORITY_LABELS[aiSuggestedPriority] ||
                  `P${aiSuggestedPriority}`}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
