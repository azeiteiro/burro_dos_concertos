import { useEffect, useState } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { fetchUpcomingConcerts } from "./lib/api";
import { Concert } from "./types/concert";
import { ConcertCard } from "./components/ConcertCard";

export function App() {
  const { webApp, isReady } = useTelegram();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isReady) return;

    const loadConcerts = async () => {
      try {
        setLoading(true);
        const data = await fetchUpcomingConcerts();
        setConcerts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load concerts");
      } finally {
        setLoading(false);
      }
    };

    loadConcerts();
  }, [isReady]);

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

  if (!isReady) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        color: "var(--tg-theme-text-color, #000000)",
        padding: "16px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "16px",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          Upcoming Concerts
        </h1>

        <input
          type="text"
          placeholder="Search concerts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
            backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
            color: "var(--tg-theme-text-color, #000000)",
            fontSize: "16px",
            outline: "none",
          }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading concerts...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            backgroundColor: "var(--tg-theme-destructive-text-color, #ff3b30)",
            color: "#ffffff",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filteredConcerts.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px" }}>
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
          />
        ))}
      </div>
    </div>
  );
}
