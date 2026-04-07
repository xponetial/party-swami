import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="These terms describe the current Party Swami beta experience, including AI planning, host-managed guest data, public RSVP links, and email-based invite delivery."
      sections={[
        {
          title: "Beta service",
          body: [
            "Party Swami is currently offered as a hosted beta. Features may change, improve, or be removed as we learn from real host workflows.",
            "We may update these terms as the product evolves, but we will keep the service grounded in planning, guest coordination, AI assistance, and hosted collaboration for events.",
          ],
        },
        {
          title: "Host responsibilities",
          body: [
            "Hosts are responsible for reviewing event details, guest data, invite copy, and any AI-generated recommendations before relying on them or sending them to guests.",
            "You should only upload, store, or send information that you have the right to use for your event, including guest names, emails, and any public RSVP links you share.",
          ],
        },
        {
          title: "AI-generated content",
          body: [
            "Party Swami can generate event plans, invite copy, revisions, and shopping suggestions using AI. Those outputs are assistive rather than guaranteed professional advice.",
            "AI usage may be limited by plan tier, event-level caps, or monthly usage budgets, and those limits may affect how often hosts can generate or revise content.",
          ],
        },
        {
          title: "Communications and public links",
          body: [
            "When a host enables public invite sharing or sends email invites, Party Swami may generate guest-specific RSVP links that allow invitees to respond without signing in.",
            "Hosts are responsible for sending invite links only to intended recipients and for keeping event details appropriate for public sharing when public RSVP is enabled.",
          ],
        },
        {
          title: "Availability and liability",
          body: [
            "Because Party Swami is in beta, we do not promise uninterrupted availability or error-free operation. We work to improve reliability, but hosts should keep reasonable backups of critical event details.",
            "To the extent allowed by law, Party Swami is provided on an as-is basis during beta and is not liable for indirect or consequential losses resulting from event decisions, missed invitations, or AI-generated suggestions.",
          ],
        },
      ]}
    />
  );
}
