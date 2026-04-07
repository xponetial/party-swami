import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthEntryForm } from "@/components/auth/auth-entry-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthCard
      title="Plan Your Party in Seconds"
      description="Start with the fastest path in: Google first, email magic link second, and no password wall in the way."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="font-medium text-brand hover:text-brand-dark"
            >
              Login
            </Link>
          </p>
          <Link
            href="/events/new"
            className="text-sm font-medium text-brand hover:text-brand-dark"
          >
            Skip ahead to event setup
          </Link>
        </div>
      }
    >
      <AuthEntryForm next={next} />
    </AuthCard>
  );
}
