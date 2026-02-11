module Api
  class DeadLetterJobsController < ApplicationController
    def index
      scope = DeadLetterJob.recent
      scope = scope.where(status: params[:status]) if params[:status].present?
      render json: scope
    end

    def resolve
      dlj = DeadLetterJob.find(params[:id])
      dlj.update!(status: "resolved")
      render json: dlj
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Not found" }, status: :not_found
    end

    def retry_job
      dlj = DeadLetterJob.find(params[:id])
      dlj.job_class.constantize.perform_later(*dlj.job_args)
      dlj.update!(status: "retried")
      render json: dlj
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Not found" }, status: :not_found
    end

    # Toggle force-fail flag on a job class.
    # Next time that job runs, it will raise immediately.
    def force_fail
      job_class = params[:job_class]
      return render json: { error: "job_class is required" }, status: :unprocessable_entity if job_class.blank?
      return render json: { error: "Unknown job class" }, status: :unprocessable_entity unless FORCEABLE_JOBS.include?(job_class)

      key = "force_fail:#{job_class}"
      if ForceFailStore.armed?(key)
        ForceFailStore.disarm(key)
        render json: { job_class: job_class, armed: false }
      else
        ForceFailStore.arm(key)
        render json: { job_class: job_class, armed: true }
      end
    end

    def force_fail_status
      status = FORCEABLE_JOBS.map do |job_class|
        { job_class: job_class, armed: ForceFailStore.armed?("force_fail:#{job_class}") }
      end
      render json: status
    end

    private

    FORCEABLE_JOBS = %w[
      ChangelogGeneratorJob
      NotificationDispatchJob
      NotionSyncJob
      NotionPollJob
      AiTriageJob
    ].freeze
  end
end
