import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with your Supabase email and password to load your live event workspace."
      footer={
        <p className="text-sm text-ink-muted">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-dark">
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
      <LoginForm />
    </AuthCard>
  );
}
