import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useState } from "react";

interface ConcertCardProps {
  concert: Concert;
  onClick?: () => void;
  onVote?: (responseType: "going" | "interested" | "not_going") => Promise<void>;
  userId?: number;
}

export function ConcertCard({ concert, onClick, onVote, userId }: ConcertCardProps) {
  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "MMM dd, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "HH:mm") : null;
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (
    e: React.MouseEvent,
    responseType: "going" | "interested" | "not_going"
  ) => {
    e.stopPropagation();
    if (!onVote || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(responseType);
    } finally {
      setIsVoting(false);
    }
  };

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
        cursor: onClick ? "pointer" : "default",
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

      {concert.responses && userId && onVote && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={(e) => handleVote(e, "going")}
              disabled={isVoting}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
                backgroundColor:
                  concert.responses.userResponse === "going"
                    ? "var(--tg-theme-button-color, #3390ec)"
                    : "transparent",
                color:
                  concert.responses.userResponse === "going"
                    ? "var(--tg-theme-button-text-color, #ffffff)"
                    : "var(--tg-theme-text-color, #000000)",
                fontSize: "14px",
                fontWeight: concert.responses.userResponse === "going" ? "600" : "400",
                cursor: isVoting ? "not-allowed" : "pointer",
                opacity: isVoting ? 0.6 : 1,
              }}
            >
              🎉 Going ({concert.responses.going})
            </button>

            <button
              onClick={(e) => handleVote(e, "interested")}
              disabled={isVoting}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
                backgroundColor:
                  concert.responses.userResponse === "interested"
                    ? "var(--tg-theme-button-color, #3390ec)"
                    : "transparent",
                color:
                  concert.responses.userResponse === "interested"
                    ? "var(--tg-theme-button-text-color, #ffffff)"
                    : "var(--tg-theme-text-color, #000000)",
                fontSize: "14px",
                fontWeight: concert.responses.userResponse === "interested" ? "600" : "400",
                cursor: isVoting ? "not-allowed" : "pointer",
                opacity: isVoting ? 0.6 : 1,
              }}
            >
              🤔 Interested ({concert.responses.interested})
            </button>

            <button
              onClick={(e) => handleVote(e, "not_going")}
              disabled={isVoting}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--tg-theme-hint-color, #e0e0e0)",
                backgroundColor:
                  concert.responses.userResponse === "not_going"
                    ? "var(--tg-theme-button-color, #3390ec)"
                    : "transparent",
                color:
                  concert.responses.userResponse === "not_going"
                    ? "var(--tg-theme-button-text-color, #ffffff)"
                    : "var(--tg-theme-text-color, #000000)",
                fontSize: "14px",
                fontWeight: concert.responses.userResponse === "not_going" ? "600" : "400",
                cursor: isVoting ? "not-allowed" : "pointer",
                opacity: isVoting ? 0.6 : 1,
              }}
            >
              ❌ Not Going ({concert.responses.not_going})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
