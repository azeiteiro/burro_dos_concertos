import { useEffect, useState } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { fetchUpcomingConcerts, getUserByTelegramId, submitConcertResponse } from "./lib/api";
import { Concert } from "./types/concert";
import { ConcertCard } from "./components/ConcertCard";

export function App() {
  const { webApp, isReady, user: telegramUser } = useTelegram();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isReady) return;

    const loadUserAndConcerts = async () => {
      try {
        setLoading(true);

        // For local development: use mock user ID from env variable
        const mockUserId = import.meta.env.VITE_MOCK_USER_ID;
        console.log("Telegram User from WebApp:", import.meta.env);

        let internalUserId: number | undefined;

        if (telegramUser) {
          console.log("Telegram User:", telegramUser);
          // Production: Get internal user ID from Telegram ID
          const userData = await getUserByTelegramId(telegramUser.id);
          internalUserId = userData.id;
        } else if (mockUserId) {
          // Local development with mock user
          console.log("Using mock user ID from environment variable:", mockUserId);
          internalUserId = parseInt(mockUserId);
        }

        console.log("Internal User ID:", internalUserId);

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

    loadUserAndConcerts();
  }, [isReady, telegramUser]);

  const filteredConcerts = concerts.filter((concert) => {
    const query = searchQuery.toLowerCase();
    return (
      concert.artistName.toLowerCase().includes(query) ||
      concert.venue.toLowerCase().includes(query) ||
      (concert.notes && concert.notes.toLowerCase().includes(query))
    );
  });

  const handleConcertClick = (concert: Concert) => {
    if (concert.url) {
      webApp.openLink(concert.url);
    }
  };

  const handleVote = async (
    concertId: number,
    responseType: "going" | "interested" | "not_going"
  ) => {
    if (!userId) return;

    try {
      await submitConcertResponse(concertId, userId, responseType);
      // Refetch concerts to update response counts
      const data = await fetchUpcomingConcerts(userId);
      setConcerts(data);
    } catch (err) {
      webApp.showAlert(err instanceof Error ? err.message : "Failed to submit response");
    }
  };

  if (!isReady) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        color: "var(--tg-theme-text-color, #000000)",
      }}
    >
      <div className="mb-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: "var(--tg-theme-text-color, #000000)" }}
        >
          Upcoming Concerts
        </h1>

        <input
          type="text"
          placeholder="Search concerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-3 rounded-lg border text-base outline-none"
          style={{
            borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
            backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        />
      </div>

      {loading && (
        <div className="text-center p-5">
          <p>Loading concerts...</p>
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-lg text-white mb-4"
          style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ff3b30)" }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filteredConcerts.length === 0 && (
        <div className="text-center p-5">
          <p style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
            {searchQuery ? "No concerts found matching your search" : "No upcoming concerts"}
          </p>
        </div>
      )}

      <div>
        {filteredConcerts.map((concert) => (
          <ConcertCard
            key={concert.id}
            concert={concert}
            onClick={() => handleConcertClick(concert)}
            onVote={(responseType) => handleVote(concert.id, responseType)}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}
