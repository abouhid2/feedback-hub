import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import BatchReviewsPage from "../app/batch-reviews/page";

const mockNotifications = [
  {
    id: "notif-1",
    ticket_id: "ticket-1",
    changelog_entry_id: "entry-1",
    channel: "slack",
    recipient: "U_USER1",
    status: "pending_batch_review",
    content: "We fixed the login issue.",
    created_at: new Date().toISOString(),
  },
  {
    id: "notif-2",
    ticket_id: "ticket-2",
    changelog_entry_id: "entry-2",
    channel: "whatsapp",
    recipient: "56900000000",
    status: "pending_batch_review",
    content: "Dark mode has been added.",
    created_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockNotifications),
    })
  ) as jest.Mock;

  window.confirm = jest.fn(() => true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Batch Reviews Page", () => {
  it("renders the page header", async () => {
    render(<BatchReviewsPage />);
    expect(screen.getByText("Batch Review")).toBeInTheDocument();
  });

  it("renders pending notifications in a table", async () => {
    render(<BatchReviewsPage />);
    expect(await screen.findByText("We fixed the login issue.")).toBeInTheDocument();
    expect(screen.getByText("Dark mode has been added.")).toBeInTheDocument();
  });

  it("renders channel badges", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");
    expect(screen.getByText(/slack/i)).toBeInTheDocument();
    expect(screen.getByText(/whatsapp/i)).toBeInTheDocument();
  });

  it("renders action buttons", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");
    expect(screen.getByRole("button", { name: /approve all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve selected/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject all/i })).toBeInTheDocument();
  });

  it("renders checkboxes for selection", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");
    const checkboxes = screen.getAllByRole("checkbox");
    // 1 header checkbox + 2 row checkboxes
    expect(checkboxes).toHaveLength(3);
  });

  it("updates selected count when checkboxes are toggled", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");

    expect(screen.getByText("0 of 2 selected")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // first row
    expect(screen.getByText("1 of 2 selected")).toBeInTheDocument();

    fireEvent.click(checkboxes[2]); // second row
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
  });

  it("select all checkbox toggles all rows", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // header checkbox = select all
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();

    fireEvent.click(checkboxes[0]); // deselect all
    expect(screen.getByText("0 of 2 selected")).toBeInTheDocument();
  });

  it("renders warning banner about mass-resolution", async () => {
    render(<BatchReviewsPage />);
    await screen.findByText("We fixed the login issue.");
    expect(screen.getByText(/held for batch review/i)).toBeInTheDocument();
    expect(screen.getByText(/mass-resolution/i)).toBeInTheDocument();
  });

  it("shows empty state when no pending reviews", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;

    render(<BatchReviewsPage />);
    expect(await screen.findByText("No pending batch reviews")).toBeInTheDocument();
  });
});
