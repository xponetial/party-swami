import { AppShell } from "@/components/layout/app-shell";
import { InvitePreviewCard } from "@/components/invite/invite-preview-card";
import { getEventContext } from "@/lib/events";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import type { InviteFeatureAccess } from "@/lib/invite-feature-access";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";

export default async function EventInvitePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [{ event, invite, profile }, templateCategories] = await Promise.all([
    getEventContext(eventId),
    getInviteTemplateCatalog(),
  ]);
  const userId = profile?.id ?? undefined;
  const planTier = profile?.plan_tier ?? "free";
  const isPaidPlan = planTier === "pro" || planTier === "admin";

  const [
    aiGenerationEnabled,
    uploadEditingEnabled,
    highResDownloadEnabled,
    printingEnabled,
  ] = await Promise.all([
    isFeatureFlagEnabled("ai_generation", {
      userId,
      fallbackEnabled: true,
    }),
    isFeatureFlagEnabled("upload_editing", {
      userId,
      fallbackEnabled: false,
    }),
    isFeatureFlagEnabled("high_res_download", {
      userId,
      fallbackEnabled: false,
    }),
    isFeatureFlagEnabled("printing", {
      userId,
      fallbackEnabled: false,
    }),
  ]);

  const featureAccess: InviteFeatureAccess = {
    isPaidPlan,
    aiGenerationEnabled,
    uploadEditingEnabled: isPaidPlan && uploadEditingEnabled,
    highResDownloadEnabled: isPaidPlan && highResDownloadEnabled,
    printingEnabled: isPaidPlan && printingEnabled,
  };

  return (
    <AppShell
      title="Invitation generator"
      description="Invite editing, guest messaging, RSVP tracking, and reminder controls in one place."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "invite" }}
    >
      <InvitePreviewCard
        event={event}
        invite={invite}
        featureAccess={featureAccess}
        templateCategories={templateCategories}
      />
    </AppShell>
  );
}
