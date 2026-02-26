import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface ConcertDetailProps {
  concert: Concert;
  onClose: () => void;
}

interface AttendanceResponse {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
}

interface AttendanceData {
  concertId: number;
  going: {
    count: number;
    users: AttendanceResponse[];
  };
  interested: {
    count: number;
    users: AttendanceResponse[];
  };
  not_going: {
    count: number;
    users: AttendanceResponse[];
  };
}

export function ConcertDetail({ concert, onClose }: ConcertDetailProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "EEEE, MMMM d, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "HH:mm") : null;

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await fetch(`${API_URL}/api/concerts/${concert.id}/responses`);
        if (!response.ok) throw new Error("Failed to fetch attendance");
        const data = await response.json();
        setAttendance(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [concert.id]);

  const formatUserName = (user: AttendanceResponse) => {
    if (user.username) {
      return `@${user.username}`;
    }
    return user.firstName;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className="w-full max-h-[85vh] rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-4 py-3 border-b flex justify-between items-center"
          style={{
            backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
            borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--tg-theme-text-color, #000000)" }}
          >
            Concert Details
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: "var(--tg-theme-hint-color, #999999)" }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Concert Info */}
          <div className="mb-6">
            <h3
              className="text-xl font-bold mb-3"
              style={{ color: "var(--tg-theme-text-color, #000000)" }}
            >
              {concert.artistName}
            </h3>

            <div
              className="flex items-center gap-2 mb-2 text-sm"
              style={{ color: "var(--tg-theme-hint-color, #999999)" }}
            >
              <span>📍</span>
              <span>{concert.venue}</span>
            </div>

            <div
              className="flex items-center gap-2 mb-2 text-sm"
              style={{ color: "var(--tg-theme-hint-color, #999999)" }}
            >
              <span>📅</span>
              <span>
                {dateStr}
                {timeStr && ` at ${timeStr}`}
              </span>
            </div>

            {concert.notes && (
              <div
                className="mt-3 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
                  color: "var(--tg-theme-text-color, #000000)",
                }}
              >
                {concert.notes}
              </div>
            )}

            {concert.url && (
              <a
                href={concert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: "var(--tg-theme-button-color, #3390ec)",
                  color: "var(--tg-theme-button-text-color, #ffffff)",
                }}
              >
                🔗 View Event Page
              </a>
            )}
          </div>

          {/* Attendance */}
          <div>
            <h4
              className="text-lg font-semibold mb-3"
              style={{ color: "var(--tg-theme-text-color, #000000)" }}
            >
              Who's Attending
            </h4>

            {loading && (
              <div className="text-center py-8">
                <p style={{ color: "var(--tg-theme-hint-color, #999999)" }}>Loading...</p>
              </div>
            )}

            {error && (
              <div
                className="p-3 rounded-lg text-sm mb-4"
                style={{
                  backgroundColor: "var(--tg-theme-destructive-text-color, #ff3b30)",
                  color: "#ffffff",
                }}
              >
                {error}
              </div>
            )}

            {attendance && (
              <div className="space-y-4">
                {/* Going */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎉</span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--tg-theme-text-color, #000000)" }}
                    >
                      Going ({attendance.going.count})
                    </span>
                  </div>
                  {attendance.going.users.length > 0 ? (
                    <div className="flex flex-wrap gap-2 ml-7">
                      {attendance.going.users.map((user) => (
                        <span
                          key={user.id}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{
                            backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
                            color: "var(--tg-theme-text-color, #000000)",
                          }}
                        >
                          {formatUserName(user)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      className="ml-7 text-sm"
                      style={{ color: "var(--tg-theme-hint-color, #999999)" }}
                    >
                      No one yet
                    </p>
                  )}
                </div>

                {/* Interested */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤔</span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--tg-theme-text-color, #000000)" }}
                    >
                      Interested ({attendance.interested.count})
                    </span>
                  </div>
                  {attendance.interested.users.length > 0 ? (
                    <div className="flex flex-wrap gap-2 ml-7">
                      {attendance.interested.users.map((user) => (
                        <span
                          key={user.id}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{
                            backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
                            color: "var(--tg-theme-text-color, #000000)",
                          }}
                        >
                          {formatUserName(user)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      className="ml-7 text-sm"
                      style={{ color: "var(--tg-theme-hint-color, #999999)" }}
                    >
                      No one yet
                    </p>
                  )}
                </div>

                {/* Not Going */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">❌</span>
                    <span
                      className="font-semibold"
                      style={{ color: "var(--tg-theme-text-color, #000000)" }}
                    >
                      Not Going ({attendance.not_going.count})
                    </span>
                  </div>
                  {attendance.not_going.users.length > 0 ? (
                    <div className="flex flex-wrap gap-2 ml-7">
                      {attendance.not_going.users.map((user) => (
                        <span
                          key={user.id}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{
                            backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
                            color: "var(--tg-theme-text-color, #000000)",
                          }}
                        >
                          {formatUserName(user)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      className="ml-7 text-sm"
                      style={{ color: "var(--tg-theme-hint-color, #999999)" }}
                    >
                      No one yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
