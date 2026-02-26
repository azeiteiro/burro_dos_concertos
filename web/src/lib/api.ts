import { Concert } from "@/types/concert";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchConcerts(userId?: number): Promise<Concert[]> {
  const url = userId ? `${API_URL}/api/concerts?userId=${userId}` : `${API_URL}/api/concerts`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch concerts");
  }
  return response.json();
}

export async function fetchUpcomingConcerts(userId?: number): Promise<Concert[]> {
  const url = userId
    ? `${API_URL}/api/concerts/upcoming?userId=${userId}`
    : `${API_URL}/api/concerts/upcoming`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch upcoming concerts");
  }
  return response.json();
}

export async function submitConcertResponse(
  concertId: number,
  userId: number,
  responseType: "going" | "interested" | "not_going"
): Promise<void> {
  const response = await fetch(`${API_URL}/api/concerts/${concertId}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, responseType }),
  });
  if (!response.ok) {
    throw new Error("Failed to submit response");
  }
}

export async function getUserByTelegramId(
  telegramId: number
): Promise<{ id: number; telegramId: string; username: string | null; firstName: string }> {
  const response = await fetch(`${API_URL}/api/users/telegram/${telegramId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
}
