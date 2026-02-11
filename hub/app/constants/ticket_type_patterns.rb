module TicketTypePatterns
  VALID_TYPES = %w[bug feature_request question incident].freeze

  # Order matters — first match wins (most specific → least specific)
  PATTERNS = [
    {
      type: "incident",
      regex: /incident[e]?|outage|down|ca[ií]da|fuera de servicio|no funciona el sistema|sistema ca[iy]/i
    },
    {
      type: "feature_request",
      regex: /feature|mejora|sugerencia|suggest|podr[ií]a[n]?\s|ser[ií]a\s(bueno|genial|[uú]til)|a[ñn]adir|agregar\s(un|una|campos|funcionalidad)|integrar con|posible\s(agregar|integrar|a[ñn]adir)/i
    },
    {
      type: "question",
      regex: /\?|pregunta|question|how to|c[oó]mo\s(puedo|se|hago)|quiero saber|necesito (ayuda|saber)|help me/i
    }
  ].freeze

  DEFAULT_TYPE = "bug".freeze

  def self.infer(text)
    text_lower = text.to_s.downcase
    match = PATTERNS.find { |p| text_lower.match?(p[:regex]) }
    match ? match[:type] : DEFAULT_TYPE
  end
end
