namespace :simulator do
  desc "Start the webhook simulator (enqueues the scheduler job)"
  task start: :environment do
    puts "Starting Feedback Hub Simulator..."
    puts "Simulator will fire random webhooks every 10-30 seconds"
    Simulator::SchedulerJob.perform_later
    puts "Scheduler job enqueued! Make sure Sidekiq is running."
  end
end
