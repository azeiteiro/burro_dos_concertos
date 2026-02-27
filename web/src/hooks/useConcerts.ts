import { useState, useEffect } from "react";
import { Concert } from "@/types/concert";
import { fetchUpcomingConcerts, getUserByTelegramId, submitConcertResponse } from "@/lib/api";

export type TabType = "all" | "my";

interface UseConcertsProps {
  isReady: boolean;
  telegramUser?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
}

export function useConcerts({ isReady, telegramUser }: UseConcertsProps) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load user and concerts
  const loadUserAndConcerts = async () => {
    if (!isReady) return;

    try {
      setLoading(true);

      // For local development: use mock user ID from env variable
      const mockUserId = import.meta.env.VITE_MOCK_USER_ID;

      let internalUserId: number | undefined;

      if (telegramUser) {
        // Production: Get internal user ID from Telegram ID
        const userData = await getUserByTelegramId(telegramUser.id);
        internalUserId = userData.id;
      } else if (mockUserId) {
        // Local development with mock user
        internalUserId = parseInt(mockUserId);
      }

      setUserId(internalUserId);

      // Fetch concerts (with or without user responses)
      const data = await fetchUpcomingConcerts(internalUserId);
      setConcerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load concerts");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadUserAndConcerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, telegramUser]);

  // Refetch when app becomes visible (Telegram Mini App lifecycle)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userId) {
        // Refetch concerts when user returns to the app
        fetchUpcomingConcerts(userId).then(setConcerts);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userId]);

  // Filter concerts based on active tab and search query
  const filteredConcerts = concerts.filter((concert) => {
    // Tab filter
    if (activeTab === "my") {
      const userResponse = concert.responses?.userResponse;
      if (!userResponse || userResponse === "not_going") {
        return false;
      }
    }

    // Search filter
    const query = searchQuery.toLowerCase();
    return (
      concert.artistName.toLowerCase().includes(query) ||
      concert.venue.toLowerCase().includes(query) ||
      (concert.notes && concert.notes.toLowerCase().includes(query))
    );
  });

  // Count of user's concerts (going or interested)
  const myConcertsCount = concerts.filter((concert) => {
    const userResponse = concert.responses?.userResponse;
    return userResponse && userResponse !== "not_going";
  }).length;

  // Handle voting
  const handleVote = async (
    concertId: number,
    responseType: "going" | "interested" | "not_going"
  ) => {
    if (!userId) return;

    await submitConcertResponse(concertId, userId, responseType);
    // Refetch concerts to update response counts
    const data = await fetchUpcomingConcerts(userId);
    setConcerts(data);
  };

  return {
    concerts: filteredConcerts,
    loading,
    error,
    userId,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    myConcertsCount,
    handleVote,
  };
}
