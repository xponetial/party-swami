"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type InviteSendButtonProps = {
  eventId: string;
  inviteEnabled: boolean;
  pendingInviteCount: number;
  remindableGuestCount: number;
  emailableGuestCount: number;
};

type DeliveryAction = {
  key: string;
  label: string;
  pendingLabel: string;
  description: string;
  deliveryType: "invite" | "reminder";
  sendMode?: "pending_only" | "all";
  disabled: boolean;
};

export function InviteSendButton({
  eventId,
  inviteEnabled,
  pendingInviteCount,
  remindableGuestCount,
  emailableGuestCount,
}: InviteSendButtonProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions: DeliveryAction[] = [
    {
      key: "invite-pending",
      label: "Send pending invites",
      pendingLabel: "Sending invites...",
      description: `${pendingInviteCount} guest${pendingInviteCount === 1 ? "" : "s"} have not been contacted yet.`,
      deliveryType: "invite",
      sendMode: "pending_only",
      disabled: !inviteEnabled || pendingInviteCount === 0,
    },
    {
      key: "invite-all",
      label: "Resend all invites",
      pendingLabel: "Resending invites...",
      description: `${emailableGuestCount} emailable guest${emailableGuestCount === 1 ? "" : "s"} can receive a fresh send.`,
      deliveryType: "invite",
      sendMode: "all",
      disabled: !inviteEnabled || emailableGuestCount === 0,
    },
    {
      key: "reminder-pending",
      label: "Send RSVP reminders",
      pendingLabel: "Sending reminders...",
      description: `${remindableGuestCount} pending guest${remindableGuestCount === 1 ? "" : "s"} already contacted can be nudged.`,
      deliveryType: "reminder",
      disabled: !inviteEnabled || remindableGuestCount === 0,
    },
  ];

  async function handleClick(action: DeliveryAction) {
    setPendingAction(action.key);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/invites/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          deliveryType: action.deliveryType,
          sendMode: action.sendMode,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to send invites right now.");
        return;
      }

      setMessage(
        `${payload.summary.deliveryType === "reminder" ? "Sent" : payload.summary.sendMode === "all" ? "Resent" : "Sent"} ${payload.summary.sentCount} ${payload.summary.deliveryType === "reminder" ? "reminder" : "invite"}${payload.summary.sentCount === 1 ? "" : "s"}${payload.summary.skippedCount ? `, skipped ${payload.summary.skippedCount}` : ""}.`,
      );
      window.location.reload();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      {!inviteEnabled ? (
        <p className="rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-ink-muted">
          Turn on the public RSVP link in the invitation generator before sending invites or reminders.
        </p>
      ) : null}
      {actions.map((action) => (
        <div key={action.key} className="rounded-2xl border border-border bg-white/70 p-4">
          <p className="text-sm font-medium text-ink">{action.label}</p>
          <p className="mt-1 text-sm text-ink-muted">{action.description}</p>
          <Button
            className="mt-3 w-full"
            disabled={action.disabled || pendingAction !== null}
            onClick={() => handleClick(action)}
            type="button"
            variant={action.deliveryType === "reminder" ? "secondary" : "primary"}
          >
            {pendingAction === action.key ? action.pendingLabel : action.label}
          </Button>
        </div>
      ))}
      {message ? <p className="text-xs text-accent">{message}</p> : null}
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </div>
  );
}
