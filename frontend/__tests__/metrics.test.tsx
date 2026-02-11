import "@testing-library/jest-dom";
import { render, screen, fireEvent, act } from "@testing-library/react";
import MetricsPage from "../app/metrics/page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock recharts — SVG components don't render in jsdom
jest.mock("recharts", () => {
  const OriginalModule = jest.requireActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Pie: () => <div data-testid="pie" />,
    Bar: () => <div data-testid="bar" />,
    Cell: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
  };
});

const mockMetrics = {
  total: 25,
  by_channel: { slack: 15, intercom: 7, whatsapp: 3 },
  by_type: { bug: 10, feature_request: 8, question: 5, incident: 2 },
  by_status: { open: 12, in_progress: 5, resolved: 6, closed: 2 },
  by_priority: { 0: 3, 1: 5, 2: 8, 3: 6, 4: 2, 5: 1 },
  top_reporters: [
    { name: "Alice", ticket_count: 8 },
    { name: "Bob", ticket_count: 5 },
    { name: "Charlie", ticket_count: 3 },
  ],
};

beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockMetrics),
    })
  ) as jest.Mock;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Metrics Page", () => {
  it("renders the page header", async () => {
    await act(async () => { render(<MetricsPage />); });
    expect(screen.getByText("Metrics Dashboard")).toBeInTheDocument();
  });

  it("renders summary stat cards", async () => {
    await act(async () => { render(<MetricsPage />); });
    await screen.findByText("25"); // total
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument(); // open count
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders period filter buttons", async () => {
    await act(async () => { render(<MetricsPage />); });
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText("30d")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("toggles period filter and refetches", async () => {
    await act(async () => { render(<MetricsPage />); });
    await screen.findByText("25");

    await act(async () => {
      fireEvent.click(screen.getByText("7d"));
    });

    const calls = (global.fetch as jest.Mock).mock.calls;
    const lastCallUrl = calls[calls.length - 1][0];
    expect(lastCallUrl).toContain("period=7d");
  });

  it("does not pass period param for 'All'", async () => {
    await act(async () => { render(<MetricsPage />); });
    await screen.findByText("25");

    // "All" is the default — first call should not have period param
    const firstCallUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(firstCallUrl).not.toContain("period=");
  });

  it("renders top reporters table", async () => {
    await act(async () => { render(<MetricsPage />); });
    await screen.findByText("Top Reporters");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("renders chart containers", async () => {
    await act(async () => { render(<MetricsPage />); });
    await screen.findByText("25");
    expect(screen.getByText("By Channel")).toBeInTheDocument();
    expect(screen.getByText("By Type")).toBeInTheDocument();
    expect(screen.getByText("By Priority")).toBeInTheDocument();
    expect(screen.getByText("By Status")).toBeInTheDocument();
  });

  it("handles empty metrics data", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            total: 0,
            by_channel: {},
            by_type: {},
            by_status: {},
            by_priority: {},
            top_reporters: [],
          }),
      })
    ) as jest.Mock;

    await act(async () => { render(<MetricsPage />); });
    expect(await screen.findByText("No reporters yet")).toBeInTheDocument();
    expect(screen.getAllByText("No data").length).toBe(4); // 4 empty chart sections
  });
});
