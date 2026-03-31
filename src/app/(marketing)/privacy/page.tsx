import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="PartyGenie is designed to keep guest and host data minimal, protected, and purpose-bound."
      sections={[
        "We collect only the host, event, guest, and RSVP data needed to run the MVP.",
        "Public RSVP access is separated from authenticated host workflows.",
        "Sensitive data should be masked in logs and protected through secure environment variables and hosted infrastructure.",
      ]}
    />
  );
}
