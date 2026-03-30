import { useState } from "react";
import { Input } from "@telegram-apps/telegram-ui";
import { useTelegram } from "./hooks/useTelegram";
import { useConcerts } from "./hooks/useConcerts";
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
      webApp?.showAlert(err instanceof Error ? err.message : "Failed to submit response");
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
    <div className="min-h-screen pb-20">
      <h1 className="text-2xl font-bold mt-2 ml-4">
        {activeTab === "all" ? "All Concerts" : "My Concerts"}
      </h1>

      {/* Calendar Subscription - Only show in My Concerts tab */}
      {activeTab === "my" && userId && webApp && (
        <CalendarSubscription userId={userId} webApp={webApp} />
      )}

      <Input
        placeholder="Search concerts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
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
