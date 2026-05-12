import { AppShell } from "@/components/layout/app-shell";
import { EventIntakeForm } from "@/features/event-intelligence/components/event-intake-form";
import {
  loadEventAnswers,
  loadEventQuestionSections,
} from "@/features/event-intelligence/services/event-intelligence";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EventIntakePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const enabled = await isFeatureFlagEnabled("event_intelligence_phase12", {
    userId: user.id,
    fallbackEnabled: false,
  });

  const { data: event } = await supabase
    .from("events")
    .select("id, title, event_type")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string; title: string; event_type: string }>();

  if (!event) {
    return null;
  }

  if (!enabled) {
    return (
      <AppShell
        title="Enhanced party questions"
        description="This experience is currently behind a feature flag."
        backHref={`/events/${eventId}`}
        eventNav={{ eventId, eventTitle: event.title, active: "intake" }}
      >
        <div className="rounded-3xl border border-border bg-white p-6 text-sm text-ink-muted">
          Ask an admin to enable the <code>event_intelligence_phase12</code> feature flag.
        </div>
      </AppShell>
    );
  }

  const [sections, answers] = await Promise.all([
    loadEventQuestionSections(supabase, event.event_type),
    loadEventAnswers(supabase, event.id),
  ]);
  const initialAnswers = Object.fromEntries(answers.map((answer) => [answer.question_key, answer.answer]));

  return (
    <AppShell
      title="Enhanced party questions"
      description="Give Party Swami richer context so AI planning and marketplace recommendations are sharper."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "intake" }}
    >
      <EventIntakeForm eventId={eventId} sections={sections} initialAnswers={initialAnswers} />
    </AppShell>
  );
}
