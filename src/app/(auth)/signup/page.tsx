import Link from "next/link";
import { Apple, ArrowRight, Mail, Sparkles } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <AuthCard
      title="Welcome to PartyGenie"
      description="Start with a low-friction account setup, then seed your first event so AI can generate a plan right away."
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
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled>
          <Mail className="size-4 text-brand" />
          Email
        </Button>
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled>
          <Sparkles className="size-4 text-brand" />
          Google
        </Button>
        <Button className="w-full justify-start bg-white text-ink hover:bg-white" disabled>
          <Apple className="size-4 text-brand" />
          Apple
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="first-event">Optional first event</Label>
          <Input id="first-event" placeholder="Ava's Garden Birthday" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" placeholder="Jordan" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input id="last-name" placeholder="Lee" disabled />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" placeholder="host@example.com" disabled />
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] bg-canvas p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">What happens next</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          PartyGenie opens an event setup wizard, generates your first plan, and drops you into a live event dashboard for invites, shopping, and tasks.
        </p>
      </div>

      <Button className="mt-6 w-full" disabled>
        Continue to setup
        <ArrowRight className="size-4" />
      </Button>
    </AuthCard>
  );
}
