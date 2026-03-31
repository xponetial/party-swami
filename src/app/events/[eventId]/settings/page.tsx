import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function EventSettingsPage() {
  return (
    <AppShell
      title="Security and settings"
      description="Profile, privacy, payments, and consent controls that reinforce trust across planning and checkout."
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <h2 className="text-xl font-semibold text-ink">Account and security</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Profile", "Jordan Lee, host@example.com"],
              ["Password", "Last updated 28 days ago"],
              ["Two-factor authentication", "Optional security toggle"],
              ["Payment methods", "Tokenized card vault placeholder"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
          <h2 className="text-xl font-semibold text-ink">Privacy and consent</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Guest data storage and invite visibility controls",
              "GDPR and CCPA consent management entry points",
              "Encrypted personal data and PCI-aware payment handling",
              "Event retention and deletion settings for host trust",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
