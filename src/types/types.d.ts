export interface Concert {
  id: string;
  name: string;
  date: Date; // YYYY-MM-DD
  location: string;
  url?: string;
  notes?: string;
  createdBy: string;
}
