module JobLogging
  extend ActiveSupport::Concern

  class ForceFailError < RuntimeError; end

  included do
    around_perform :log_job_execution
  end

  private

  def log_job_execution
    log = StructuredLogger.instance.with_context(
      job_name: self.class.name,
      job_id: job_id,
      queue: queue_name
    )

    log.info("Job started", args: arguments)

    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    check_force_fail!
    yield
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round

    log.info("Job completed", duration_ms: duration_ms, args: arguments)
  rescue ForceFailError => e
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round
    log.error("Job failed",
      duration_ms: duration_ms,
      error: e.message,
      error_class: e.class.name,
      args: arguments
    )
    DeadLetterJob.create!(
      job_class: self.class.name,
      job_args: arguments,
      error_class: e.class.name,
      error_message: e.message,
      queue: queue_name,
      failed_at: Time.current,
      status: "unresolved"
    )
    # Don't re-raise — skip Sidekiq retries, the DLQ entry is already created
  rescue => e
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round
    log.error("Job failed",
      duration_ms: duration_ms,
      error: e.message,
      error_class: e.class.name,
      args: arguments
    )
    raise
  end

  def check_force_fail!
    key = "force_fail:#{self.class.name}"
    return unless ForceFailStore.exist?(key)

    ForceFailStore.delete(key)
    raise ForceFailError, "[Force Fail] #{self.class.name} was flagged to fail for dead letter queue testing"
  end
end
