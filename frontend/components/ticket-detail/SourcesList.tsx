import { TicketSource } from "../../lib/types";

interface SourcesListProps {
  sources: TicketSource[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  return (
    <div className="card">
      <h2 className="section-title mb-2">
        Sources
      </h2>
      {sources.length > 0 ? (
        <ul className="space-y-1">
          {sources.map((source, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 capitalize">
                {source.platform}
              </span>
              {source.external_url && (
                <a
                  href={source.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-brand"
                >
                  View original
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm">No sources linked</p>
      )}
    </div>
  );
}
