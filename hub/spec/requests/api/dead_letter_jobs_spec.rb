require "rails_helper"

RSpec.describe "Api::DeadLetterJobs", type: :request do
  before do
    DeadLetterJob.create!(
      job_class: "ChangelogGeneratorJob",
      job_args: ["ticket-1"],
      error_class: "ChangelogGeneratorService::AiApiError",
      error_message: "OpenAI returned 500",
      queue: "default",
      failed_at: 1.hour.ago,
      status: "unresolved"
    )
    DeadLetterJob.create!(
      job_class: "NotionSyncJob",
      job_args: ["ticket-2"],
      error_class: "NotionSyncService::ApiError",
      error_message: "Notion API error",
      queue: "default",
      failed_at: 2.hours.ago,
      status: "resolved"
    )
    DeadLetterJob.create!(
      job_class: "NotificationDispatchJob",
      job_args: ["notif-1"],
      error_class: "StandardError",
      error_message: "Connection refused",
      queue: "default",
      failed_at: 30.minutes.ago,
      status: "unresolved"
    )
  end

  describe "GET /api/dead_letter_jobs" do
    it "returns all dead letter jobs ordered by most recent" do
      get "/api/dead_letter_jobs"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(3)
      expect(body.first["job_class"]).to eq("NotificationDispatchJob")
    end

    it "filters by status" do
      get "/api/dead_letter_jobs", params: { status: "unresolved" }

      body = JSON.parse(response.body)
      expect(body.length).to eq(2)
      expect(body.map { |j| j["status"] }).to all(eq("unresolved"))
    end

    it "includes all expected fields" do
      get "/api/dead_letter_jobs"

      body = JSON.parse(response.body)
      entry = body.first
      expect(entry).to have_key("id")
      expect(entry).to have_key("job_class")
      expect(entry).to have_key("job_args")
      expect(entry).to have_key("error_class")
      expect(entry).to have_key("error_message")
      expect(entry).to have_key("queue")
      expect(entry).to have_key("failed_at")
      expect(entry).to have_key("status")
    end
  end

  describe "PATCH /api/dead_letter_jobs/:id/resolve" do
    it "marks a dead letter job as resolved" do
      dlj = DeadLetterJob.unresolved.first
      patch "/api/dead_letter_jobs/#{dlj.id}/resolve"

      expect(response).to have_http_status(:ok)
      expect(dlj.reload.status).to eq("resolved")
    end

    it "returns 404 for non-existent record" do
      patch "/api/dead_letter_jobs/00000000-0000-0000-0000-000000000000/resolve"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/dead_letter_jobs/:id/retry" do
    it "re-enqueues the original job and marks as retried" do
      dlj = DeadLetterJob.find_by(job_class: "ChangelogGeneratorJob")

      expect {
        post "/api/dead_letter_jobs/#{dlj.id}/retry"
      }.to have_enqueued_job(ChangelogGeneratorJob).with("ticket-1")

      expect(response).to have_http_status(:ok)
      expect(dlj.reload.status).to eq("retried")
    end
  end

  describe "POST /api/dead_letter_jobs/force_fail" do
    after { ForceFailStore.disarm("force_fail:ChangelogGeneratorJob") }

    it "arms a job class for force failure" do
      post "/api/dead_letter_jobs/force_fail", params: { job_class: "ChangelogGeneratorJob" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["job_class"]).to eq("ChangelogGeneratorJob")
      expect(body["armed"]).to be true
      expect(ForceFailStore.armed?("force_fail:ChangelogGeneratorJob")).to be true
    end

    it "disarms when toggled a second time" do
      ForceFailStore.arm("force_fail:ChangelogGeneratorJob")

      post "/api/dead_letter_jobs/force_fail", params: { job_class: "ChangelogGeneratorJob" }

      body = JSON.parse(response.body)
      expect(body["armed"]).to be false
      expect(ForceFailStore.armed?("force_fail:ChangelogGeneratorJob")).to be false
    end

    it "rejects unknown job classes" do
      post "/api/dead_letter_jobs/force_fail", params: { job_class: "HackerJob" }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/dead_letter_jobs/force_fail_status" do
    it "returns status for all forceable jobs" do
      get "/api/dead_letter_jobs/force_fail_status"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(5)
      expect(body.map { |j| j["job_class"] }).to include("ChangelogGeneratorJob", "NotificationDispatchJob")
      expect(body.first).to have_key("armed")
    end
  end
end
