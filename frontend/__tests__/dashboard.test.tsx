import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Dashboard from "../app/page";

// Mock next/link so we can test href values
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

// Mock fetch to return test tickets
const mockTickets = [
  {
    id: "abc-123",
    title: "Login button broken",
    ticket_type: "bug",
    priority: 1,
    status: "open",
    original_channel: "slack",
    reporter: { name: "Jane Doe", email: "jane@test.com" },
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "def-456",
    title: "Add dark mode",
    ticket_type: "feature_request",
    priority: 3,
    status: "in_progress",
    original_channel: "intercom",
    reporter: { name: "John Smith", email: null },
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockPaginatedResponse = {
  tickets: mockTickets,
  pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
};

const mockMetrics = {
  total: 2,
  by_channel: { slack: 1, intercom: 1, whatsapp: 0 },
  by_type: { bug: 1, feature_request: 1 },
  by_status: { open: 1, in_progress: 1 },
  by_priority: { "1": 1, "3": 1 },
  top_reporters: [],
};

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes("/api/metrics/summary")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPaginatedResponse),
    });
  }) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Dashboard — ticket list", () => {
  it("renders ticket rows as clickable links to detail page", async () => {
    render(<Dashboard />);

    // Wait for tickets to load
    const link = await screen.findByRole("link", { name: /Login button broken/i });
    expect(link).toHaveAttribute("href", "/tickets/abc-123");

    const link2 = await screen.findByRole("link", { name: /Add dark mode/i });
    expect(link2).toHaveAttribute("href", "/tickets/def-456");
  });

  it("renders filter dropdowns with correct options", async () => {
    render(<Dashboard />);

    await screen.findByRole("link", { name: /Login button broken/i });

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);

    // Channel filter
    expect(screen.getByRole("option", { name: "All channels" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Slack" })).toBeInTheDocument();

    // Status filter
    expect(screen.getByRole("option", { name: "All statuses" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Resolved" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Closed" })).toBeInTheDocument();

    // Priority filter
    expect(screen.getByRole("option", { name: "All priorities" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "P0 Critical" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "P1 High" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "P2 Medium" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "P3 Normal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "P4 Low" })).toBeInTheDocument();
  });

  it("renders stats from metrics endpoint", async () => {
    render(<Dashboard />);

    await screen.findByRole("link", { name: /Login button broken/i });

    // Stats should come from the metrics endpoint
    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // total from metrics
  });
});
