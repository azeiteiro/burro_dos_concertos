import { useState } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { useConcerts } from "./hooks/useConcerts";
import { useCalendar } from "./hooks/useCalendar";
import { Concert } from "./types/concert";
import { ConcertDetail } from "./components/ConcertDetail";
import { CalendarSubscription } from "./components/CalendarSubscription";
import { TabNavigation } from "./components/TabNavigation";
import { ConcertList } from "./components/ConcertList";

export function App() {
  const { webApp, isReady, user: telegramUser } = useTelegram();
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null);

  const {
    concerts,
    loading,
    error,
    userId,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    myConcertsCount,
    handleVote,
  } = useConcerts({ isReady, telegramUser });

  const { handleCalendarSubscribe } = useCalendar(userId, webApp);

  const handleConcertClick = (concert: Concert) => {
    setSelectedConcert(concert);
  };

  const handleVoteWithErrorHandling = async (
    concertId: number,
    responseType: "going" | "interested" | "not_going"
  ) => {
    try {
      await handleVote(concertId, responseType);
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

        {/* Calendar Subscription - Only show in My Concerts tab */}
        {activeTab === "my" && userId && (
          <CalendarSubscription onSubscribe={handleCalendarSubscribe} />
        )}

        <input
          type="text"
          placeholder="Search concerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-3 rounded-lg border text-base outline-none mb-4"
          style={{
            borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
            backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        />

        <ConcertList
          concerts={concerts}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          activeTab={activeTab}
          userId={userId}
          onConcertClick={handleConcertClick}
          onVote={handleVoteWithErrorHandling}
        />
      </div>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        myConcertsCount={myConcertsCount}
      />

      {/* Concert Detail Modal */}
      {selectedConcert && (
        <ConcertDetail concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
      )}
    </div>
  );
}
