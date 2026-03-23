import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/setup";
import userEvent from "@testing-library/user-event";
import { ConcertDetail } from "@/components/ConcertDetail";
import { Concert } from "@/types/concert";

const mockConcert: Concert = {
  id: 1,
  artistName: "Test Artist",
  venue: "Test Venue",
  concertDate: new Date("2026-04-14T20:00:00"),
  concertTime: new Date("2026-04-14T20:00:00"),
  notes: "Special concert",
  url: "https://example.com/concert",
  userId: 1,
  notified: false,
  createdAt: new Date("2026-01-01T00:00:00"),
  updatedAt: new Date("2026-01-01T00:00:00"),
  responses: { going: 2, interested: 1, not_going: 1, userResponse: null },
};

const mockAttendance = {
  concertId: 1,
  going: {
    count: 2,
    users: [
      { id: 1, telegramId: "123", username: "user1", firstName: "John" },
      { id: 2, telegramId: "456", username: null, firstName: "Jane" },
    ],
  },
  interested: {
    count: 1,
    users: [{ id: 3, telegramId: "789", username: "user3", firstName: "Bob" }],
  },
  not_going: {
    count: 0,
    users: [],
  },
};

global.fetch = vi.fn();

describe("ConcertDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAttendance,
    } as Response);
  });

  it("should render concert information", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    expect(screen.getByText("Concert Details")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByText(/April 14, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Special concert")).toBeInTheDocument();
  });

  it("should render event page link when url is provided", () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    const link = screen.getByRole("link", { name: /view event page/i });
    expect(link).toHaveAttribute("href", "https://example.com/concert");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should not render event link when url is not provided", () => {
    const concertWithoutUrl = { ...mockConcert, url: null };

    render(<ConcertDetail concert={concertWithoutUrl} onClose={vi.fn()} />);

    expect(screen.queryByRole("link", { name: /view event page/i })).not.toBeInTheDocument();
  });

  it("should fetch and display attendance data", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("@user1")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("@user3")).toBeInTheDocument();
  });

  it("should show loading state while fetching attendance", () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show error state if attendance fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Failed" }),
    } as Response);

    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch attendance")).toBeInTheDocument();
    });
  });

  it("should display empty state when no users in category", async () => {
    const emptyAttendance = {
      ...mockAttendance,
      not_going: { count: 0, users: [] },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => emptyAttendance,
    } as Response);

    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      const noOneYetElements = screen.getAllByText("No one yet");
      expect(noOneYetElements.length).toBeGreaterThan(0);
    });
  });

  it("should format username with @ when username exists", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("@user1")).toBeInTheDocument();
    });
  });

  it("should use firstName when username does not exist", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Jane")).toBeInTheDocument();
    });
  });

  it("should call onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ConcertDetail concert={mockConcert} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: "×" });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    const { container } = render(<ConcertDetail concert={mockConcert} onClose={mockOnClose} />);

    // Click the backdrop (outermost div with backdrop styling)
    const backdrop = container.querySelector(".fixed.inset-0");
    if (backdrop) {
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it("should not call onClose when modal content is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();

    render(<ConcertDetail concert={mockConcert} onClose={mockOnClose} />);

    const modalContent = screen.getByText("Test Artist");
    await user.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should fetch attendance with correct API URL", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts/1/responses");
    });
  });

  it("should display attendance counts", async () => {
    render(<ConcertDetail concert={mockConcert} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Going (2)")).toBeInTheDocument();
    });

    expect(screen.getByText("Interested (1)")).toBeInTheDocument();
    expect(screen.getByText("Not Going (0)")).toBeInTheDocument();
  });
});
