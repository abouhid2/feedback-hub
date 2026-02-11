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

      # Schedule next run in 30 seconds
      self.class.set(wait: 30.seconds).perform_later
    end
  end
end
