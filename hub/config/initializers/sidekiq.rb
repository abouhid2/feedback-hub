Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }

  # Death handler: when a Sidekiq job exhausts all retries, capture it
  # in the dead_letter_jobs table for visibility and manual retry.
  config.death_handlers << ->(job, ex) {
    DeadLetterHandlerJob.perform_later(
      job_class: job["class"],
      job_args: job["args"],
      error_class: ex.class.name,
      error_message: ex.message,
      queue: job["queue"],
      backtrace: ex.backtrace&.first(10)
    )
  }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end
