import { addTaskAction, toggleTaskStatusAction } from "@/app/events/actions";
import { type TaskDetails, type TimelineItemDetails } from "@/lib/events";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function TaskTimelineCard({
  eventId,
  tasks,
  timelineItems,
}: {
  eventId: string;
  tasks: TaskDetails[];
  timelineItems: TimelineItemDetails[];
}) {
  const grouped = {
    "Pre-event checklist": tasks.filter((task) => task.phase === "pre-event" || !task.phase),
    "Event week": tasks.filter((task) => task.phase === "event-week"),
    "Day-of timeline": timelineItems.map((item) => ({
      id: item.id,
      title: `${item.label}: ${item.detail}`,
      status: "pending",
      due_label: item.starts_at,
    })),
  };

  const upcoming = tasks.filter((task) => task.status !== "completed").length;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Timeline and task tracker</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Create new tasks in Supabase and mark them complete as the event gets closer.
            </p>
          </div>
          <div className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent">
            {upcoming} upcoming items
          </div>
        </div>

        <form action={addTaskAction} className="mt-6 grid gap-4 rounded-[1.75rem] bg-canvas p-5 md:grid-cols-3">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="task-title">Task title</Label>
            <Input id="task-title" name="title" placeholder="Confirm bakery order" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-phase">Phase</Label>
            <Input id="task-phase" name="phase" placeholder="pre-event" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-label">Due label</Label>
            <Input id="task-due-label" name="dueLabel" placeholder="This week" />
          </div>
          <div className="flex items-end">
            <SubmitButton className="w-full" pendingLabel="Adding task...">
              Add task
            </SubmitButton>
          </div>
        </form>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {Object.entries(grouped).map(([label, groupTasks]) => (
            <div key={label} className="rounded-[1.5rem] border border-border bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{label}</p>
              <div className="mt-4 space-y-3">
                {groupTasks.length ? (
                  groupTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
                      <p>{task.title}</p>
                      {"status" in task && task.status ? (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                            {task.status} {task.due_label ? `- ${task.due_label}` : ""}
                          </p>
                          <form action={toggleTaskStatusAction}>
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="taskId" value={task.id} />
                            <input
                              type="hidden"
                              name="nextStatus"
                              value={task.status === "completed" ? "pending" : "completed"}
                            />
                            <button type="submit" className="text-xs font-medium text-brand">
                              {task.status === "completed" ? "Reopen" : "Complete"}
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                    No items in this section yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
