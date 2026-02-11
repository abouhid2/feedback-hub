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

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockTickets),
    })
  ) as jest.Mock;
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

  it("renders status filter buttons", async () => {
    render(<Dashboard />);

    await screen.findByRole("link", { name: /Login button broken/i });

    expect(screen.getByRole("button", { name: "All statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolved" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Closed" })).toBeInTheDocument();
  });

  it("renders priority filter buttons", async () => {
    render(<Dashboard />);

    await screen.findByRole("link", { name: /Login button broken/i });

    expect(screen.getByRole("button", { name: "All priorities" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P0 Critical" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P1 High" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P2 Medium" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P3 Normal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P4 Low" })).toBeInTheDocument();
  });
});
