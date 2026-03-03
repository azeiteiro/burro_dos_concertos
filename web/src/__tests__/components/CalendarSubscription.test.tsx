import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarSubscription } from "@/components/CalendarSubscription";

describe("CalendarSubscription", () => {
  it("should render calendar subscription section", () => {
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    expect(screen.getByText("Subscribe to Calendar")).toBeInTheDocument();
    expect(screen.getByText("Get automatic updates for all your concerts")).toBeInTheDocument();
  });

  it("should render all calendar buttons", () => {
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    expect(screen.getByRole("button", { name: /apple/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /samsung/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /google calendar/i })).toBeInTheDocument();
  });

  it("should call onSubscribe with 'apple' when Apple button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    const appleButton = screen.getByRole("button", { name: /apple/i });
    await user.click(appleButton);

    expect(mockOnSubscribe).toHaveBeenCalledWith("apple");
    expect(mockOnSubscribe).toHaveBeenCalledTimes(1);
  });

  it("should call onSubscribe with 'samsung' when Samsung button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    const samsungButton = screen.getByRole("button", { name: /samsung/i });
    await user.click(samsungButton);

    expect(mockOnSubscribe).toHaveBeenCalledWith("samsung");
    expect(mockOnSubscribe).toHaveBeenCalledTimes(1);
  });

  it("should call onSubscribe with 'google' when Google button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    const googleButton = screen.getByRole("button", { name: /google calendar/i });
    await user.click(googleButton);

    expect(mockOnSubscribe).toHaveBeenCalledWith("google");
    expect(mockOnSubscribe).toHaveBeenCalledTimes(1);
  });

  it("should display icons for all calendar types", () => {
    const mockOnSubscribe = vi.fn();

    render(<CalendarSubscription onSubscribe={mockOnSubscribe} />);

    // Check that buttons contain SVG icons (from react-icons)
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
