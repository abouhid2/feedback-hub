require "net/http"

module Simulator
  class SlackSimulatorJob < ApplicationJob
    queue_as :simulator

    AGENCIES = ["Talents", "TalentSearch", "Recruiting Pro", "HireUp", "StaffConnect"].freeze
    CHANNELS = %w[incidents bugs soporte].freeze

    SPANISH_BUGS = [
      "Error al mover candidato desde etapa a descartado",
      "No se puede descargar CV del candidato",
      "Botón de guardar no responde en formulario de postulación",
      "Error 500 al intentar cambiar estado del proceso",
      "Candidato duplicado aparece en dos procesos distintos",
      "La notificación de rechazo no llega al candidato",
      "Error al cargar la lista de candidatos con filtro",
      "El enlace de la oferta de trabajo da error 404",
      "No se puede asignar evaluador al proceso",
      "Reporte de pipeline muestra datos incorrectos",
    ].freeze

    PII_TEXT = AiConstants::PII_TEXT

    def perform(include_pii: false)
      user_name = include_pii ? "maria.garcia" : Faker::Internet.username(specifier: 5..12)
      agency = AGENCIES.sample
      channel = CHANNELS.sample
      text = include_pii ? PII_TEXT : SPANISH_BUGS.sample

      payload = {
        token: "xoxb-#{SecureRandom.hex(12)}",
        team_id: "T#{SecureRandom.hex(4).upcase}",
        team_domain: "feedback-hub",
        channel_id: "C_#{channel.upcase}",
        channel_name: channel,
        user_id: "U_#{user_name.upcase}",
        user_name: user_name,
        command: "/bug",
        text: text,
        trigger_id: "#{rand(100..999)}.#{rand(100..999)}.#{SecureRandom.hex(6)}",
        response_url: "https://hooks.slack.com/commands/#{SecureRandom.hex(6)}",
        payload: {
          issue_id: "ReCoACFaKAP#{SecureRandom.hex(4).upcase}",
          reporter: user_name,
          priority: %w[critica alta media baja].sample,
          incident: text,
          agency: agency,
          job_id: "https://feedback-hub.example.com/positions/#{SecureRandom.hex(6)}",
          additional_details: include_pii ? AiConstants::PII_ADDITIONAL_DETAILS : Faker::Lorem.sentence(word_count: 8)
        }
      }

      post_webhook("/webhooks/slack", payload)
    end

    private

    def post_webhook(path, payload)
      uri = URI("http://localhost:3000#{path}")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, "Content-Type" => "application/json")
      request.body = payload.to_json
      response = http.request(request)
      Rails.logger.info("[SlackSimulator] POST #{path} => #{response.code}")
    end
  end
end
