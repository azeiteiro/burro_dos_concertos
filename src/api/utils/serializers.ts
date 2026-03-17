import { Concert, ResponseType, ConcertResponse } from "@prisma/client";
import { Response } from "express";
import { formatInTimeZone } from "date-fns-tz";

export type ConcertWithResponses = Concert & {
  responses: Pick<ConcertResponse, "userId" | "responseType">[];
};

/**
 * Serialize a concert for JSON response
 * Removes the responses array and converts BigInt to string
 * Formats concertDate and concertTime in Europe/Lisbon timezone to prevent UTC conversion issues
 */
export const serializeConcert = (concert: ConcertWithResponses | Concert) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { responses, ...rest } = concert as ConcertWithResponses;

  // Format dates in Europe/Lisbon timezone to prevent automatic UTC conversion
  // This ensures the date and time displayed in the mini app match the intended local time
  const concertDate = formatInTimeZone(rest.concertDate, "Europe/Lisbon", "yyyy-MM-dd'T'HH:mm:ss");
  const concertTime = rest.concertTime
    ? formatInTimeZone(rest.concertTime, "Europe/Lisbon", "yyyy-MM-dd'T'HH:mm:ss")
    : null;

  return {
    ...rest,
    pollMessageId: rest.pollMessageId ? rest.pollMessageId.toString() : null,
    concertDate,
    concertTime,
  };
};

/**
 * Set headers to prevent caching of dynamic data
 */
export const setNoCacheHeaders = (res: Response): void => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

/**
 * Transform a concert with responses to include response counts and user's response
 * Eliminates duplication between /concerts and /concerts/upcoming endpoints
 */
export const transformConcertWithResponses = (concert: ConcertWithResponses, userId?: number) => {
  const going = concert.responses.filter((r) => r.responseType === ResponseType.going);
  const interested = concert.responses.filter((r) => r.responseType === ResponseType.interested);
  const notGoing = concert.responses.filter((r) => r.responseType === ResponseType.not_going);

  // Find current user's response if userId provided
  const userResponse = userId
    ? concert.responses.find((r) => r.userId === userId)?.responseType
    : null;

  return {
    ...serializeConcert(concert),
    responses: {
      going: going.length,
      interested: interested.length,
      not_going: notGoing.length,
      userResponse,
    },
  };
};
