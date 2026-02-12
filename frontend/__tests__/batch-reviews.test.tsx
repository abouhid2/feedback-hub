import "@testing-library/jest-dom";
import { render, screen, act } from "@testing-library/react";
import TicketGroupsPage from "../app/ticket-groups/page";

const mockGroups = [
  {
    id: "group-1",
    name: "Login bug duplicates",
    status: "open",
    primary_ticket_id: "ticket-1",
    resolved_via_channel: null,
    resolved_at: null,
    resolution_note: null,
    ticket_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockGroupDetail = {
  ...mockGroups[0],
  tickets: [
    {
      id: "ticket-1",
      title: "Login fails on Chrome",
      ticket_type: "bug",
      priority: 1,
      status: "open",
      original_channel: "slack",
      reporter: { name: "Alice", email: "alice@test.com" },
      created_at: new Date().toISOString(),
    },
    {
      id: "ticket-2",
      title: "Login fails on Safari",
      ticket_type: "bug",
      priority: 2,
      status: "open",
      original_channel: "whatsapp",
      reporter: { name: "Bob", email: "bob@test.com" },
      created_at: new Date().toISOString(),
    },
  ],
};

let fetchCallCount = 0;

beforeEach(() => {
  jest.useFakeTimers();
  fetchCallCount = 0;
  global.fetch = jest.fn(() => {
    fetchCallCount++;
    // First call: fetchTicketGroups (list), subsequent calls: fetchTicketGroup (detail)
    if (fetchCallCount === 1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGroups),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockGroupDetail),
    });
  }) as jest.Mock;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Ticket Groups Page", () => {
  it("renders the page header", async () => {
    await act(async () => { render(<TicketGroupsPage />); });
    expect(screen.getByText("Ticket Groups")).toBeInTheDocument();
  });

  it("renders group cards with ticket details", async () => {
    await act(async () => { render(<TicketGroupsPage />); });
    expect(await screen.findByText("Login bug duplicates")).toBeInTheDocument();
    expect(screen.getByText("Login fails on Chrome")).toBeInTheDocument();
    expect(screen.getByText("Login fails on Safari")).toBeInTheDocument();
  });

  it("renders status filter buttons", async () => {
    await act(async () => { render(<TicketGroupsPage />); });
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("renders channel badges in group tickets", async () => {
    await act(async () => { render(<TicketGroupsPage />); });
    await screen.findByText("Login bug duplicates");
    expect(screen.getByText(/slack/i)).toBeInTheDocument();
    expect(screen.getByText(/whatsapp/i)).toBeInTheDocument();
  });

  it("shows empty state when no groups", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;

    await act(async () => { render(<TicketGroupsPage />); });
    expect(await screen.findByText("No ticket groups")).toBeInTheDocument();
  });

  it("renders resolve button for open groups", async () => {
    await act(async () => { render(<TicketGroupsPage />); });
    await screen.findByText("Login bug duplicates");
    expect(screen.getByRole("button", { name: /^resolve$/i })).toBeInTheDocument();
  });
});
