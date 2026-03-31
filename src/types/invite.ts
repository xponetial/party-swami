export type InviteRecord = {
  id: string;
  eventId: string;
  designJson: Record<string, unknown> | null;
  inviteCopy: string | null;
  publicSlug: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
