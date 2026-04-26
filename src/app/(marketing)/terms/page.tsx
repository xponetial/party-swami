import { LegalPage } from "@/components/marketing/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Party Swami is a technology platform that connects hosts with third-party vendors, planners, AI tools, and curated shopping. These terms describe how the platform may be used and clarify the responsibilities of hosts, vendors, and Party Swami."
      sections={[
        {
          title: "Marketplace disclaimer",
          body: [
            "Party Swami operates a technology platform that connects users with independent third-party vendors, venues, planners, and service providers. Party Swami does not itself provide vendor services, products, or events, and is not a party to any contract or arrangement formed between a user and a vendor.",
            "Listings, recommendations, and search results are made available for convenience only. Party Swami does not guarantee the accuracy of listings, the availability of vendors, the quality of services, or the outcome of any event arranged through the platform.",
          ],
        },
        {
          title: "Vendor responsibility and no guarantees",
          body: [
            "Vendors and planners on Party Swami are independent contractors. Party Swami does not employ, supervise, vet, endorse, certify, or guarantee any vendor, and any badges, ratings, or reviews surfaced on the platform are informational rather than warranties of performance.",
            "Users engage vendors at their own risk. Hosts are responsible for evaluating vendor qualifications, insurance, licenses, contracts, deliverables, and conduct, and for resolving any disputes directly with the vendor.",
          ],
        },
        {
          title: "AI-generated content",
          body: [
            "Party Swami uses AI to generate invitations, messaging, plans, recommendations, shopping lists, and other content. AI outputs may be inaccurate, incomplete, biased, or unsuitable for a given event, and they should be treated as assistive suggestions rather than professional advice.",
            "Users are responsible for reviewing all AI-generated content before sending it to guests, sharing it publicly, or relying on it for purchasing or booking decisions. Party Swami is not liable for losses arising from AI outputs, including incorrect dates, addresses, allergens, pricing, or recommendations.",
          ],
        },
        {
          title: "Payments and refunds",
          body: [
            "Payments on the platform are processed by third-party providers, including Stripe. Party Swami does not hold funds in escrow for vendor services, and any subscription fees collected by Party Swami are processed through these providers.",
            "Refunds for vendor services are handled directly between the user and the vendor under the terms of the vendor's own policies. Refunds for Party Swami subscriptions or platform fees are handled between the user and Party Swami in accordance with the active plan and applicable law.",
            "Users are responsible for confirming pricing, deposits, cancellation rules, and chargeback consequences with the vendor before committing to a booking.",
          ],
        },
        {
          title: "Subscriptions, AI usage, and beta features",
          body: [
            "Pricing for Party Swami subscriptions and AI features may change at any time. Subscriptions auto-renew at the end of each billing period unless cancelled before the renewal date.",
            "AI features may be subject to monthly usage limits, per-event caps, and additional fees for top-up packs or premium models. Some features may be experimental or labelled as beta and are provided on an as-is basis without any service-level guarantees.",
          ],
        },
        {
          title: "Affiliate disclosure and shopping links",
          body: [
            "Some shopping recommendations include Amazon affiliate links and other third-party referral links. As an Amazon Associate, Party Swami earns from qualifying purchases.",
            "Hosts remain responsible for reviewing product details, pricing, availability, returns, and fit before purchasing. Party Swami is not responsible for products purchased from third-party retailers.",
          ],
        },
        {
          title: "Communications and public links",
          body: [
            "When a host enables public invite sharing or sends email invites, Party Swami may generate guest-specific RSVP links that allow invitees to respond without signing in.",
            "Hosts are responsible for sending invite links only to intended recipients and for keeping event details appropriate for sharing when public RSVP is enabled.",
          ],
        },
        {
          title: "Limitation of liability",
          body: [
            "To the maximum extent permitted by law, Party Swami, its affiliates, officers, employees, and agents are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost revenue, lost data, event cancellations, vendor non-performance, injury, or property damage arising out of or related to the platform.",
            "Party Swami's total cumulative liability for any claim arising from or related to the service is capped at the amount of fees the user paid to Party Swami in the twelve (12) months immediately preceding the event giving rise to the claim.",
          ],
        },
        {
          title: "Indemnification",
          body: [
            "Users agree to defend, indemnify, and hold harmless Party Swami and its affiliates, officers, employees, and agents from and against any claims, damages, liabilities, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the user's use of the platform, the user's content, the user's interactions with vendors or planners, the user's events, or the user's violation of these terms or any applicable law.",
            "Vendors and planners listed on the platform agree to the same indemnification obligation with respect to their listings, services, communications, and conduct on or off the platform.",
          ],
        },
        {
          title: "Availability and changes",
          body: [
            "Party Swami may modify, suspend, or discontinue features at any time and may update these terms as the product evolves. Hosts should keep reasonable backups of critical event details.",
            "Continued use of the platform after an update constitutes acceptance of the updated terms. The date of the most recent material update is reflected by the version of the platform displayed at the time of access.",
          ],
        },
      ]}
    />
  );
}
