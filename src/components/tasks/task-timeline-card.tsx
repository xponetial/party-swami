import {
  addTaskAction,
  deleteTaskAction,
  toggleTaskStatusAction,
  updateTaskAction,
} from "@/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { type TaskDetails, type TimelineItemDetails } from "@/lib/events";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

function formatPhaseLabel(value: string | null | undefined) {
  if (!value) return "General";
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatusLabel(value: TaskDetails["status"]) {
  return value.replace(/_/g, " ");
}

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
  };

  const upcoming = tasks.filter((task) => task.status !== "completed").length;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const total = tasks.length;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Timeline and task tracker</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Keep the event moving with a clean prep checklist and a day-of run-of-show the host
              can actually follow.
            </p>
          </div>
          <div className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent">
            {upcoming} upcoming items
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Open tasks",
              value: `${upcoming}`,
              detail: upcoming ? "Still needs host attention" : "Everything is buttoned up",
            },
            {
              label: "Completed",
              value: `${completed}/${total || 0}`,
              detail: completed ? "Progress is already underway" : "Nothing checked off yet",
            },
            {
              label: "Day-of steps",
              value: `${timelineItems.length}`,
              detail: timelineItems.length ? "Run-of-show moments already mapped" : "Add the day-of flow next",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-border bg-[rgba(244,247,255,0.9)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
            </div>
          ))}
        </div>

        <form action={addTaskAction} className="mt-6 grid gap-4 rounded-[1.75rem] bg-canvas p-5 md:grid-cols-3">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="task-title">Task title</Label>
            <Input id="task-title" name="title" placeholder="Confirm bakery order" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-phase">Phase</Label>
            <select
              id="task-phase"
              name="phase"
              defaultValue="pre-event"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
            >
              <option value="pre-event">Pre-event</option>
              <option value="event-week">Event week</option>
            </select>
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{label}</p>
                <Badge>{groupTasks.length} items</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {groupTasks.length ? (
                  groupTasks.map((task) => (
                    <div key={task.id} className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
                      <p className="text-base font-medium text-ink">{task.title}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge>{formatPhaseLabel(task.phase)}</Badge>
                        <Badge
                          className={
                            task.status === "completed"
                              ? "bg-[linear-gradient(135deg,rgba(227,255,243,0.96)_0%,rgba(238,255,250,0.92)_100%)] text-emerald-700"
                              : task.status === "overdue"
                                ? "bg-[linear-gradient(135deg,rgba(255,236,236,0.95)_0%,rgba(255,245,245,0.9)_100%)] text-rose-700"
                                : undefined
                          }
                        >
                          {formatStatusLabel(task.status)}
                        </Badge>
                        {task.due_label ? <Badge>{task.due_label}</Badge> : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          Host action
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
                      <form action={updateTaskAction} className="mt-4 grid gap-3">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <div className="space-y-2">
                          <Label htmlFor={`task-title-${task.id}`}>Task title</Label>
                          <Input
                            id={`task-title-${task.id}`}
                            name="title"
                            defaultValue={task.title}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`task-phase-${task.id}`}>Phase</Label>
                          <select
                            id={`task-phase-${task.id}`}
                            name="phase"
                            defaultValue={task.phase ?? "pre-event"}
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                          >
                            <option value="pre-event">Pre-event</option>
                            <option value="event-week">Event week</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`task-due-${task.id}`}>Due label</Label>
                          <Input
                            id={`task-due-${task.id}`}
                            name="dueLabel"
                            defaultValue={task.due_label ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`task-status-${task.id}`}>Status</Label>
                          <select
                            id={`task-status-${task.id}`}
                            name="status"
                            defaultValue={task.status}
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <SubmitButton pendingLabel="Saving task..." variant="secondary">
                            Save task
                          </SubmitButton>
                        </div>
                      </form>
                      <form action={deleteTaskAction} className="mt-3">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <SubmitButton pendingLabel="Deleting task..." variant="ghost">
                          Delete task
                        </SubmitButton>
                      </form>
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

          <div className="rounded-[1.5rem] border border-border bg-white/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Day-of timeline</p>
              <Badge>{timelineItems.length} steps</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {timelineItems.length ? (
                timelineItems.map((item, index) => (
                  <div key={item.id} className="rounded-2xl bg-canvas px-4 py-4 text-sm text-ink">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-medium text-ink">{item.label}</p>
                        <p className="mt-1 leading-6 text-ink-muted">{item.detail}</p>
                        {item.starts_at ? (
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-muted">
                            {item.starts_at}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                  No day-of timeline items yet. Keep using the saved plan to map the run-of-show.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
