import { Concert, ResponseType, ConcertResponse } from "@prisma/client";
import ical, { ICalCalendarMethod, ICalAlarmType } from "ical-generator";
import pino from "pino";

const logger = pino({ name: "calendarService" });

type ConcertWithResponse = Concert & {
  responses: Pick<ConcertResponse, "responseType">[];
};

/**
 * Generate an iCal calendar from a list of concerts
 * Eliminates duplication between /calendar.ics and /calendar-debug endpoints
 */
export const generateCalendar = (concerts: ConcertWithResponse[]) => {
  try {
    // Create calendar
    const calendar = ical({
      name: "My Concert Calendar",
      description: "Your upcoming concerts",
      timezone: "Europe/Lisbon",
      ttl: 3600, // Refresh every hour
      method: ICalCalendarMethod.PUBLISH,
      scale: "GREGORIAN", // Required by some calendar apps
      prodId: "//Burro dos Concertos//Concert Calendar//EN",
    });

    // Add concerts as events
    concerts.forEach((concert) => {
      const responseType = concert.responses[0]?.responseType;
      const status = responseType === ResponseType.going ? "Going" : "Interested";

      const start = new Date(concert.concertDate);
      let end = new Date(concert.concertDate);

      // If concert has a time, use it
      if (concert.concertTime) {
        const concertTime = new Date(concert.concertTime);
        start.setHours(concertTime.getHours(), concertTime.getMinutes(), 0, 0);
        // End time: 3 hours after start (default concert duration)
        end = new Date(start);
        end.setHours(start.getHours() + 3);
      } else {
        // All-day event
        end.setDate(end.getDate() + 1);
      }

      const event = calendar.createEvent({
        start,
        end,
        summary: `[${status}] ${concert.artistName}`,
        description: concert.notes || undefined,
        location: concert.venue,
        url: concert.url || undefined,
        allDay: !concert.concertTime,
        timezone: concert.concertTime ? "Europe/Lisbon" : undefined,
      });

      // Add alarm (1 day before)
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: 60 * 60 * 24, // 24 hours before
      });
    });

    logger.info({ concertCount: concerts.length }, "Generated calendar");
    return calendar;
  } catch (error) {
    logger.error({ error }, "Failed to generate calendar");
    throw error;
  }
};
