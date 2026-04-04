"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addGuestAction,
  bulkGuestAction,
  deleteGuestAction,
  type BulkGuestActionState,
  updateGuestAction,
} from "@/app/events/actions";
import { GuestImportForm } from "@/components/guests/guest-import-form";
import { InviteSendButton } from "@/components/invite/invite-send-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { type GuestDetails, type GuestMessageDetails, type InviteDetails } from "@/lib/events";

type GuestFilter = "all" | "pending" | "confirmed" | "declined" | "needsInvite" | "hasEmail";

const initialBulkState: BulkGuestActionState = {};
const INITIAL_VISIBLE_GUESTS = 15;
const VISIBLE_GUESTS_STEP = 15;
const INITIAL_VISIBLE_LOGS = 3;
const VISIBLE_LOGS_STEP = 5;

function formatDeliveryState(guest: GuestDetails) {
  if (guest.last_contacted_at) {
    return `Last contacted ${new Date(guest.last_contacted_at).toLocaleString("en-US")}`;
  }

  if (!guest.email) {
    return "No email on file yet";
  }

  return "Invite not sent yet";
}

function getStatusClasses(status: GuestDetails["status"]) {
  if (status === "confirmed") {
    return "bg-accent-soft text-accent";
  }

  if (status === "declined") {
    return "bg-brand/10 text-brand";
  }

  return "bg-canvas text-ink-muted";
}

function getConfidenceCopy(filter: GuestFilter) {
  if (filter === "needsInvite") return "Needs invite";
  if (filter === "hasEmail") return "Has email";
  if (filter === "confirmed") return "Confirmed";
  if (filter === "declined") return "Declined";
  if (filter === "pending") return "Pending RSVP";
  return "All guests";
}

export function GuestListCard({
  eventId,
  guestTarget,
  guests,
  invite,
  guestMessages,
}: {
  eventId: string;
  guestTarget: number | null;
  guests: GuestDetails[];
  invite: InviteDetails | null;
  guestMessages: GuestMessageDetails[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GuestFilter>("all");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [expandedGuestIds, setExpandedGuestIds] = useState<string[]>([]);
  const [visibleGuestCount, setVisibleGuestCount] = useState(INITIAL_VISIBLE_GUESTS);
  const [showDeliveryLog, setShowDeliveryLog] = useState(false);
  const [visibleLogCount, setVisibleLogCount] = useState(INITIAL_VISIBLE_LOGS);
  const [bulkState, bulkFormAction] = useActionState(bulkGuestAction, initialBulkState);

  const confirmedSeats = guests
    .filter((guest) => guest.status === "confirmed")
    .reduce((sum, guest) => sum + 1 + guest.plus_one_count, 0);
  const projectedSeats = guests.reduce((sum, guest) => sum + 1 + guest.plus_one_count, 0);
  const openPlusOnes = guests.reduce((sum, guest) => sum + guest.plus_one_count, 0);
  const respondedCount = guests.filter((guest) => guest.status !== "pending").length;
  const rsvpRate = guests.length ? Math.round((respondedCount / guests.length) * 100) : 0;
  const acceptedCount = guests.filter((guest) => guest.status === "confirmed").length;
  const pendingCount = guests.filter((guest) => guest.status === "pending").length;
  const emailableGuestCount = guests.filter((guest) => Boolean(guest.email)).length;
  const pendingInviteCount = guests.filter(
    (guest) => Boolean(guest.email) && !guest.last_contacted_at,
  ).length;
  const remindableGuestCount = guests.filter(
    (guest) => Boolean(guest.email) && guest.status === "pending" && guest.last_contacted_at,
  ).length;
  const targetDelta = guestTarget == null ? null : guestTarget - projectedSeats;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGuests = guests.filter((guest) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      guest.name.toLowerCase().includes(normalizedQuery) ||
      guest.email?.toLowerCase().includes(normalizedQuery) ||
      guest.phone?.toLowerCase().includes(normalizedQuery);

    const matchesFilter =
      filter === "all" ||
      guest.status === filter ||
      (filter === "needsInvite" && Boolean(guest.email) && !guest.last_contacted_at) ||
      (filter === "hasEmail" && Boolean(guest.email));

    return matchesQuery && matchesFilter;
  });

  const selectedCount = selectedGuestIds.length;
  const allVisibleSelected =
    visibleGuests.length > 0 && visibleGuests.every((guest) => selectedGuestIds.includes(guest.id));
  const displayedGuests = visibleGuests.slice(0, visibleGuestCount);
  const hasMoreGuests = visibleGuests.length > visibleGuestCount;
  const displayedGuestMessages = guestMessages.slice(0, visibleLogCount);
  const hasMoreLogs = guestMessages.length > visibleLogCount;

  function toggleExpanded(guestId: string) {
    setExpandedGuestIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleSelected(guestId: string) {
    setSelectedGuestIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId],
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(visibleGuests.map((guest) => guest.id));
      setSelectedGuestIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }

    const combined = new Set([...selectedGuestIds, ...visibleGuests.map((guest) => guest.id)]);
    setSelectedGuestIds(Array.from(combined));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Step 2 of 4</p>
            <h2 className="text-xl font-semibold text-ink">Guest management</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Add guests directly into Supabase, keep invite delivery organized, and move from
              roster building to RSVP tracking without leaving the workspace.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest count</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{guests.length}</p>
            <p className="mt-2 text-sm text-ink-muted">
              {emailableGuestCount} guest{emailableGuestCount === 1 ? "" : "s"} ready for email.
            </p>
          </div>
          <div className="rounded-3xl bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Projected seats</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{projectedSeats}</p>
            <p className="mt-2 text-sm text-ink-muted">
              Includes {openPlusOnes} plus-one{openPlusOnes === 1 ? "" : "s"} across the roster.
            </p>
          </div>
          <div className="rounded-3xl bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">RSVP progress</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{rsvpRate}%</p>
            <p className="mt-2 text-sm text-ink-muted">
              {acceptedCount} confirmed, {pendingCount} still pending.
            </p>
          </div>
          <div className="rounded-3xl bg-canvas p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Seat target</p>
            <p className="mt-2 text-2xl font-semibold text-ink">
              {guestTarget ?? "Open"}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {targetDelta == null
                ? "Set a guest target on the event to compare headcount."
                : targetDelta >= 0
                  ? `${targetDelta} seat${targetDelta === 1 ? "" : "s"} still available.`
                  : `${Math.abs(targetDelta)} seat${Math.abs(targetDelta) === 1 ? "" : "s"} over target.`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-[1.75rem] bg-canvas p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-semibold text-ink">Add one guest</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Use the quick form for one-off additions, or import a CSV below for a full roster.
            </p>
          </div>
          <form action={addGuestAction} className="contents">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="guest-name">Guest name</Label>
              <Input id="guest-name" name="name" placeholder="Jordan Lee" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email</Label>
              <Input id="guest-email" name="email" type="email" placeholder="guest@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-phone">Phone</Label>
              <Input id="guest-phone" name="phone" placeholder="555-123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-plus-one">Plus-ones</Label>
              <Input
                id="guest-plus-one"
                name="plusOneCount"
                type="number"
                min="0"
                defaultValue="0"
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <SubmitButton pendingLabel="Adding guest...">Add guest</SubmitButton>
            </div>
          </form>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-border bg-white/80 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Bulk guest import</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Download the sample spreadsheet, fill in your full guest list, then upload the CSV
                to add everyone at once.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/templates/guest-import-template.csv">Download sample CSV</Link>
            </Button>
          </div>

          <GuestImportForm eventId={eventId} />
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-border bg-white/80 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Roster controls</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">Search, filter, and update in batches</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Use quick filters to find the guests who need attention, then apply a bulk action
                without leaving the page.
              </p>
            </div>
            <div className="w-full xl:max-w-sm">
              <Label htmlFor="guest-search">Search guests</Label>
              <Input
                id="guest-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleGuestCount(INITIAL_VISIBLE_GUESTS);
                }}
                placeholder="Search by name, email, or phone"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "pending", "confirmed", "declined", "needsInvite", "hasEmail"] as GuestFilter[]).map(
              (filterOption) => (
                <button
                  key={filterOption}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === filterOption
                      ? "bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)] text-white shadow-[0_14px_30px_rgba(101,85,176,0.12)]"
                      : "border border-border bg-white text-ink-muted hover:text-ink"
                  }`}
                  onClick={() => {
                    setFilter(filterOption);
                    setVisibleGuestCount(INITIAL_VISIBLE_GUESTS);
                  }}
                  type="button"
                >
                  {getConfidenceCopy(filterOption)}
                </button>
              ),
            )}
          </div>

          <form action={bulkFormAction} className="mt-5 rounded-3xl bg-canvas p-4">
            <input type="hidden" name="eventId" value={eventId} />
            {selectedGuestIds.map((guestId) => (
              <input key={guestId} type="hidden" name="guestIds" value={guestId} />
            ))}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {selectedCount} guest{selectedCount === 1 ? "" : "s"} selected
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Working from {visibleGuests.length} visible guest{visibleGuests.length === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={toggleSelectAllVisible} type="button" variant="secondary">
                  {allVisibleSelected ? "Clear visible selection" : "Select visible guests"}
                </Button>
                <Button
                  onClick={() => setSelectedGuestIds([])}
                  type="button"
                  variant="ghost"
                >
                  Clear all
                </Button>
              </div>
            </div>
            {bulkState.error ? (
              <p
                className="mt-3 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
                aria-live="polite"
              >
                {bulkState.error}
              </p>
            ) : null}
            {bulkState.success ? (
              <p
                className="mt-3 rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent"
                aria-live="polite"
              >
                {bulkState.success}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <SubmitButton
                disabled={selectedCount === 0}
                name="bulkActionType"
                pendingLabel="Marking guests..."
                value="confirmed"
                variant="secondary"
              >
                Mark confirmed
              </SubmitButton>
              <SubmitButton
                disabled={selectedCount === 0}
                name="bulkActionType"
                pendingLabel="Resetting guests..."
                value="pending"
                variant="secondary"
              >
                Reset to pending
              </SubmitButton>
              <SubmitButton
                disabled={selectedCount === 0}
                name="bulkActionType"
                pendingLabel="Updating guests..."
                value="declined"
                variant="secondary"
              >
                Mark declined
              </SubmitButton>
              <SubmitButton
                disabled={selectedCount === 0}
                name="bulkActionType"
                pendingLabel="Removing guests..."
                value="delete"
                variant="ghost"
              >
                Remove selected
              </SubmitButton>
            </div>
          </form>
        </div>

        <div className="mt-6 space-y-4">
          {visibleGuests.length ? (
            displayedGuests.map((guest) => {
              const isExpanded = expandedGuestIds.includes(guest.id);
              const isSelected = selectedGuestIds.includes(guest.id);
              const seatImpact = 1 + guest.plus_one_count;

              return (
                <div key={guest.id} className="rounded-[1.5rem] border border-border bg-white/80 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <input
                        aria-label={`Select ${guest.name}`}
                        checked={isSelected}
                        className="mt-1 h-5 w-5 rounded border-border text-brand focus:ring-brand/30"
                        onChange={() => toggleSelected(guest.id)}
                        type="checkbox"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-ink">{guest.name}</p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${getStatusClasses(guest.status)}`}
                          >
                            {guest.status}
                          </span>
                          <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                            Seat impact {seatImpact}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-ink-muted">
                          <span className="rounded-full bg-canvas px-3 py-1">
                            {guest.email ?? "No email yet"}
                          </span>
                          <span className="rounded-full bg-canvas px-3 py-1">
                            {guest.phone ?? "No phone yet"}
                          </span>
                          <span className="rounded-full bg-canvas px-3 py-1">
                            Plus-ones {guest.plus_one_count}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-ink-muted">{formatDeliveryState(guest)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => toggleExpanded(guest.id)} type="button" variant="secondary">
                        {isExpanded ? "Hide details" : "Edit guest"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                    {invite ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          Personal RSVP link
                        </p>
                        <span className="break-all text-brand">
                          {`/rsvp/${invite.public_slug}?guest=${guest.rsvp_token}`}
                        </span>
                      </div>
                    ) : (
                      "Guest RSVP links will appear here once the invite record is ready."
                    )}
                  </div>

                  {isExpanded ? (
                    <>
                      <form action={updateGuestAction} className="mt-4 grid gap-4 md:grid-cols-2">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="guestId" value={guest.id} />
                        <div className="space-y-2">
                          <Label htmlFor={`guest-name-${guest.id}`}>Name</Label>
                          <Input
                            id={`guest-name-${guest.id}`}
                            name="name"
                            defaultValue={guest.name}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`guest-status-${guest.id}`}>Status</Label>
                          <select
                            id={`guest-status-${guest.id}`}
                            name="status"
                            defaultValue={guest.status}
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="declined">Declined</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`guest-email-${guest.id}`}>Email</Label>
                          <Input
                            id={`guest-email-${guest.id}`}
                            name="email"
                            type="email"
                            defaultValue={guest.email ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`guest-phone-${guest.id}`}>Phone</Label>
                          <Input
                            id={`guest-phone-${guest.id}`}
                            name="phone"
                            defaultValue={guest.phone ?? ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`guest-plus-one-${guest.id}`}>Plus-ones</Label>
                          <Input
                            id={`guest-plus-one-${guest.id}`}
                            name="plusOneCount"
                            type="number"
                            min="0"
                            defaultValue={String(guest.plus_one_count)}
                          />
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <SubmitButton pendingLabel="Saving guest..." variant="secondary">
                            Save guest
                          </SubmitButton>
                        </div>
                      </form>

                      <form action={deleteGuestAction} className="mt-3">
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="guestId" value={guest.id} />
                        <SubmitButton pendingLabel="Removing guest..." variant="ghost">
                          Remove guest
                        </SubmitButton>
                      </form>
                    </>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-border bg-white/80 p-6 text-center text-ink-muted">
              No guests match the current search and filter settings.
            </div>
          )}
          {visibleGuests.length ? (
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-dashed border-border bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted">
                Showing {Math.min(displayedGuests.length, visibleGuests.length)} of {visibleGuests.length} guest
                {visibleGuests.length === 1 ? "" : "s"} for the current filter.
              </p>
              {hasMoreGuests ? (
                <Button
                  onClick={() => setVisibleGuestCount((current) => current + VISIBLE_GUESTS_STEP)}
                  type="button"
                  variant="secondary"
                >
                  Load more guests
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="bg-[rgba(244,247,255,0.9)]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest activity</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">RSVP tracking and delivery state</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Accepted</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{acceptedCount}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{pendingCount}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Confirmed seats</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{confirmedSeats}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent replies</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{respondedCount}</p>
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-border bg-white/85 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Delivery readiness</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {pendingInviteCount} guest{pendingInviteCount === 1 ? "" : "s"} are ready for a first
            invite, and {remindableGuestCount} pending guest{remindableGuestCount === 1 ? "" : "s"} can be reminded.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {guests.length ? (
            guests.slice(0, 3).map((guest) => (
              <div
                key={guest.id}
                className="flex items-center justify-between rounded-3xl border border-border bg-white/85 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{guest.name}</p>
                  <p className="text-sm text-ink-muted">
                    {guest.email ?? guest.phone ?? "No contact yet"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                    {formatDeliveryState(guest)}
                  </p>
                </div>
                <span className="text-sm font-medium capitalize text-brand">{guest.status}</span>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm text-ink-muted">
              Add guests before sending the invite.
            </div>
          )}
          {[
            "Guests added here appear immediately across the event hub, invite screen, and RSVP tracking.",
            "Bulk actions help clean up the roster once replies start to come in.",
            "Every public RSVP link is still tied to the guest's personal token for tracking.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted"
            >
              {item}
            </div>
          ))}
        </div>
        {invite ? (
          <div className="mt-5">
            <InviteSendButton
              eventId={eventId}
              pendingInviteCount={pendingInviteCount}
              remindableGuestCount={remindableGuestCount}
              emailableGuestCount={emailableGuestCount}
            />
          </div>
        ) : null}
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent delivery log</p>
              <p className="mt-1 text-sm text-ink-muted">
                {guestMessages.length} delivery event{guestMessages.length === 1 ? "" : "s"} captured so far.
              </p>
            </div>
            {guestMessages.length ? (
              <Button
                onClick={() => {
                  setShowDeliveryLog((current) => !current);
                  setVisibleLogCount(INITIAL_VISIBLE_LOGS);
                }}
                type="button"
                variant="secondary"
              >
                {showDeliveryLog ? "Hide activity log" : "Show activity log"}
              </Button>
            ) : null}
          </div>
          {showDeliveryLog ? (
            <div className="mt-3 space-y-3">
              {guestMessages.length ? (
                <>
                  {displayedGuestMessages.map((message) => (
                    <div key={message.id} className="rounded-3xl border border-border bg-white/85 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink">{message.guest?.name ?? "Guest"}</p>
                            <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                              {message.message_type}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">
                            {message.guest?.email ?? "No email saved"}
                          </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          {message.sent_at ? new Date(message.sent_at).toLocaleString("en-US") : "Draft"}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink-muted">
                        {message.subject ?? "Invite email sent"}
                      </p>
                      {message.metadata?.send_mode ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                          {String(message.metadata.send_mode).replaceAll("_", " ")}
                        </p>
                      ) : null}
                      {message.metadata?.rsvp_url ? (
                        <p className="mt-2 break-all text-xs text-brand">{message.metadata.rsvp_url}</p>
                      ) : null}
                    </div>
                  ))}
                  {hasMoreLogs ? (
                    <div className="flex justify-start">
                      <Button
                        onClick={() => setVisibleLogCount((current) => current + VISIBLE_LOGS_STEP)}
                        type="button"
                        variant="secondary"
                      >
                        Show more activity
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm text-ink-muted">
                  No invite deliveries have been logged yet.
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="mt-6 rounded-3xl border border-border bg-white/85 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Next step</p>
          <p className="text-sm leading-6 text-ink-muted">
            Guest details are in place. Continue to shopping recommendations to review items,
            retailer options, and estimated spend.
          </p>
          <Button asChild className="mt-3">
            <Link href={`/events/${eventId}/shopping`}>Next Shopping Recomendations</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
