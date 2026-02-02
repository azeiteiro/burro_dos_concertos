// Shared types - matches Prisma Concert model
export interface Concert {
  id: number;
  artistName: string;
  venue: string;
  concertDate: Date | string;
  concertTime: Date | string | null;
  notes: string | null;
  url: string | null;
  userId: number;
  notified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ConcertFilters {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  venue?: string;
  sortBy?: "date" | "artist" | "venue";
  sortOrder?: "asc" | "desc";
}
