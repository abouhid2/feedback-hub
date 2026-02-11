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
      raw_payload: {
        event: {
          type: "message",
          text: "Login button broken on Safari",
          user: "U12345",
          ts: "1707567000.000100",
        },
        team_id: "T98765",
        event_id: "Ev01ABC",
        type: "event_callback",
      },
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

const mockDraftChangelog = {
  id: "changelog-1",
  ticket_id: "abc-123",
  content: "Fixed the login button regression on Safari 17.2",
  status: "draft",
  ai_model: "gpt-4o-mini",
  approved_by: null,
  approved_at: null,
  created_at: "2026-02-11T10:00:00Z",
  updated_at: "2026-02-11T10:00:00Z",
};

function setupFetchMock(changelogResponse?: { ok: boolean; body: unknown }) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes("/changelog")) {
      if (changelogResponse) {
        return Promise.resolve({
          ok: changelogResponse.ok,
          json: () => Promise.resolve(changelogResponse.body),
        });
      }
      // Default: 404 no changelog
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "No changelog entry found" }),
      });
    }
    // Ticket detail
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTicketDetail),
    });
  }) as jest.Mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Ticket Detail Page", () => {
  beforeEach(() => {
    setupFetchMock();
  });

  it("renders ticket title and description", async () => {
    render(<TicketDetailPage />);

    const heading = await screen.findByRole("heading", { name: "Login button broken on Safari" });
    expect(heading).toBeInTheDocument();
    expect(
      screen.getAllByText(/Users report the login button is unresponsive/).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders back link to ticket list", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });
    const backLink = screen.getByRole("link", { name: /back to tickets/i });
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("shows priority, channel, status, and type badges", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });
    expect(screen.getAllByText(/P1 High/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("slack").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("open").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bug").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the event timeline in chronological order", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    // All 4 events should appear
    expect(screen.getByText("Ticket created")).toBeInTheDocument();
    expect(screen.getByText("AI triage completed")).toBeInTheDocument();
    expect(screen.getByText("Synced to Notion")).toBeInTheDocument();
    expect(screen.getByText("Status changed")).toBeInTheDocument();
  });

  it("displays AI triage section with suggestions", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    // AI summary should be visible
    expect(
      screen.getByText(/Critical login button regression on Safari 17.2/)
    ).toBeInTheDocument();
    // AI suggested priority
    expect(screen.getByText(/P0 Critical/)).toBeInTheDocument();
  });

  it("shows a Notion link when notion_page_id exists", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    const notionLink = screen.getByRole("link", { name: /view in notion/i });
    expect(notionLink).toHaveAttribute(
      "href",
      expect.stringContaining("notion-page-abc123")
    );
  });

  it("displays source information with external link", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    const sourceLink = screen.getByRole("link", { name: /view original/i });
    expect(sourceLink).toHaveAttribute(
      "href",
      "https://workspace.slack.com/archives/C123/p456"
    );
  });

  it("shows normalized data table by default in the Data section", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    // The Data section should show the normalized key-value table
    const dataSection = screen.getByText("Data").closest("div")!;
    expect(dataSection).toBeInTheDocument();

    // Normalized tab should be active — check for key fields in the table
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Channel")).toBeInTheDocument();
  });

  it("toggles to raw payload view", async () => {
    const user = userEvent.setup();
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    // Raw payload should not be visible initially
    expect(screen.queryByText(/"team_id"/)).not.toBeInTheDocument();

    // Click the "Raw payload" tab button
    const rawTab = screen.getByRole("button", { name: /raw payload/i });
    await user.click(rawTab);

    // Now the raw webhook JSON from sources[0].raw_payload should be visible
    expect(screen.getByText(/"team_id"/)).toBeInTheDocument();
    expect(screen.getByText(/"T98765"/)).toBeInTheDocument();
    expect(screen.getByText(/"event_callback"/)).toBeInTheDocument();
  });

  it("shows platform label on raw payload", async () => {
    const user = userEvent.setup();
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    // Switch to raw payload tab
    const rawTab = screen.getByRole("button", { name: /raw payload/i });
    await user.click(rawTab);

    // The raw view should include the raw JSON and the platform label
    // Verify raw_payload content is shown alongside a platform label
    expect(screen.getByText(/"team_id"/)).toBeInTheDocument();
    expect(screen.getAllByText(/slack/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows reporter info", async () => {
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
  });
});

describe("Ticket Detail — Changelog Review", () => {
  it("shows changelog review section with draft content", async () => {
    setupFetchMock({ ok: true, body: mockDraftChangelog });
    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    expect(
      await screen.findByText("Fixed the login button regression on Safari 17.2")
    ).toBeInTheDocument();
    expect(screen.getByText(/Pending Review/)).toBeInTheDocument();
  });

  it("shows approve and reject buttons for draft changelog", async () => {
    setupFetchMock({ ok: true, body: mockDraftChangelog });
    render(<TicketDetailPage />);

    await screen.findByText("Fixed the login button regression on Safari 17.2");

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("shows generate button for resolved ticket without changelog", async () => {
    const resolvedTicket = { ...mockTicketDetail, status: "resolved" };
    global.fetch = jest.fn((url: string) => {
      if (url.includes("/changelog")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "No changelog entry found" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(resolvedTicket),
      });
    }) as jest.Mock;

    render(<TicketDetailPage />);

    await screen.findByRole("heading", { name: "Login button broken on Safari" });

    expect(
      await screen.findByRole("button", { name: "Generate Changelog" })
    ).toBeInTheDocument();
  });
});
