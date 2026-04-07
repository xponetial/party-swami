import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="Party Swami is built to collect only the host, guest, RSVP, AI usage, and delivery data needed to run the event-planning workflow inside the beta product."
      sections={[
        {
          title: "What we collect",
          body: [
            "We store host account details, event information, guest lists, invite content, RSVP responses, shopping items, tasks, and settings needed to operate the Party Swami workspace.",
            "When AI features are used, we also store generation metadata such as model name, prompt version, request fingerprint, usage totals, and saved plan revisions so hosts can track and manage their planning history.",
          ],
        },
        {
          title: "Why we use it",
          body: [
            "We use this information to authenticate hosts, protect event data with row-level security, generate and revise planning outputs, send invite emails, and show hosts recent delivery and usage history.",
            "Guest RSVP links are designed to allow invitees to respond without needing a host account, but those links are still tied to the event data the host manages.",
          ],
        },
        {
          title: "Sharing and providers",
          body: [
            "Party Swami uses hosted providers to power core product functions, including Supabase for application data, OpenAI for AI generation when enabled, and Resend for invite email delivery.",
            "We do not sell guest lists or host planning data. We share only the information needed for those providers to perform the requested product function.",
          ],
        },
        {
          title: "Retention and control",
          body: [
            "Hosts control the event records they create in the beta workspace, including guests, invite copy, shopping items, and tasks. Plan revisions and usage telemetry are retained to support auditability and product limits.",
            "If you need account or event data removed, contact the Party Swami team through the same channel used to access the beta and we can help coordinate deletion requests while the product is still in limited release.",
          ],
        },
        {
          title: "Security posture",
          body: [
            "We use authenticated host sessions, protected environment variables, and row-level security in the database to keep event data scoped to the owning account wherever practical.",
            "No beta system is perfect, so hosts should avoid entering payment card data or other unnecessary sensitive information into free-form fields.",
          ],
        },
      ]}
    />
  );
}
