import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { sanitizeNextPath } from "@/lib/auth/urls";

function isEmailOtpType(value: string | null): value is "email" | "signup" | "invite" | "magiclink" | "recovery" {
  return value === "email" || value === "signup" || value === "invite" || value === "magiclink" || value === "recovery";
}

export default async function ConfirmAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  const nextPath = sanitizeNextPath(next);
  const hasValidParams = Boolean(tokenHash) && isEmailOtpType(type ?? null);

  return (
    <AuthCard
      title="Confirm sign in"
      description="One more tap to complete your secure email sign-in."
      footer={
        <p className="text-sm text-ink-muted">
          Need a fresh link?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
            Request another magic link
          </Link>
        </p>
      }
    >
      {hasValidParams ? (
        <form action="/confirm/complete" method="post" className="space-y-4">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={nextPath} />
          <p className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
            This extra step helps prevent email link scanners from invalidating your sign-in.
          </p>
          <Button type="submit" className="w-full">
            Continue to Party Swami
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
            This sign-in link is missing required details. Please request a new magic link.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
