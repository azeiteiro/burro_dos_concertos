import { Concert } from "@/types/concert";
import { ConcertCard } from "./ConcertCard";
import { List } from "@telegram-apps/telegram-ui";

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
    return <div className="text-center py-8">Loading concerts...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  const filteredConcerts = concerts.filter((concert) => {
    const matchesSearch =
      concert.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      concert.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" || (activeTab === "my" && concert.responses?.userResponse);

    return matchesSearch && matchesTab;
  });

  if (filteredConcerts.length === 0) {
    return (
      <div className="text-center py-8">
        {searchQuery ? "No concerts match your search" : "No concerts found"}
      </div>
    );
  }

  return (
    <List>
      {filteredConcerts.map((concert) => (
        <ConcertCard
          key={concert.id}
          concert={concert}
          onClick={() => onConcertClick(concert)}
          onVote={(responseType) => onVote(concert.id, responseType)}
          userId={userId}
        />
      ))}
    </List>
  );
}
