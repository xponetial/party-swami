import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="These placeholder terms establish the route and layout structure for Milestone 1."
      sections={[
        "PartyGenie is provided as a hosted planning tool and beta software experience.",
        "Hosts are responsible for reviewing AI-generated content before sending invites or relying on shopping recommendations.",
        "Commerce links and integrations will expand in later milestones under separate product policies.",
      ]}
    />
  );
}
