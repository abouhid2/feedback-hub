module Simulator
  class SchedulerJob < ApplicationJob
    queue_as :simulator

    SIMULATORS = [
      SlackSimulatorJob,
      IntercomSimulatorJob,
      WhatsappSimulatorJob
    ].freeze

    def perform
      # Pick a random simulator and fire it
      simulator = SIMULATORS.sample
      Rails.logger.info("[Scheduler] Firing #{simulator.name}")
      simulator.perform_later

      # Schedule next run in 3 minutes (~20 tickets/hour)
      self.class.set(wait: 3.minutes).perform_later
    end
  end
end
