import { Card } from "@/components/ui/card";

const taskGroups = [
  {
    label: "Pre-event checklist",
    tasks: ["Finalize guest draft", "Review invite wording", "Lock menu quantities", "Order decor items"],
  },
  {
    label: "Event week",
    tasks: ["Confirm RSVPs", "Buy perishables", "Pack setup supplies", "Charge speakers and lights"],
  },
  {
    label: "Day-of timeline",
    tasks: ["10:00 AM florist pickup", "12:30 PM table setup", "1:15 PM food arrival", "1:45 PM final walkthrough"],
  },
];

export function TaskTimelineCard() {
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Timeline and task tracker</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Keep the host on schedule with pre-event tasks, a day-of run of show, and reminder-friendly timing.
            </p>
          </div>
          <div className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent">
            3 upcoming reminders
          </div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {taskGroups.map((group) => (
            <div key={group.label} className="rounded-[1.5rem] border border-border bg-white/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{group.label}</p>
              <div className="mt-4 space-y-3">
                {group.tasks.map((task) => (
                  <div key={task} className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
                    {task}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
