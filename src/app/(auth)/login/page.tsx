import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="This Milestone 1 screen is a styled shell for the Supabase auth flow we will wire up in Milestone 2."
      footer={
        <p className="text-sm text-ink-muted">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-dark">
            Create one
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="host@example.com" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" disabled />
        </div>
        <Button className="w-full" disabled>
          Login wiring lands in Milestone 2
        </Button>
      </div>
    </AuthCard>
  );
}
