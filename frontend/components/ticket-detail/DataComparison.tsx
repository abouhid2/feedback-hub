"use client";

import { useState } from "react";
import { TicketDetail } from "../../lib/types";
import { TYPE_LABELS, PRIORITY_LABELS } from "../../lib/constants";

interface DataComparisonProps {
  ticket: TicketDetail;
}

export default function DataComparison({ ticket }: DataComparisonProps) {
  const [dataView, setDataView] = useState<"normalized" | "raw">("normalized");

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">Data</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setDataView("normalized")}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              dataView === "normalized"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Normalized
          </button>
          <button
            onClick={() => setDataView("raw")}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              dataView === "raw"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Raw payload
          </button>
        </div>
      </div>

      {dataView === "normalized" ? (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500 w-1/4">
                Title
              </td>
              <td className="py-2 text-gray-900">{ticket.title}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">Type</td>
              <td className="py-2 text-gray-900">
                {TYPE_LABELS[ticket.ticket_type] || ticket.ticket_type}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">Priority</td>
              <td className="py-2 text-gray-900">
                {PRIORITY_LABELS[ticket.priority] || `P${ticket.priority}`}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">Status</td>
              <td className="py-2 text-gray-900">{ticket.status}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">Channel</td>
              <td className="py-2 text-gray-900">{ticket.original_channel}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">
                Description
              </td>
              <td className="py-2 text-gray-900">
                {ticket.description
                  ? ticket.description.length > 200
                    ? ticket.description.slice(0, 200) + "..."
                    : ticket.description
                  : "\u2014"}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500 align-top">
                Metadata
              </td>
              <td className="py-2">
                <pre className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 overflow-x-auto">
                  {ticket.metadata
                    ? JSON.stringify(ticket.metadata, null, 2)
                    : "\u2014"}
                </pre>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium text-gray-500">Tags</td>
              <td className="py-2 text-gray-900">
                {ticket.tags.length > 0 ? ticket.tags.join(", ") : "\u2014"}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="space-y-4">
          {ticket.sources.map((source, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                {source.platform}
              </p>
              <pre className="bg-gray-50 rounded p-3 text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(source.raw_payload, null, 2)}
              </pre>
            </div>
          ))}
          {ticket.sources.length === 0 && (
            <p className="text-gray-400 text-sm">
              No source payloads available
            </p>
          )}
        </div>
      )}
    </div>
  );
}
