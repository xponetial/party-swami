import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getInviteImageLibraryForUser } from "@/lib/invite-image-library";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ImagesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .maybeSingle<{ plan_tier: string | null }>();

  const isPaidPlan = profile?.plan_tier === "pro" || profile?.plan_tier === "admin";
  const images = isPaidPlan ? await getInviteImageLibraryForUser(supabase, user.id, { limit: 120 }) : [];

  return (
    <AppShell
      currentSection="/images"
      title="Image library"
      description="All AI invite images generated in your workspace. Reuse these in any event invitation."
    >
      {!isPaidPlan ? (
        <div className="rounded-[1.75rem] border border-border bg-white/80 p-6">
          <p className="text-sm text-ink-muted">Image library is available on Pro and Admin plans.</p>
          <Button asChild className="mt-4">
            <Link href="/billing">Upgrade to Pro</Link>
          </Button>
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-[1.75rem] border border-border bg-white/80 p-6">
          <p className="text-sm text-ink-muted">
            No images generated yet. Create invite backgrounds from any event&apos;s invitation generator.
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/events/new">Create an event</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-white/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Generated invite artwork"
                className="h-52 w-full object-cover"
                src={image.publicUrl}
              />
              <div className="space-y-1 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{image.status}</p>
                <p className="text-xs text-ink-muted">{image.width}x{image.height}</p>
                <p className="text-xs text-ink-muted">{formatDate(image.createdAt)}</p>
                {image.eventId ? (
                  <Link
                    className="text-xs font-semibold text-brand hover:underline"
                    href={`/events/${image.eventId}/invite`}
                  >
                    Open event invite
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
