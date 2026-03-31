import Link from "next/link";
import { Apple, Mail, Sparkles } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <AuthCard
      title="Welcome to PartyGenie"
      description="Create your account and connect the app to a real Supabase session."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand hover:text-brand-dark">
              Login
            </Link>
          </p>
          <Link href="/events/new" className="text-sm font-medium text-brand hover:text-brand-dark">
            Skip ahead to event setup
          </Link>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled type="button">
          <Mail className="size-4 text-brand" />
          Email
        </Button>
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled type="button">
          <Sparkles className="size-4 text-brand" />
          Google
        </Button>
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled type="button">
          <Apple className="size-4 text-brand" />
          Apple
        </Button>
      </div>
      <SignupForm />
    </AuthCard>
  );
}
