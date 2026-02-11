class DeadLetterHandlerJob < ApplicationJob
  queue_as :default

  def perform(job_class:, job_args: [], error_class:, error_message:, queue: nil, backtrace: nil)
    DeadLetterJob.create!(
      job_class: job_class,
      job_args: job_args,
      error_class: error_class,
      error_message: error_message,
      queue: queue,
      backtrace: backtrace,
      failed_at: Time.current
    )
  end
end
