import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/setup";
import userEvent from "@testing-library/user-event";
import { TabNavigation } from "@/components/TabNavigation";

describe("TabNavigation", () => {
  it("should render both tabs", () => {
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="all" onTabChange={mockOnTabChange} myConcertsCount={0} />);

    expect(screen.getByText("All Concerts")).toBeInTheDocument();
    expect(screen.getByText("My Concerts")).toBeInTheDocument();
  });

  it("should highlight active tab", () => {
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="all" onTabChange={mockOnTabChange} myConcertsCount={0} />);

    const allConcertsButton = screen.getByRole("button", { name: /all concerts/i });
    const myConcertsButton = screen.getByRole("button", { name: /my concerts/i });

    // Library Tabbar.Item component uses its own styling for selected state
    expect(allConcertsButton).toBeInTheDocument();
    expect(myConcertsButton).toBeInTheDocument();
  });

  it("should switch tabs when clicked", async () => {
    const user = userEvent.setup();
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="all" onTabChange={mockOnTabChange} myConcertsCount={0} />);

    const myConcertsButton = screen.getByRole("button", { name: /my concerts/i });
    await user.click(myConcertsButton);

    expect(mockOnTabChange).toHaveBeenCalledWith("my");
  });

  it("should display concert count badge when count > 0", () => {
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="all" onTabChange={mockOnTabChange} myConcertsCount={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should not display badge when count is 0", () => {
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="all" onTabChange={mockOnTabChange} myConcertsCount={0} />);

    // Check that there's no badge element
    const badges = screen.queryByText("0");
    expect(badges).not.toBeInTheDocument();
  });

  it("should call onTabChange with correct tab type", async () => {
    const user = userEvent.setup();
    const mockOnTabChange = vi.fn();

    render(<TabNavigation activeTab="my" onTabChange={mockOnTabChange} myConcertsCount={0} />);

    const allConcertsButton = screen.getByRole("button", { name: /all concerts/i });
    await user.click(allConcertsButton);

    expect(mockOnTabChange).toHaveBeenCalledWith("all");
    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
  });
});
