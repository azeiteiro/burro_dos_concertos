import { Concert } from "@/types/concert";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchConcerts(): Promise<Concert[]> {
  const response = await fetch(`${API_URL}/api/concerts`);
  if (!response.ok) {
    throw new Error("Failed to fetch concerts");
  }
  return response.json();
}

export async function fetchUpcomingConcerts(): Promise<Concert[]> {
  const response = await fetch(`${API_URL}/api/concerts/upcoming`);
  if (!response.ok) {
    throw new Error("Failed to fetch upcoming concerts");
  }
  return response.json();
}
