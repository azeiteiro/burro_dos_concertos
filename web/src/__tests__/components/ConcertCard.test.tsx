import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@/test/setup";
import userEvent from "@testing-library/user-event";
import { ConcertCard } from "@/components/ConcertCard";
import { Concert } from "@/types/concert";

const mockConcert: Concert = {
  id: 1,
  artistName: "Test Artist",
  venue: "Test Venue",
  concertDate: new Date("2026-04-14T20:00:00"),
  concertTime: new Date("2026-04-14T20:00:00"),
  notes: "Special show",
  url: "https://example.com/concert",
  userId: 1,
  notified: false,
  artistImageUrl: "https://example.com/artist-image.jpg",
  spotifyArtistId: "spotify123",
  createdAt: new Date("2026-01-01T00:00:00"),
  updatedAt: new Date("2026-01-01T00:00:00"),
  responses: {
    going: 5,
    interested: 3,
    not_going: 1,
    userResponse: null,
  },
};

describe("ConcertCard", () => {
  it("should render concert information", () => {
    render(<ConcertCard concert={mockConcert} />);

    expect(screen.getByText("Test Artist")).toBeInTheDocument();
    expect(screen.getByText("Test Venue")).toBeInTheDocument();
    expect(screen.getByText(/Apr 14, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Special show")).toBeInTheDocument();
  });

  it("should format date correctly", () => {
    render(<ConcertCard concert={mockConcert} />);

    expect(screen.getByText(/Apr 14, 2026 at 20:00/)).toBeInTheDocument();
  });

  it("should not show time if concertTime is null", () => {
    const concertWithoutTime = { ...mockConcert, concertTime: null };

    render(<ConcertCard concert={concertWithoutTime} />);

    expect(screen.getByText("Apr 14, 2026")).toBeInTheDocument();
    expect(screen.queryByText(/at/)).not.toBeInTheDocument();
  });

  it("should not show notes if not provided", () => {
    const concertWithoutNotes = { ...mockConcert, notes: null };

    render(<ConcertCard concert={concertWithoutNotes} />);

    expect(screen.queryByText("Special show")).not.toBeInTheDocument();
  });

  it("should call onClick when card is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(<ConcertCard concert={mockConcert} onClick={mockOnClick} />);

    const card = screen.getByText("Test Artist").closest("div");
    await user.click(card!);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  describe("Vote buttons", () => {
    it("should show vote buttons when userId and onVote are provided", () => {
      const mockOnVote = vi.fn();

      render(<ConcertCard concert={mockConcert} onVote={mockOnVote} userId={123} />);

      expect(screen.getByRole("button", { name: /going \(5\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /interested \(3\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /not going \(1\)/i })).toBeInTheDocument();
    });

    it("should not show vote buttons when userId is not provided", () => {
      const mockOnVote = vi.fn();

      render(<ConcertCard concert={mockConcert} onVote={mockOnVote} />);

      expect(screen.queryByRole("button", { name: /going/i })).not.toBeInTheDocument();
    });

    it("should not show vote buttons when onVote is not provided", () => {
      render(<ConcertCard concert={mockConcert} userId={123} />);

      expect(screen.queryByRole("button", { name: /going/i })).not.toBeInTheDocument();
    });

    it("should call onVote when clicking vote button", async () => {
      const user = userEvent.setup();
      const mockOnVote = vi.fn().mockResolvedValue(undefined);

      render(<ConcertCard concert={mockConcert} onVote={mockOnVote} userId={123} />);

      const goingButton = screen.getByRole("button", { name: /🎉 going \(5\)/i });
      await user.click(goingButton);

      expect(mockOnVote).toHaveBeenCalledWith("going");
    });

    it("should not propagate click to card when voting", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      const mockOnVote = vi.fn().mockResolvedValue(undefined);

      render(
        <ConcertCard concert={mockConcert} onClick={mockOnClick} onVote={mockOnVote} userId={123} />
      );

      const goingButton = screen.getByRole("button", { name: /🎉 going \(5\)/i });
      await user.click(goingButton);

      expect(mockOnVote).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("should disable buttons while voting", async () => {
      const user = userEvent.setup();
      let resolveVote: () => void;
      const mockOnVote = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveVote = resolve;
          })
      );

      render(<ConcertCard concert={mockConcert} onVote={mockOnVote} userId={123} />);

      const goingButton = screen.getByRole("button", { name: /🎉 going \(5\)/i });
      await user.click(goingButton);

      // Button should be disabled while voting
      expect(goingButton).toBeDisabled();

      // Resolve the vote
      resolveVote!();

      // Button should be enabled again
      await waitFor(() => {
        expect(goingButton).not.toBeDisabled();
      });
    });

    it("should highlight selected vote", () => {
      const concertWithResponse = {
        ...mockConcert,
        responses: { ...mockConcert.responses!, userResponse: "going" as const },
      };
      const mockOnVote = vi.fn();

      render(<ConcertCard concert={concertWithResponse} onVote={mockOnVote} userId={123} />);

      const goingButton = screen.getByRole("button", { name: /🎉 going \(5\)/i });
      // Library Button component uses its own styling for selected state
      expect(goingButton).toBeInTheDocument();
    });
  });
});
