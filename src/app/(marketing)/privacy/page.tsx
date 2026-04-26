import { LegalPage } from "@/components/marketing/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Party Swami collects the host, guest, vendor, AI, payment, and delivery data needed to operate the planning workflow and the marketplace. This policy explains what we collect, why we collect it, and how it is shared."
      sections={[
        {
          title: "Data we collect",
          body: [
            "We collect host account details, event information (including date, address, theme, and notes), guest lists and contact details, RSVP responses, invite content, shopping items, tasks, and settings used to operate the Party Swami workspace.",
            "When AI features are used, we also store generation metadata such as model name, prompt version, request fingerprint, usage totals, and saved plan revisions so hosts can track and manage their planning history.",
            "When users transact through the platform, we store related metadata such as customer identifiers, plan tier, invoice references, and limited billing details. Full card numbers are handled directly by our payment processor and are not stored on Party Swami systems.",
          ],
        },
        {
          title: "Why we use it",
          body: [
            "We use this information to authenticate hosts, protect event data with row-level security, generate and revise planning outputs, send invite emails, route messages between users and vendors, surface recommendations, and show hosts recent delivery and usage history.",
            "Guest RSVP links allow invitees to respond without needing a host account, but those links are still tied to the event data the host manages and are subject to the host's sharing decisions.",
          ],
        },
        {
          title: "Sharing with vendors and planners",
          body: [
            "When a host contacts a vendor or planner through Party Swami, we share the information needed to facilitate the engagement, which may include the host's name, contact details, event details, and message content.",
            "Vendors and planners are independent third parties. Once data is shared with a vendor or planner, their handling of that data is governed by their own practices and agreements with the host. Party Swami does not control vendor data handling outside the platform.",
          ],
        },
        {
          title: "Third-party providers",
          body: [
            "Party Swami uses hosted providers to power core product functions, including Supabase for application data, OpenAI for AI generation when enabled, Resend for invite email delivery, Stripe for subscription and payment processing, and Upstash for rate limiting.",
            "We share only the information needed for these providers to perform the requested function and rely on their own security and compliance posture for the portions they operate.",
            "We do not sell guest lists, host planning data, or vendor message content to advertisers or data brokers.",
          ],
        },
        {
          title: "AI processing",
          body: [
            "User-supplied content, including event details, prompts, guest information referenced in prompts, and revision instructions, may be sent to AI providers to generate invitations, recommendations, plans, and shopping suggestions.",
            "Hosts should avoid placing payment card numbers, government identifiers, health information, or other unnecessary sensitive data into AI prompts or free-form fields. Generated outputs may be cached and retained as plan revisions for the host's account history.",
          ],
        },
        {
          title: "Retention and control",
          body: [
            "Hosts control the event records they create in the workspace, including guests, invite copy, shopping items, and tasks. Plan revisions, vendor message history, and usage telemetry are retained to support auditability, dispute handling, and product limits.",
            "If you need account or event data removed, contact the Party Swami team and we will help coordinate deletion requests in accordance with applicable law and the operational records we are required to retain.",
          ],
        },
        {
          title: "Security posture",
          body: [
            "We use authenticated host sessions, protected environment variables, row-level security in the database, and rate limiting to keep event data scoped to the owning account wherever practical.",
            "No system is perfect, so hosts should avoid entering payment card data or other unnecessary sensitive information into free-form fields and should report suspected security issues to the Party Swami team.",
          ],
        },
      ]}
    />
  );
}
