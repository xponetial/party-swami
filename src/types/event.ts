export type EventStatus = "draft" | "planning" | "ready";

export type EventRecord = {
  id: string;
  userId: string;
  title: string;
  eventType: string;
  eventDate: string | null;
  location: string | null;
  guestTarget: number | null;
  budget: number | null;
  theme: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};
