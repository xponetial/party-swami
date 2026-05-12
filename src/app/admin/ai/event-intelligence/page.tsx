import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  updateEventQuestionAdminAction,
  updateEventQuestionSetOrderAction,
} from "@/app/admin/actions";
import { requireAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type QuestionSetRow = {
  id: string;
  event_type: string;
  section_name: string;
  display_order: number;
};

type QuestionRow = {
  id: string;
  question_set_id: string;
  question_key: string;
  label: string;
  required: boolean;
  is_active: boolean;
  display_order: number;
  question_type: string;
  description: string | null;
  conditional_parent: string | null;
  conditional_value: string | null;
};

type IntakeEventRow = {
  event_name: string;
  metadata: { section_name?: string; completion_pct?: number } | null;
};

export default async function AdminEventIntelligencePage() {
  const { profile } = await requireAdminAccess();
  const supabase = createSupabaseAdminClient();
  const [{ data: sets = [] }, { data: questions = [] }, { data: intakeEvents = [] }] = await Promise.all([
    supabase
      .from("event_question_sets")
      .select("id, event_type, section_name, display_order")
      .order("event_type", { ascending: true })
      .order("display_order", { ascending: true })
      .returns<QuestionSetRow[]>(),
    supabase
      .from("event_questions")
      .select("id, question_set_id, question_key, label, required, is_active, display_order, question_type, description, conditional_parent, conditional_value")
      .order("display_order", { ascending: true })
      .returns<QuestionRow[]>(),
    supabase
      .from("analytics_events")
      .select("event_name, metadata")
      .in("event_name", ["event_intake_started", "event_intake_completed", "event_intake_abandoned", "event_intake_section_completed"])
      .order("created_at", { ascending: false })
      .limit(1500)
      .returns<IntakeEventRow[]>(),
  ]);
  const safeSets = sets ?? [];
  const safeQuestions = questions ?? [];
  const safeIntakeEvents = intakeEvents ?? [];
  const startedCount = safeIntakeEvents.filter((event) => event.event_name === "event_intake_started").length;
  const completedCount = safeIntakeEvents.filter((event) => event.event_name === "event_intake_completed").length;
  const abandonedCount = safeIntakeEvents.filter((event) => event.event_name === "event_intake_abandoned").length;
  const completionRate = startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0;
  const sectionDropoff = new Map<string, number>();
  for (const item of safeIntakeEvents) {
    if (item.event_name !== "event_intake_section_completed") continue;
    const sectionName = item.metadata?.section_name;
    if (!sectionName) continue;
    sectionDropoff.set(sectionName, (sectionDropoff.get(sectionName) ?? 0) + 1);
  }

  const questionsBySet = new Map<string, QuestionRow[]>();
  for (const question of safeQuestions) {
    const list = questionsBySet.get(question.question_set_id) ?? [];
    list.push(question);
    questionsBySet.set(question.question_set_id, list);
  }

  return (
    <AdminShell
      currentSection="/admin/ai"
      title="Event intake admin"
      description="Manage dynamic event-intelligence question sets, ordering, and activation."
      adminName={profile?.full_name}
    >
      <div className="space-y-4">
        <Card>
          <h2 className="text-lg font-semibold text-ink">Intake funnel snapshot</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Starts", String(startedCount)],
              ["Completed", String(completedCount)],
              ["Abandoned", String(abandonedCount)],
              ["Completion rate", `${completionRate}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{label}</p>
                <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Section completion counts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...sectionDropoff.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([section, count]) => (
                  <span key={section} className="rounded-full border border-border bg-canvas px-3 py-1 text-xs text-ink-muted">
                    {section}: {count}
                  </span>
                ))}
            </div>
          </div>
        </Card>
        {safeSets.map((set) => (
          <Card key={set.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">{set.event_type}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{set.section_name}</h2>
              </div>
              <form action={updateEventQuestionSetOrderAction} className="flex items-end gap-2">
                <input type="hidden" name="setId" value={set.id} />
                <div className="space-y-1">
                  <Label htmlFor={`order-${set.id}`}>Section order</Label>
                  <Input id={`order-${set.id}`} name="displayOrder" defaultValue={String(set.display_order)} type="number" />
                </div>
                <SubmitButton pendingLabel="Saving..." variant="secondary">Save</SubmitButton>
              </form>
            </div>
            <div className="mt-4 grid gap-3">
              {(questionsBySet.get(set.id) ?? []).map((question) => (
                <form
                  key={question.id}
                  action={updateEventQuestionAdminAction}
                  className="rounded-2xl border border-border bg-white/80 p-3"
                >
                  <input type="hidden" name="questionId" value={question.id} />
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.7fr_1fr_1fr_0.7fr_0.8fr_auto] md:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`label-${question.id}`}>Label</Label>
                      <Input id={`label-${question.id}`} name="label" defaultValue={question.label} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`description-${question.id}`}>Description</Label>
                      <Input id={`description-${question.id}`} name="description" defaultValue={question.description ?? ""} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`qorder-${question.id}`}>Order</Label>
                      <Input id={`qorder-${question.id}`} name="displayOrder" defaultValue={String(question.display_order)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`cparent-${question.id}`}>Conditional parent key</Label>
                      <Input id={`cparent-${question.id}`} name="conditionalParent" defaultValue={question.conditional_parent ?? ""} placeholder="e.g. alcohol_served" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`cvalue-${question.id}`}>Conditional value</Label>
                      <Input id={`cvalue-${question.id}`} name="conditionalValue" defaultValue={question.conditional_value ?? ""} placeholder="e.g. true" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink-muted">
                      <input name="required" type="checkbox" defaultChecked={question.required} />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-muted">
                      <input name="isActive" type="checkbox" defaultChecked={question.is_active} />
                      Active
                    </label>
                    <SubmitButton pendingLabel="Saving..." variant="secondary">Save</SubmitButton>
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {question.question_key} | {question.question_type}
                  </p>
                </form>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
