class AutoGroupingService
  SIMILARITY_THRESHOLD = 0.82
  LOOKBACK_HOURS = 24
  MAX_CANDIDATES = 200

  def self.call(ticket)
    new(ticket).call
  end

  def initialize(ticket)
    @ticket = ticket
  end

  def call
    return nil if @ticket.ai_embedding.blank?

    candidates = find_candidates
    return nil if candidates.empty?

    matches = candidates
      .map { |c| { ticket: c, similarity: cosine_similarity(@ticket.ai_embedding, c.ai_embedding) } }
      .select { |m| m[:similarity] >= SIMILARITY_THRESHOLD }
      .sort_by { |m| -m[:similarity] }

    return nil if matches.empty?

    matched_tickets = matches.map { |m| m[:ticket] }
    grouped_match = matched_tickets.find { |t| t.ticket_group_id.present? }

    if grouped_match
      # Add to existing group
      add_to_existing_group(grouped_match.ticket_group_id)
    else
      # Create new group with the new ticket + all matches
      create_new_group(matched_tickets)
    end
  end

  private

  def find_candidates
    Ticket.where("tickets.created_at >= ?", LOOKBACK_HOURS.hours.ago)
          .where.not(id: @ticket.id)
          .where.not(ai_embedding: nil)
          .order(created_at: :desc)
          .limit(MAX_CANDIDATES)
  end

  def add_to_existing_group(group_id)
    return nil if @ticket.ticket_group_id.present?

    group = TicketGroup.find(group_id)
    TicketGroupService.add_tickets(group, [@ticket.id])
    group
  rescue TicketGroupService::AlreadyGrouped
    nil
  end

  def create_new_group(matched_tickets)
    ungrouped = matched_tickets.select { |t| t.ticket_group_id.nil? }
    all_tickets = [@ticket] + ungrouped

    return nil if all_tickets.size < 2
    return nil if @ticket.ticket_group_id.present?

    group_name = generate_group_name(all_tickets)
    TicketGroupService.create_group(
      name: group_name,
      ticket_ids: all_tickets.map(&:id),
      primary_ticket_id: @ticket.id
    )
  rescue TicketGroupService::AlreadyGrouped, TicketGroupService::InvalidGroup
    nil
  end

  def generate_group_name(tickets)
    # Use the shortest title as a base for the group name
    shortest = tickets.min_by { |t| t.title.length }
    title = shortest.title.truncate(50)
    "Auto: #{title}"
  end

  def cosine_similarity(vec_a, vec_b)
    # OpenAI embeddings are L2-normalized, so dot product = cosine similarity
    dot_product(vec_a, vec_b)
  end

  def dot_product(vec_a, vec_b)
    sum = 0.0
    vec_a.each_with_index { |a, i| sum += a * vec_b[i] }
    sum
  end
end
