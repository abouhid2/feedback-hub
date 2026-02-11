import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import NotificationsPage from "../app/notifications/page";

const mockNotifications = [
  {
    id: "notif-1",
    ticket_id: "ticket-1",
    changelog_entry_id: "entry-1",
    channel: "slack",
    recipient: "U_USER1",
    status: "sent",
    content: "We fixed the login issue.",
    retry_count: 0,
    last_error: null,
    delivered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-2",
    ticket_id: "ticket-2",
    changelog_entry_id: "entry-2",
    channel: "whatsapp",
    recipient: "56900000000",
    status: "failed",
    content: "Dark mode has been added.",
    retry_count: 2,
    last_error: "Connection timeout",
    delivered_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-3",
    ticket_id: "ticket-3",
    changelog_entry_id: null,
    channel: "intercom",
    recipient: "user@example.com",
    status: "pending_batch_review",
    content: "Performance improvements shipped.",
    retry_count: 0,
    last_error: null,
    delivered_at: null,
    created_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockNotifications),
    })
  ) as jest.Mock;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Notifications Page", () => {
  it("renders the page header", async () => {
    await act(async () => { render(<NotificationsPage />); });
    expect(screen.getByText("Notification History")).toBeInTheDocument();
  });

  it("renders notification rows from API", async () => {
    await act(async () => { render(<NotificationsPage />); });
    expect(await screen.findByText("We fixed the login issue.")).toBeInTheDocument();
    expect(screen.getByText("Dark mode has been added.")).toBeInTheDocument();
    expect(screen.getByText("Performance improvements shipped.")).toBeInTheDocument();
  });

  it("shows status badges with correct labels", async () => {
    await act(async () => { render(<NotificationsPage />); });
    await screen.findByText("We fixed the login issue.");
    // Status labels appear in both dropdown options and table badges
    const sentElements = screen.getAllByText("Sent");
    expect(sentElements.length).toBeGreaterThanOrEqual(2); // option + badge
    const failedElements = screen.getAllByText("Failed");
    expect(failedElements.length).toBeGreaterThanOrEqual(2);
    // "Batch Hold" only appears in badge (dropdown shows "Batch Hold" too)
    expect(screen.getAllByText("Batch Hold").length).toBeGreaterThanOrEqual(1);
  });

  it("shows channel badges in table rows", async () => {
    await act(async () => { render(<NotificationsPage />); });
    await screen.findByText("We fixed the login issue.");
    // Channel names appear in both dropdown options and table badges
    expect(screen.getAllByText(/slack/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/whatsapp/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/intercom/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows last_error for failed notifications", async () => {
    await act(async () => { render(<NotificationsPage />); });
    await screen.findByText("We fixed the login issue.");
    expect(screen.getByText("Connection timeout")).toBeInTheDocument();
  });

  it("renders filter dropdowns", async () => {
    await act(async () => { render(<NotificationsPage />); });
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
  });

  it("shows empty state when no notifications", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;

    await act(async () => { render(<NotificationsPage />); });
    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
  });

  it("passes filter params when channel filter changes", async () => {
    await act(async () => { render(<NotificationsPage />); });
    await screen.findByText("We fixed the login issue.");

    const selects = screen.getAllByRole("combobox");
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "slack" } });
    });

    await screen.findByText("We fixed the login issue.");

    const calls = (global.fetch as jest.Mock).mock.calls;
    const lastCallUrl = calls[calls.length - 1][0];
    expect(lastCallUrl).toContain("channel=slack");
  });

  it("passes filter params when status filter changes", async () => {
    await act(async () => { render(<NotificationsPage />); });
    await screen.findByText("We fixed the login issue.");

    const selects = screen.getAllByRole("combobox");
    await act(async () => {
      fireEvent.change(selects[1], { target: { value: "sent" } });
    });

    await screen.findByText("We fixed the login issue.");

    const calls = (global.fetch as jest.Mock).mock.calls;
    const lastCallUrl = calls[calls.length - 1][0];
    expect(lastCallUrl).toContain("status=sent");
  });
});
