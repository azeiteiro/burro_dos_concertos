import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/setup";
import { CalendarSubscription } from "@/components/CalendarSubscription";

const mockWebApp = {
  openLink: vi.fn(),
  showPopup: vi.fn(),
} as any;

describe("CalendarSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render calendar subscription section", () => {
    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    // expect(screen.getByText("📅 Calendar Subscription")).toBeInTheDocument();
    expect(screen.getByText(/Sync Calendar/i)).toBeInTheDocument();
  });

  it("should render all calendar buttons", () => {
    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    expect(screen.getByRole("button", { name: /apple/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /samsung/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
  });

  it("should call openLink for Apple Calendar button", () => {
    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    const appleButton = screen.getByRole("button", { name: /apple/i });
    fireEvent.click(appleButton);

    expect(mockWebApp.openLink).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1/calendar.ics")
    );
  });

  it("should call openLink for Samsung Calendar button", () => {
    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    const samsungButton = screen.getByRole("button", { name: /samsung/i });
    fireEvent.click(samsungButton);

    expect(mockWebApp.openLink).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1/calendar.ics")
    );
  });

  it("should handle Google Calendar button click", () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    const googleButton = screen.getByRole("button", { name: /google/i });
    fireEvent.click(googleButton);

    // Should attempt to copy to clipboard
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1/calendar.ics")
    );
  });

  it("should display icons for all calendar types", () => {
    render(<CalendarSubscription userId={1} webApp={mockWebApp} />);

    // Check that buttons contain SVG icons (from react-icons)
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
