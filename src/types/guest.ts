export type GuestStatus = "pending" | "confirmed" | "declined";

export type GuestRecord = {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: GuestStatus;
  plusOneCount: number;
  createdAt: string;
  updatedAt: string;
};
