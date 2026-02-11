"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchDeadLetterJobs,
  resolveDeadLetterJob,
  retryDeadLetterJob,
  fetchForceFailStatus,
  toggleForceFail,
  DeadLetterJob,
  ForceFailStatus,
} from "../../lib/api";
import { timeAgo } from "../../lib/constants";

const STATUS_FILTERS = ["all", "unresolved", "resolved", "retried"] as const;

const STATUS_BADGE: Record<string, string> = {
  unresolved: "bg-red-100 text-red-800",
  resolved: "bg-gray-100 text-gray-600",
  retried: "bg-blue-100 text-blue-800",
};

const JOB_DESCRIPTIONS: Record<string, string> = {
  ChangelogGeneratorJob: "Triggers when you click 'Generate Changelog' on a resolved ticket",
  NotificationDispatchJob: "Triggers when you approve a changelog entry",
  NotionSyncJob: "Triggers when a ticket is triaged and synced to Notion",
  NotionPollJob: "Triggers on the 2-minute Notion poll schedule",
  AiTriageJob: "Triggers when AI triage is requested for a ticket",
};

export default function DeadLettersPage() {
  const [jobs, setJobs] = useState<DeadLetterJob[]>([]);
  const [forceFailJobs, setForceFailJobs] = useState<ForceFailStatus[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("unresolved");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchDeadLetterJobs(statusFilter);
      setJobs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadForceFailStatus = useCallback(async () => {
    try {
      const data = await fetchForceFailStatus();
      setForceFailJobs(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadJobs();
    loadForceFailStatus();
    const interval = setInterval(() => {
      loadJobs();
      loadForceFailStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadJobs, loadForceFailStatus]);

  const handleToggleForceFail = async (jobClass: string) => {
    try {
      const result = await toggleForceFail(jobClass);
      setForceFailJobs((prev) =>
        prev.map((j) =>
          j.job_class === result.job_class ? { ...j, armed: result.armed } : j
        )
      );
    } catch {
      // silent
    }
  };

  const handleResolve = async (id: string) => {
    setActing(id);
    try {
      await resolveDeadLetterJob(id);
      await loadJobs();
    } catch {
      // silent
    } finally {
      setActing(null);
    }
  };

  const handleRetry = async (id: string) => {
    setActing(id);
    try {
      await retryDeadLetterJob(id);
      await loadJobs();
    } catch {
      // silent
    } finally {
      setActing(null);
    }
  };

  const armedCount = forceFailJobs.filter((j) => j.armed).length;

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="sticky top-0 bg-[var(--bg-main)] z-10 pb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Dead Letter Queue
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Jobs that failed permanently after exhausting all retries
        </p>
      </div>

      {/* Force Fail Panel */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Force Fail — arm a job to fail on next execution
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Toggle a job on, then trigger it naturally (e.g. approve a changelog
          to fire NotificationDispatchJob). It will fail and appear below.
          {armedCount > 0 && (
            <span className="ml-1 text-red-600 font-medium">
              {armedCount} armed
            </span>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {forceFailJobs.map((fj) => (
            <button
              key={fj.job_class}
              onClick={() => handleToggleForceFail(fj.job_class)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                fj.armed
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  fj.armed ? "bg-red-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              <div className="min-w-0">
                <span className="font-mono text-xs font-medium block truncate">
                  {fj.job_class}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  {JOB_DESCRIPTIONS[fj.job_class] || "Background job"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={
              statusFilter === s ? "filter-active" : "filter-inactive"
            }
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Dead letter list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--text-secondary)]">
            No dead letter jobs found
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Arm a job above, then trigger it to see it appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-sm text-[var(--text-primary)]">
                      {job.job_class}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[job.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {job.status}
                    </span>
                    {job.queue && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        queue: {job.queue}
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    <span className="text-xs font-medium text-red-600">
                      {job.error_class}
                    </span>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 break-all">
                      {job.error_message}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                    <span>Failed {timeAgo(job.failed_at)}</span>
                    {job.job_args && job.job_args.length > 0 && (
                      <span className="font-mono">
                        args: {JSON.stringify(job.job_args)}
                      </span>
                    )}
                  </div>
                </div>

                {job.status === "unresolved" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRetry(job.id)}
                      disabled={acting === job.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
                    >
                      {acting === job.id ? "..." : "Retry"}
                    </button>
                    <button
                      onClick={() => handleResolve(job.id)}
                      disabled={acting === job.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {acting === job.id ? "..." : "Resolve"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
