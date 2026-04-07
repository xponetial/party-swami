import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthEntryForm } from "@/components/auth/auth-entry-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; next?: string }>;
}) {
  const { message, next } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Return to your latest party plan with Google or a passwordless email link."
      footer={
        <p className="text-sm text-ink-muted">
          Need an account?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-brand hover:text-brand-dark"
          >
            Create one
          </Link>
        </p>
      }
    >
      {message ? (
        <p className="mb-4 rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          {message}
        </p>
      ) : null}
      <AuthEntryForm next={next} showRecoveryLink />
    </AuthCard>
  );
}
