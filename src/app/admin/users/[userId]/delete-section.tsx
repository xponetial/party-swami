"use client";

import { useActionState, useState } from "react";
import { deleteUserDataAction, type DeletionActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function DeleteSection({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [state, action, pending] = useActionState<DeletionActionState, FormData>(
    deleteUserDataAction,
    null,
  );

  const [confirmEmail, setConfirmEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  const emailMatches =
    confirmEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/60 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-red-700">Danger zone</h2>
        <p className="mt-2 text-sm leading-6 text-red-600/80">
          Permanently delete this account and all associated data. This action is{" "}
          <span className="font-semibold">irreversible</span>. Anonymized transaction records
          will be retained for compliance.
        </p>
      </div>

      {!showForm ? (
        <Button
          variant="secondary"
          className="border-red-300 bg-red-100 text-red-700 hover:bg-red-200"
          onClick={() => setShowForm(true)}
        >
          Delete this account
        </Button>
      ) : (
        <div className="mt-2 space-y-4 rounded-2xl border border-red-200 bg-white p-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">Confirm deletion</p>
            <p className="text-sm text-ink-muted">
              Type{" "}
              <span className="select-all rounded bg-canvas px-1.5 py-0.5 font-mono text-xs text-ink">
                {userEmail}
              </span>{" "}
              to confirm.
            </p>
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="targetUserId" value={userId} />

            <input
              autoComplete="off"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300"
              name="confirmEmail"
              placeholder={userEmail}
              spellCheck={false}
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />

            {state?.error && (
              <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!emailMatches || pending}
                type="submit"
              >
                {pending ? "Deleting account…" : "Permanently delete account"}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setConfirmEmail("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
