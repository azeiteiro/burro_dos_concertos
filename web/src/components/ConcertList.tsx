import { Concert } from "@/types/concert";
import { ConcertCard } from "./ConcertCard";

interface ConcertListProps {
  concerts: Concert[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeTab: "all" | "my";
  userId?: number;
  onConcertClick: (concert: Concert) => void;
  onVote: (concertId: number, responseType: "going" | "interested" | "not_going") => Promise<void>;
}

export function ConcertList({
  concerts,
  loading,
  error,
  searchQuery,
  activeTab,
  userId,
  onConcertClick,
  onVote,
}: ConcertListProps) {
  if (loading) {
    return (
      <div className="text-center p-5">
        <p>Loading concerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg text-white mb-4"
        style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ff3b30)" }}
      >
        {error}
      </div>
    );
  }

  if (concerts.length === 0) {
    return (
      <div className="text-center p-5">
        <p style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
          {activeTab === "my"
            ? "You haven't marked any concerts as going or interested yet"
            : searchQuery
              ? "No concerts found matching your search"
              : "No upcoming concerts"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {concerts.map((concert) => (
        <ConcertCard
          key={concert.id}
          concert={concert}
          onClick={() => onConcertClick(concert)}
          onVote={(responseType) => onVote(concert.id, responseType)}
          userId={userId}
        />
      ))}
    </div>
  );
}
