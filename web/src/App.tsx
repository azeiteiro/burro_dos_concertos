import { useEffect, useState } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { fetchUpcomingConcerts, getUserByTelegramId, submitConcertResponse } from "./lib/api";
import { Concert } from "./types/concert";
import { ConcertCard } from "./components/ConcertCard";
import { ConcertDetail } from "./components/ConcertDetail";

type TabType = "all" | "my";

export function App() {
  const { webApp, isReady, user: telegramUser } = useTelegram();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null);

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

  const handleConcertClick = (concert: Concert) => {
    setSelectedConcert(concert);
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
      className="min-h-screen pb-20"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        color: "var(--tg-theme-text-color, #000000)",
      }}
    >
      <div className="p-4">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: "var(--tg-theme-text-color, #000000)" }}
        >
          {activeTab === "all" ? "All Concerts" : "My Concerts"}
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
              {activeTab === "my"
                ? "You haven't marked any concerts as going or interested yet"
                : searchQuery
                  ? "No concerts found matching your search"
                  : "No upcoming concerts"}
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

      {/* Bottom Tab Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t"
        style={{
          backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
          borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
        }}
      >
        <div className="flex">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 px-4 py-3 text-center transition-colors ${
              activeTab === "all" ? "font-semibold" : "font-normal"
            }`}
            style={{
              color:
                activeTab === "all"
                  ? "var(--tg-theme-button-color, #3390ec)"
                  : "var(--tg-theme-hint-color, #999999)",
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">🎵</span>
              <span className="text-sm">All Concerts</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("my")}
            className={`flex-1 px-4 py-3 text-center transition-colors ${
              activeTab === "my" ? "font-semibold" : "font-normal"
            }`}
            style={{
              color:
                activeTab === "my"
                  ? "var(--tg-theme-button-color, #3390ec)"
                  : "var(--tg-theme-hint-color, #999999)",
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <span className="text-xl">🎤</span>
                {myConcertsCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1"
                    style={{
                      backgroundColor: "var(--tg-theme-button-color, #3390ec)",
                      color: "var(--tg-theme-button-text-color, #ffffff)",
                    }}
                  >
                    {myConcertsCount}
                  </span>
                )}
              </div>
              <span className="text-sm">My Concerts</span>
            </div>
          </button>
        </div>
      </div>

      {/* Concert Detail Modal */}
      {selectedConcert && (
        <ConcertDetail concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
      )}
    </div>
  );
}
