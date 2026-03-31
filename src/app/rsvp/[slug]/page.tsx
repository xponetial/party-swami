import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ShellFrame } from "@/components/layout/shell-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicRsvpForm } from "@/components/rsvp/public-rsvp-form";

type PublicInviteRecord = {
  event_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  theme: string | null;
  invite_copy: string | null;
  public_slug: string;
};

export default async function PublicRsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ guest?: string; success?: string }>;
}) {
  const { slug } = await params;
  const { guest: guestToken, success } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: inviteRows, error: inviteError } = await supabase.rpc("get_public_invite_by_slug", {
    p_slug: slug,
  });

  if (inviteError || !inviteRows?.length) {
    notFound();
  }

  const invite = inviteRows[0] as PublicInviteRecord;

  const guestRecord =
    guestToken
      ? (
          await supabase.rpc("get_public_guest_by_token", {
            p_slug: slug,
            p_guest_token: guestToken,
          })
        ).data?.[0] ?? null
      : null;

  const eventDate = invite.event_date
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(invite.event_date))
    : "Event date coming soon";

  return (
    <ShellFrame
      eyebrow="Public RSVP"
      title={invite.title}
      description="Confirm your plans, update your RSVP status, and let the host know whether you're bringing anyone along."
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/85">
          <Badge>{invite.event_type}</Badge>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-ink">
            {invite.theme ?? invite.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-ink-muted">
            {invite.invite_copy ?? "You are invited. Please respond using the RSVP form."}
          </p>
          <div className="mt-6 grid gap-3">
            {[eventDate, invite.location ?? "Location coming soon"].map((item) => (
              <div key={item} className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
          {guestRecord ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest RSVP</p>
              <h3 className="mt-3 text-2xl font-semibold text-ink">Hi {guestRecord.name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Update your RSVP below. Your current status is <span className="font-medium text-ink">{guestRecord.status}</span>.
              </p>
              <div className="mt-6">
                <PublicRsvpForm
                  slug={slug}
                  guestToken={guestToken!}
                  currentStatus={guestRecord.status}
                  currentPlusOneCount={guestRecord.plus_one_count}
                  successMessage={success}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest RSVP</p>
              <h3 className="mt-3 text-2xl font-semibold text-ink">Use your personal RSVP link</h3>
              <p className="mt-4 text-sm leading-6 text-ink-muted">
                This invite is public, but RSVP submission still needs your guest-specific token so
                the app knows which guest record to update. Open the personalized RSVP link sent by
                the host to respond.
              </p>
            </>
          )}
        </Card>
      </div>
    </ShellFrame>
  );
}
