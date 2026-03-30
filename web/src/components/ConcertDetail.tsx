import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Headline,
  Subheadline,
  Text,
  Accordion,
  AvatarStack,
  Avatar,
} from "@telegram-apps/telegram-ui";
import { getInitials, generateColorFromName } from "@/utils/avatar";
import { FaCalendar, FaMapPin, FaLink, FaCheck, FaStar, FaX } from "react-icons/fa6";
import { IconType } from "react-icons/lib";

interface ConcertDetailProps {
  concert: Concert;
  onClose: () => void;
}

interface AttendanceResponse {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName?: string;
  profilePhotoUrl?: string;
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
  const [expandedSection, setExpandedSection] = useState<
    "going" | "interested" | "not_going" | null
  >(null);

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
    if (user.firstName && user.lastName) {
      const firstNamePart = user.firstName.trim().split(/\s+/)[0];
      const lastNameParts = user.lastName.trim().split(/\s+/);
      const lastNamePart = lastNameParts[lastNameParts.length - 1];
      return `${firstNamePart} ${lastNamePart}`;
    }
    if (user.firstName) {
      return user.firstName.trim().split(/\s+/)[0];
    }
    if (user.username) {
      return `@${user.username}`;
    }
    return "Unknown";
  };

  const renderAttendanceCategory = (
    type: "going" | "interested" | "not_going",
    data: { count: number; users: AttendanceResponse[] },
    title: string,
    Icon: IconType,
    colorClass: string
  ) => {
    if (data.count === 0) return null;

    return (
      <Accordion
        expanded={expandedSection === type}
        onChange={(expanded) => setExpandedSection(expanded ? type : null)}
      >
        <Accordion.Summary className="px-0 hover:bg-transparent">
          <div className="flex items-center justify-between w-full">
            <div className={`flex items-center gap-2 mr-3 ${colorClass}`}>
              <Icon className="text-sm" />
              <Subheadline level="1" weight="2" className="text-(--tg-theme-text-color) m-0">
                {title} ({data.count})
              </Subheadline>
            </div>

            {expandedSection !== type && data.users.length > 0 && (
              <AvatarStack>
                {data.users.slice(0, 3).map((user) => (
                  <Avatar
                    key={user.id}
                    size={28}
                    src={user.profilePhotoUrl || undefined}
                    acronym={
                      !user.profilePhotoUrl
                        ? getInitials({
                            firstName: user.firstName,
                            lastName: user.lastName,
                            username: user.username,
                          })
                        : undefined
                    }
                    style={{
                      backgroundColor: !user.profilePhotoUrl
                        ? generateColorFromName(user.firstName || user.username || "?")
                        : undefined,
                    }}
                  />
                ))}
              </AvatarStack>
            )}
          </div>
        </Accordion.Summary>
        <Accordion.Content>
          <div className="flex flex-col gap-3 py-2 pl-6">
            {data.users.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar
                  size={28}
                  src={user.profilePhotoUrl || undefined}
                  acronym={
                    !user.profilePhotoUrl
                      ? getInitials({
                          firstName: user.firstName,
                          lastName: user.lastName,
                          username: user.username,
                        })
                      : undefined
                  }
                  style={{
                    backgroundColor: !user.profilePhotoUrl
                      ? generateColorFromName(user.firstName || user.username || "?")
                      : undefined,
                  }}
                />
                <Text className="text-(--tg-theme-text-color) font-medium">
                  {formatUserName(user)}
                </Text>
              </div>
            ))}
          </div>
        </Accordion.Content>
      </Accordion>
    );
  };

  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      dismissible={true}
      header={
        <Modal.Header>
          <span className="font-semibold px-4 text-(--tg-theme-text-color)">Concert Details</span>
        </Modal.Header>
      }
      className="pb-10"
    >
      <div className="p-4 pb-8">
        {/* Concert Info */}
        <div className="mb-8">
          <Headline weight="1" className="mb-4 text-(--tg-theme-text-color)">
            {concert.artistName}
          </Headline>

          <div className="flex flex-col gap-3.5 mb-5">
            <Subheadline
              level="1"
              className="flex items-start gap-3 text-(--tg-theme-hint-color,#8e8e93)"
            >
              <FaMapPin className="shrink-0 mt-0.5 text-[16px]" />
              <span className="leading-tight">{concert.venue}</span>
            </Subheadline>

            <Subheadline
              level="1"
              className="flex items-start gap-3 text-(--tg-theme-hint-color,#8e8e93)"
            >
              <FaCalendar className="shrink-0 mt-0.5 text-[16px]" />
              <span className="leading-tight">
                {dateStr}
                {timeStr && ` • ${timeStr}`}
              </span>
            </Subheadline>
          </div>

          {concert.notes && (
            <div className="mt-4 p-4 rounded-2xl bg-(--tg-theme-secondary-bg-color,#f1f1f2)">
              <Text className="text-(--tg-theme-text-color) text-sm whitespace-pre-line">
                {concert.notes}
              </Text>
            </div>
          )}

          {concert.url && (
            <Button
              mode="filled"
              size="l"
              stretched
              className="mt-6 font-semibold"
              before={<FaLink />}
              onClick={() => window.open(concert.url!, "_blank", "noopener,noreferrer")}
            >
              View Event Page
            </Button>
          )}
        </div>

        {/* Attendance */}
        <div>
          <Headline weight="2" className="text-xl mb-3 text-(--tg-theme-text-color)">
            Who's Attending
          </Headline>

          {loading && (
            <div className="text-center py-8">
              <Text className="text-(--tg-theme-hint-color,#8e8e93)">Loading attendance...</Text>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 mb-4 border border-red-500/20">
              <Text className="text-red-500 text-sm">{error}</Text>
            </div>
          )}

          {attendance && (
            <div className="space-y-1">
              {renderAttendanceCategory(
                "going",
                attendance.going,
                "Going",
                FaCheck,
                "text-green-500"
              )}
              {renderAttendanceCategory(
                "interested",
                attendance.interested,
                "Interested",
                FaStar,
                "text-amber-500"
              )}
              {renderAttendanceCategory(
                "not_going",
                attendance.not_going,
                "Not Going",
                FaX,
                "text-red-500"
              )}

              {attendance.going.count === 0 &&
                attendance.interested.count === 0 &&
                attendance.not_going.count === 0 && (
                  <Text className="text-(--tg-theme-hint-color,#8e8e93) text-sm italic">
                    No one has responded yet.
                  </Text>
                )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
