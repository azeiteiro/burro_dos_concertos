import { Concert } from "@/types/concert";
import { ConcertCard } from "./ConcertCard";
import { Accordion, List } from "@telegram-apps/telegram-ui";
import { format } from "date-fns";
import { useState } from "react";

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
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
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

  // Group concerts by month
  const concertsByMonth = filteredConcerts.reduce(
    (acc, concert) => {
      const monthKey = format(new Date(concert.concertDate), "MMMM yyyy");
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(concert);
      return acc;
    },
    {} as Record<string, Concert[]>
  );

  // Initialize all months as expanded on first render
  const monthKeys = Object.keys(concertsByMonth);
  if (monthKeys.length > 0 && Object.keys(expandedMonths).length === 0) {
    const initialExpanded = monthKeys.reduce(
      (acc, month) => {
        acc[month] = true;
        return acc;
      },
      {} as Record<string, boolean>
    );
    setExpandedMonths(initialExpanded);
  }

  const handleMonthToggle = (month: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  return (
    <div>
      {Object.entries(concertsByMonth).map(([month, monthConcerts]) => (
        <Accordion
          key={month}
          expanded={expandedMonths[month] ?? true}
          onChange={() => handleMonthToggle(month)}
        >
          <Accordion.Summary>{month}</Accordion.Summary>
          <Accordion.Content>
            <List>
              {monthConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onClick={() => onConcertClick(concert)}
                  onVote={(responseType) => onVote(concert.id, responseType)}
                  userId={userId}
                />
              ))}
            </List>
          </Accordion.Content>
        </Accordion>
      ))}
    </div>
  );
}
