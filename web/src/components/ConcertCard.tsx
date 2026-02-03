import { Concert } from "@/types/concert";
import { format } from "date-fns";

interface ConcertCardProps {
  concert: Concert;
  onClick?: () => void;
}

export function ConcertCard({ concert, onClick }: ConcertCardProps) {
  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "MMM dd, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "HH:mm") : null;

  return (
    <div
      onClick={onClick}
      className="concert-card"
      style={{
        padding: "16px",
        marginBottom: "12px",
        borderRadius: "12px",
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
        cursor: "pointer",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          {concert.artistName}
        </h3>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px",
          color: "var(--tg-theme-hint-color, #999999)",
          fontSize: "14px",
        }}
      >
        <span>📍</span>
        <span>{concert.venue}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--tg-theme-hint-color, #999999)",
          fontSize: "14px",
        }}
      >
        <span>📅</span>
        <span>
          {dateStr}
          {timeStr && ` at ${timeStr}`}
        </span>
      </div>

      {concert.notes && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "13px",
            color: "var(--tg-theme-hint-color, #999999)",
          }}
        >
          {concert.notes}
        </div>
      )}
    </div>
  );
}
