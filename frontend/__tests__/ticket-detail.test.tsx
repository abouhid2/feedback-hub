import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetailPage from "../app/tickets/[id]/page";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "abc-123" }),
}));

const mockTicketDetail = {
  id: "abc-123",
  title: "Login button broken on Safari",
  description: "Users report the login button is unresponsive on Safari 17.2",
  ticket_type: "bug",
  priority: 1,
  status: "open",
  original_channel: "slack",
  reporter: { name: "Jane Doe", email: "jane@test.com" },
  tags: ["safari", "login"],
  created_at: "2026-02-10T14:30:00Z",
  updated_at: "2026-02-11T09:15:00Z",
  metadata: {
    browser: "Safari 17.2",
    os: "macOS Sequoia",
    slack_channel: "#bugs",
  },
  ai_suggested_type: "bug",
  ai_suggested_priority: 0,
  ai_summary:
    "Critical login button regression on Safari 17.2 affecting multiple users. Likely CSS compatibility issue.",
  enrichment_status: "completed",
  notion_page_id: "notion-page-abc123",
  sources: [
    {
      platform: "slack",
      external_id: "slack-msg-001",
      external_url: "https://workspace.slack.com/archives/C123/p456",
    },
  ],
  events: [
    {
      event_type: "created",
      actor_type: "system",
      data: { source: "slack" },
      created_at: "2026-02-10T14:30:00Z",
    },
    {
      event_type: "ai_triaged",
      actor_type: "system",
      data: {
        ai_suggested_type: "bug",
        ai_suggested_priority: 0,
        ai_summary: "Critical login button regression",
      },
      created_at: "2026-02-10T14:31:00Z",
    },
    {
      event_type: "synced_to_notion",
      actor_type: "system",
      data: {},
      created_at: "2026-02-10T14:32:00Z",
    },
    {
      event_type: "status_changed",
      actor_type: "user",
      data: { old_status: "open", new_status: "in_progress" },
      created_at: "2026-02-11T09:15:00Z",
    },
  ],
};

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTicketDetail),
    })
  ) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Ticket Detail Page", () => {
  it("renders ticket title and description", async () => {
    render(<TicketDetailPage />);

    expect(
      await screen.findByText("Login button broken on Safari")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Users report the login button is unresponsive/)
    ).toBeInTheDocument();
  });

  it("renders back link to ticket list", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");
    const backLink = screen.getByRole("link", { name: /back to tickets/i });
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("shows priority, channel, status, and type badges", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");
    expect(screen.getByText(/P1 High/)).toBeInTheDocument();
    expect(screen.getByText("slack")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("renders the event timeline in chronological order", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");

    // All 4 events should appear
    expect(screen.getByText("Ticket created")).toBeInTheDocument();
    expect(screen.getByText("AI triage completed")).toBeInTheDocument();
    expect(screen.getByText("Synced to Notion")).toBeInTheDocument();
    expect(screen.getByText("Status changed")).toBeInTheDocument();
  });

  it("displays AI triage section with suggestions", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");

    // AI summary should be visible
    expect(
      screen.getByText(/Critical login button regression on Safari 17.2/)
    ).toBeInTheDocument();
    // AI suggested priority
    expect(screen.getByText(/P0 Critical/)).toBeInTheDocument();
  });

  it("shows a Notion link when notion_page_id exists", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");

    const notionLink = screen.getByRole("link", { name: /view in notion/i });
    expect(notionLink).toHaveAttribute(
      "href",
      expect.stringContaining("notion-page-abc123")
    );
  });

  it("displays source information with external link", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");

    const sourceLink = screen.getByRole("link", { name: /view original/i });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://workspace.slack.com/archives/C123/p456"
    );
  });

  it("toggles between formatted and raw data views", async () => {
    const user = userEvent.setup();
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");

    // Raw data should not be visible initially
    expect(screen.queryByText(/"browser"/)).not.toBeInTheDocument();

    // Click the raw data toggle
    const toggle = screen.getByRole("button", { name: /raw data/i });
    await user.click(toggle);

    // Now metadata JSON should be visible
    expect(screen.getByText(/"browser"/)).toBeInTheDocument();
    expect(screen.getByText(/"Safari 17.2"/)).toBeInTheDocument();
  });

  it("shows reporter info", async () => {
    render(<TicketDetailPage />);

    await screen.findByText("Login button broken on Safari");
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
  });
});
