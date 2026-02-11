import { TicketEvent } from "../../lib/types";
import { EVENT_LABELS, EVENT_ICONS, timeAgo } from "../../lib/constants";

interface TicketTimelineProps {
  events: TicketEvent[];
}

export default function TicketTimeline({ events }: TicketTimelineProps) {
  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="card">
      <h2 className="section-title mb-4">
        Timeline
      </h2>
      <div className="space-y-4">
        {sortedEvents.map((event, i) => (
          <TimelineEvent
            key={i}
            event={event}
            isLast={i === sortedEvents.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineEvent({
  event,
  isLast,
}: {
  event: TicketEvent;
  isLast: boolean;
}) {
  const icon = EVENT_ICONS[event.event_type] || "\u25CB";
  const label = EVENT_LABELS[event.event_type] || event.event_type;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="text-lg">{icon}</span>
        {!isLast && <div className="w-px flex-1 bg-brand/15 mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{timeAgo(event.created_at)}</p>
        {event.data && Object.keys(event.data).length > 0 && (
          <EventData data={event.data} eventType={event.event_type} />
        )}
      </div>
    </div>
  );
}

function EventData({
  data,
  eventType,
}: {
  data: Record<string, unknown>;
  eventType: string;
}) {
  if (eventType === "status_changed") {
    return (
      <p className="text-xs text-gray-500 mt-1">
        {String(data.old_status)} &rarr; {String(data.new_status)}
      </p>
    );
  }

  return (
    <pre className="code-inline text-gray-500 mt-1">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
