import { z } from "zod";

export const inviteDesignSchema = z.object({
  templateId: z.string(),
  packSlug: z.string(),
  categoryKey: z.string(),
  categoryLabel: z.string(),
  fields: z.object({
    title: z.string(),
    subtitle: z.string(),
    dateText: z.string(),
    locationText: z.string(),
    messageText: z.string(),
    ctaText: z.string(),
    backgroundImageUrl: z.url().nullable().optional(),
    backgroundImagePath: z.string().nullable().optional(),
  }),
});

export type InviteDesignData = z.infer<typeof inviteDesignSchema>;

export function normalizeInviteDesignData(
  value: unknown,
  fallback: InviteDesignData,
): InviteDesignData {
  const parsed = inviteDesignSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const partial =
    typeof value === "object" && value !== null
      ? (value as Partial<InviteDesignData> & {
          fields?: Partial<InviteDesignData["fields"]>;
        })
      : null;

  return {
    templateId: partial?.templateId || fallback.templateId,
    packSlug: partial?.packSlug || fallback.packSlug,
    categoryKey: partial?.categoryKey || fallback.categoryKey,
    categoryLabel: partial?.categoryLabel || fallback.categoryLabel,
    fields: {
      title: partial?.fields?.title || fallback.fields.title,
      subtitle: partial?.fields?.subtitle || fallback.fields.subtitle,
      dateText: partial?.fields?.dateText || fallback.fields.dateText,
      locationText: partial?.fields?.locationText || fallback.fields.locationText,
      messageText: partial?.fields?.messageText || fallback.fields.messageText,
      ctaText: partial?.fields?.ctaText || fallback.fields.ctaText,
      backgroundImageUrl:
        partial?.fields?.backgroundImageUrl ?? fallback.fields.backgroundImageUrl ?? null,
      backgroundImagePath:
        partial?.fields?.backgroundImagePath ?? fallback.fields.backgroundImagePath ?? null,
    },
  };
}
