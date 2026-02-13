require "net/http"

module Simulator
  class IncidentSimulatorJob < ApplicationJob
    queue_as :simulator

    WHATSAPP_MESSAGES = [
      { name: "Pablo Lavin", message: "No puedo entrar a la plataforma desde hace una hora, me sale error 502" },
      { name: "María González", message: "Hola, la app no funciona desde la actualización de hoy, no carga nada" },
      { name: "Carlos Mendoza", message: "App is down since the update, can't log in at all" },
      { name: "Sofía Reyes", message: "El sistema no responde, llevo 30 minutos intentando entrar y nada" },
      { name: "Diego Fernández", message: "Buenas, no puedo acceder a mi cuenta, dice servicio no disponible" },
    ].freeze

    SLACK_INCIDENTS = [
      { user: "devops_lead", channel: "incidents", message: "POST /login returns 502 after latest deploy — authentication service not responding" },
      { user: "backend_eng", channel: "incidents", message: "Production down — auth service pods crashing in loop after v2.4.1 rollout, all login endpoints returning 502" },
    ].freeze

    SLACK_CLIENTS = [
      { user: "cs_manager", channel: "clients", message: "Multiple clients reporting they can't log in since 10am — seems related to the latest deploy" },
    ].freeze

    def perform
      results = []

      WHATSAPP_MESSAGES.each do |msg|
        results << post_whatsapp(msg[:name], msg[:message])
      end

      SLACK_INCIDENTS.each do |msg|
        results << post_slack(msg[:user], msg[:channel], msg[:message])
      end

      SLACK_CLIENTS.each do |msg|
        results << post_slack(msg[:user], msg[:channel], msg[:message])
      end

      results
    end

    private

    def post_whatsapp(name, message)
      phone = "56#{rand(9_000_000_0..9_999_999_9)}"
      payload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "BIZ_#{SecureRandom.hex(6).upcase}",
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "PHONE_#{SecureRandom.hex(4).upcase}" },
              contacts: [{ profile: { name: name }, wa_id: phone }],
              messages: [{
                id: "wamid.#{SecureRandom.hex(16)}",
                from: phone,
                timestamp: Time.now.to_i.to_s,
                type: "text",
                text: { body: message }
              }]
            },
            field: "messages"
          }]
        }]
      }

      post_webhook("/webhooks/whatsapp", payload)
    end

    def post_slack(user_name, channel, message)
      payload = {
        token: "xoxb-#{SecureRandom.hex(12)}",
        team_id: "T#{SecureRandom.hex(4).upcase}",
        team_domain: "feedback-hub",
        channel_id: "C_#{channel.upcase}",
        channel_name: channel,
        user_id: "U_#{user_name.upcase}",
        user_name: user_name,
        command: "/bug",
        text: message,
        trigger_id: "#{rand(100..999)}.#{rand(100..999)}.#{SecureRandom.hex(6)}",
        response_url: "https://hooks.slack.com/commands/#{SecureRandom.hex(6)}",
        payload: {
          issue_id: "INC#{SecureRandom.hex(4).upcase}",
          reporter: user_name,
          priority: "critica",
          incident: message,
          agency: "Platform",
          job_id: "https://feedback-hub.example.com/incidents/#{SecureRandom.hex(6)}",
          additional_details: "Incident simulation — platform access outage after deploy"
        }
      }

      post_webhook("/webhooks/slack", payload)
    end

    def post_webhook(path, payload)
      uri = URI("http://localhost:3000#{path}")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, "Content-Type" => "application/json")
      request.body = payload.to_json
      response = http.request(request)
      Rails.logger.info("[IncidentSimulator] POST #{path} => #{response.code}")
      response.code
    end
  end
end
