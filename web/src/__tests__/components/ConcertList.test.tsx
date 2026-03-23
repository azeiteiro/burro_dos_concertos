import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/setup";
import userEvent from "@testing-library/user-event";
import { ConcertList } from "@/components/ConcertList";
import { Concert } from "@/types/concert";

const mockConcerts: Concert[] = [
  {
    id: 1,
    artistName: "Artist 1",
    venue: "Venue 1",
    concertDate: new Date("2026-04-14"),
    concertTime: null,
    notes: null,
    url: null,
    userId: 1,
    notified: false,
    createdAt: new Date("2026-01-01T00:00:00"),
    updatedAt: new Date("2026-01-01T00:00:00"),
    responses: { going: 1, interested: 0, not_going: 0, userResponse: null },
  },
  {
    id: 2,
    artistName: "Artist 2",
    venue: "Venue 2",
    concertDate: new Date("2026-04-15"),
    concertTime: null,
    notes: null,
    url: null,
    userId: 1,
    notified: false,
    createdAt: new Date("2026-01-01T00:00:00"),
    updatedAt: new Date("2026-01-01T00:00:00"),
    responses: { going: 0, interested: 1, not_going: 0, userResponse: null },
  },
];

describe("ConcertList", () => {
  const defaultProps = {
    concerts: mockConcerts,
    loading: false,
    error: null,
    searchQuery: "",
    activeTab: "all" as const,
    userId: 123,
    onConcertClick: vi.fn(),
    onVote: vi.fn(),
  };

  it("should render loading state", () => {
    render(<ConcertList {...defaultProps} loading={true} />);

    expect(screen.getByText("Loading concerts...")).toBeInTheDocument();
  });

  it("should render error state", () => {
    render(<ConcertList {...defaultProps} error="Failed to load" />);

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("should render empty state for all tab", () => {
    render(<ConcertList {...defaultProps} concerts={[]} />);

    expect(screen.getByText("No upcoming concerts")).toBeInTheDocument();
  });

  it("should render empty state for my tab", () => {
    render(<ConcertList {...defaultProps} concerts={[]} activeTab="my" />);

    expect(
      screen.getByText("You haven't marked any concerts as going or interested yet")
    ).toBeInTheDocument();
  });

  it("should render empty state with search query", () => {
    render(<ConcertList {...defaultProps} concerts={[]} searchQuery="test" />);

    expect(screen.getByText("No concerts found matching your search")).toBeInTheDocument();
  });

  it("should render list of concerts", () => {
    render(<ConcertList {...defaultProps} />);

    expect(screen.getByText("Artist 1")).toBeInTheDocument();
    expect(screen.getByText("Artist 2")).toBeInTheDocument();
  });

  it("should call onConcertClick when concert card is clicked", async () => {
    const user = userEvent.setup();
    const mockOnConcertClick = vi.fn();

    render(<ConcertList {...defaultProps} onConcertClick={mockOnConcertClick} />);

    const concertCard = screen.getByText("Artist 1").closest("div");
    await user.click(concertCard!);

    expect(mockOnConcertClick).toHaveBeenCalledWith(mockConcerts[0]);
  });

  it("should call onVote with correct parameters", async () => {
    const user = userEvent.setup();
    const mockOnVote = vi.fn().mockResolvedValue(undefined);

    render(<ConcertList {...defaultProps} onVote={mockOnVote} />);

    const goingButton = screen.getAllByRole("button", { name: /going/i })[0];
    await user.click(goingButton);

    expect(mockOnVote).toHaveBeenCalledWith(1, "going");
  });

  it("should render correct number of concert cards", () => {
    render(<ConcertList {...defaultProps} />);

    const concerts = screen.getAllByText(/Artist \d/);
    expect(concerts).toHaveLength(2);
  });
});
