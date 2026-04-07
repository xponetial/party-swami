import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <AuthCard
      title="Choose a new password"
      description="Open the recovery link from your email, then set the new password you want to use for Party Swami."
      footer={
        <p className="text-sm text-ink-muted">
          Need to start over?{" "}
          <Link href="/forgot-password" className="font-medium text-brand hover:text-brand-dark">
            Send another reset email
          </Link>
        </p>
      }
    >
      <ResetPasswordForm message={message} />
    </AuthCard>
  );
}
