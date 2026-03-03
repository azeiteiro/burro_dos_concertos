import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarSubscription } from "@/components/CalendarSubscription";

describe("CalendarSubscription", () => {
  it("should render calendar subscription section", () => {
    render(<CalendarSubscription userId={1} />);

    expect(screen.getByText("Subscribe to Calendar")).toBeInTheDocument();
    expect(screen.getByText("Get automatic updates for all your concerts")).toBeInTheDocument();
  });

  it("should render all calendar links", () => {
    render(<CalendarSubscription userId={1} />);

    expect(screen.getByRole("link", { name: /apple/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /samsung/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /google calendar/i })).toBeInTheDocument();
  });

  it("should have https:// URL for Apple Calendar link", () => {
    render(<CalendarSubscription userId={1} />);

    const appleLink = screen.getByRole("link", { name: /apple/i });
    expect(appleLink).toHaveAttribute("href", expect.stringMatching(/^https?:\/\//));
    expect(appleLink).toHaveAttribute("href", expect.stringContaining("/api/users/1/calendar.ics"));
  });

  it("should have webcal:// URL for Samsung Calendar link", () => {
    render(<CalendarSubscription userId={1} />);

    const samsungLink = screen.getByRole("link", { name: /samsung/i });
    expect(samsungLink).toHaveAttribute("href", expect.stringContaining("webcal://"));
    expect(samsungLink).toHaveAttribute(
      "href",
      expect.stringContaining("/api/users/1/calendar.ics")
    );
  });

  it("should have Google Calendar URL with calendar ID parameter", () => {
    render(<CalendarSubscription userId={1} />);

    const googleLink = screen.getByRole("link", { name: /google calendar/i });
    expect(googleLink).toHaveAttribute("href", expect.stringContaining("calendar.google.com"));
    expect(googleLink).toHaveAttribute("href", expect.stringContaining("cid="));
    expect(googleLink).toHaveAttribute("target", "_blank");
    expect(googleLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should display icons for all calendar types", () => {
    render(<CalendarSubscription userId={1} />);

    // Check that links contain SVG icons (from react-icons)
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      const svg = link.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
