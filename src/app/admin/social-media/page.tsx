import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarRange,
  Clock3,
  CopyPlus,
  FileClock,
  Megaphone,
  RefreshCcw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  archiveSocialMediaCampaignAction,
  bulkUpdateSocialMediaCampaignContentStatusAction,
  createSocialMediaCampaignAction,
  createSocialMediaContentItemAction,
  deleteSocialMediaCampaignAction,
  duplicateSocialMediaCampaignAction,
  generateSocialMediaCampaignAction,
  planSocialMediaCampaignScheduleAction,
  regenerateSocialMediaCampaignAction,
  regenerateSocialMediaContentItemAction,
  rescheduleSocialMediaContentItemAction,
  updateSocialMediaBrandProfileAction,
  updateSocialMediaCampaignStatusAction,
  updateSocialMediaContentItemAction,
  updateSocialMediaContentStatusAction,
  updateSocialMediaPerformanceAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminSocialMediaData,
  requireAdminAccess,
} from "@/lib/admin";

const textAreaClass =
  "min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10";

const selectClass =
  "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const channelLabel: Record<string, string> = {
  tiktok: "TikTok",
  pinterest: "Pinterest",
  instagram: "Instagram",
  email: "Email",
  landing_page: "Landing page",
};

const socialMediaGuideSteps = [
  {
    title: "1. Start with Brand Voice",
    detail:
      "Fill out the Brand voice panel first. This tells the AI how Party Genie should sound, who it is talking to, and what kind of call-to-action to use. If you skip this step, the generated content can feel too generic.",
  },
  {
    title: "2. Create One Campaign per Party Idea",
    detail:
      "Think of a campaign as one themed marketing push. Example: 'Backyard birthday brunch' or 'Little mermaid pool party'. Use Generate from theme if you want help from AI, or Manual campaign if you already know exactly what you want.",
  },
  {
    title: "3. Review the Drafts Before Publishing",
    detail:
      "The AI creates drafts fast, but you should still read them like an editor. Check that the message is clear, the tone sounds right, and the call-to-action matches your goal, such as saves, clicks, or bookings.",
  },
  {
    title: "4. Use Statuses Like a Simple Workflow",
    detail:
      "Draft means still being written. In review means ready for someone to check. Approved means the content is good to go. Scheduled means it has a planned publish date. Published means it already went live. Archived means keep it for reference, but remove it from the active queue.",
  },
  {
    title: "5. Plan Dates Before You Feel Behind",
    detail:
      "Use Plan campaign week or the Calendar planner to spread content across the week. A simple beginner habit is to schedule one piece of content per day instead of trying to post everything at once.",
  },
  {
    title: "6. Assets Support the Post",
    detail:
      "Each draft can store image ideas, notes, links, and now uploaded creative files. If you already have a product image, mood board, or finished visual, attach it so the team knows exactly what should go with the post.",
  },
  {
    title: "7. Track Performance After Posting",
    detail:
      "After a post goes live, save the published URL and enter simple numbers like impressions, clicks, conversions, and revenue. This helps you learn which party themes and channels are actually working, even if you are new to social media.",
  },
];

const socialMediaGuideTips = [
  "If you are brand new, start with one campaign and only 2 or 3 drafts instead of trying to manage everything at once.",
  "Instagram and Pinterest are usually the easiest beginner channels for party inspiration content.",
  "If a draft feels too sales-heavy, edit the copy so it teaches or inspires first, then add the call-to-action.",
  "If you are unsure what to post next, look at the Performance card and repeat the themes that got clicks or conversions.",
];

function Badge({ status }: { status: string }) {
  const className =
    status === "published"
      ? "bg-accent-soft text-accent"
      : status === "approved"
        ? "bg-[rgba(23,184,255,0.14)] text-brand"
        : status === "scheduled"
          ? "bg-[rgba(255,191,71,0.22)] text-ink"
          : status === "archived"
            ? "bg-white text-ink-muted"
            : "bg-canvas text-ink-muted";

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${className}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

function Surface({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-border bg-white/70 p-5">{children}</div>;
}

function matchesQuery(value: string, query: string) {
  return !query || value.toLowerCase().includes(query);
}

export default async function AdminSocialMediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    campaignStatus?: string;
    contentStatus?: string;
    channel?: string;
    view?: string;
    flash?: string;
    message?: string;
  }>;
}) {
  const resolved = await searchParams;
  const [{ profile }, social] = await Promise.all([requireAdminAccess(), getAdminSocialMediaData()]);

  const query = resolved.q?.trim().toLowerCase() ?? "";
  const campaignStatus = resolved.campaignStatus ?? "all";
  const contentStatus = resolved.contentStatus ?? "all";
  const channel = resolved.channel ?? "all";
  const view = resolved.view ?? "active";

  const campaignOptions = social.campaigns.filter((campaign) => campaign.status !== "archived");
  const filteredCampaigns = social.campaigns.filter((campaign) => {
    const matchesView =
      view === "all"
        ? true
        : view === "archived"
          ? campaign.status === "archived"
          : campaign.status !== "archived";
    const matchesStatus = campaignStatus === "all" ? true : campaign.status === campaignStatus;
    const matchesSearch = matchesQuery(
      [campaign.theme, campaign.audience, campaign.objective, campaign.notes, campaign.generationSummary]
        .filter(Boolean)
        .join(" "),
      query,
    );

    return matchesView && matchesStatus && matchesSearch;
  });

  const activeCampaigns = filteredCampaigns.filter((campaign) => campaign.status !== "archived");
  const archivedCampaigns = filteredCampaigns.filter((campaign) => campaign.status === "archived");
  const filteredItems = social.contentItems.filter((item) => {
    const matchesView =
      view === "all" ? true : view === "archived" ? item.status === "archived" : item.status !== "archived";
    const matchesStatus = contentStatus === "all" ? true : item.status === contentStatus;
    const matchesChannel = channel === "all" ? true : item.channel === channel;
    const matchesSearch = matchesQuery(
      [item.title, item.campaignTheme, item.formatDetail, item.copy, item.hashtags, item.referenceLinks]
        .filter(Boolean)
        .join(" "),
      query,
    );

    return matchesView && matchesStatus && matchesChannel && matchesSearch;
  });

  const upcomingCalendar = filteredItems
    .filter((item) => item.publishOn && item.status !== "archived")
    .sort((a, b) => new Date(a.publishOn ?? "").getTime() - new Date(b.publishOn ?? "").getTime())
    .slice(0, 12);

  const filteredActivity = social.activity
    .filter((entry) => {
      const campaign = social.campaigns.find((item) => item.id === entry.campaignId);
      const contentItem = social.contentItems.find((item) => item.id === entry.contentItemId);
      return matchesQuery(
        [entry.summary, entry.actorEmail, entry.actorName, campaign?.theme, contentItem?.title]
          .filter(Boolean)
          .join(" "),
        query,
      );
    })
    .slice(0, 16);

  const visibleArchivedCount = filteredItems.filter((item) => item.status === "archived").length;
  const currentParams = new URLSearchParams();

  if (resolved.q) currentParams.set("q", resolved.q);
  if (campaignStatus !== "all") currentParams.set("campaignStatus", campaignStatus);
  if (contentStatus !== "all") currentParams.set("contentStatus", contentStatus);
  if (channel !== "all") currentParams.set("channel", channel);
  if (view !== "active") currentParams.set("view", view);

  const currentReturnTo = currentParams.size ? `/admin/social-media?${currentParams.toString()}` : "/admin/social-media";
  const flashKind = resolved.flash === "error" ? "error" : resolved.flash === "success" ? "success" : null;
  const performanceTotals = filteredItems.reduce(
    (totals, item) => {
      totals.impressions += item.manualImpressions;
      totals.clicks += item.manualClicks;
      totals.conversions += item.manualConversions;
      totals.revenue += item.manualRevenueUsd;
      return totals;
    },
    { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );
  const performanceCtr = performanceTotals.impressions
    ? Math.round((performanceTotals.clicks / performanceTotals.impressions) * 1000) / 10
    : 0;
  const performanceConversionRate = performanceTotals.clicks
    ? Math.round((performanceTotals.conversions / performanceTotals.clicks) * 1000) / 10
    : 0;

  return (
    <AdminShell
      currentSection="/admin/social-media"
      title="Social media AI studio"
      description="Generate campaigns from a theme, edit drafts, manage assets, schedule content, and run the review workflow from one admin surface."
      adminName={profile?.full_name}
    >
      {flashKind && resolved.message ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
            flashKind === "success"
              ? "border-[rgba(51,191,114,0.28)] bg-[rgba(235,255,244,0.95)] text-[#106a39]"
              : "border-[rgba(214,72,112,0.24)] bg-[rgba(255,244,247,0.95)] text-[#9f1f43]"
          }`}
        >
          {resolved.message}
        </div>
      ) : null}

      <DashboardPanel
        collapsible
        defaultOpen
        description="A beginner-friendly walkthrough of what this page does, what each section means, and the easiest order to use it in."
        summaryMeta="Start here"
        title="How To Use Social Media Admin"
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {socialMediaGuideSteps.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Best order to use this page</p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
                <li>1. Save your Brand voice settings.</li>
                <li>2. Generate or create a campaign.</li>
                <li>3. Review and edit the drafts.</li>
                <li>4. Plan the publish dates.</li>
                <li>5. Publish the content.</li>
                <li>6. Enter performance numbers after it goes live.</li>
              </ol>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Beginner tips</p>
              <div className="mt-3 space-y-3">
                {socialMediaGuideTips.map((tip) => (
                  <p key={tip} className="text-sm leading-6 text-ink-muted">
                    {tip}
                  </p>
                ))}
              </div>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">What success looks like</p>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                A good beginner workflow is simple: publish consistently, learn which themes people respond to, and improve the next campaign from those results. You do not need to master every platform at once for this page to be useful.
              </p>
            </Surface>
          </div>
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardMetricCard detail="Active campaigns." icon={Megaphone} label="Campaigns" value={String(social.metrics.campaigns)} />
        <DashboardMetricCard detail="Drafts across active campaigns." icon={FileClock} label="Content items" value={String(social.metrics.contentItems)} />
        <DashboardMetricCard detail="Waiting for review." icon={Clock3} label="Approval queue" value={String(social.metrics.approvalQueue)} />
        <DashboardMetricCard detail="Archived campaigns." icon={Trash2} label="Archived" value={String(social.metrics.archivedCampaigns)} />
        <DashboardMetricCard detail="Scheduled on the calendar." icon={CalendarRange} label="Scheduled" value={String(social.metrics.scheduledItems)} />
        <DashboardMetricCard detail="Ready or already out." icon={Send} label="Published" value={String(social.metrics.publishedItems)} />
        <DashboardMetricCard detail="Tracked AI social requests." icon={Sparkles} label="AI requests" value={String(social.analytics.aiGenerations.requests)} />
        <DashboardMetricCard detail="Current weekly target." icon={Rocket} label="Posts/week goal" value={String(social.metrics.postingGoalPerWeek)} />
      </div>

      <DashboardPanel
        title="Workflow filters"
        description="Search campaigns, narrow the queue by state or channel, and flip between active and archived work without losing your place."
      >
        <form className="grid gap-3 rounded-3xl bg-canvas p-4 xl:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.7fr_auto_auto]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink-muted">
            <Search className="size-4 text-brand" />
            <input
              className="w-full bg-transparent text-sm text-ink outline-none"
              defaultValue={resolved.q ?? ""}
              name="q"
              placeholder="Search themes, copy, hashtags, creators, or notes"
              type="search"
            />
          </div>
          <select className={selectClass} defaultValue={campaignStatus} name="campaignStatus">
            <option value="all">All campaign states</option>
            <option value="draft">Draft campaigns</option>
            <option value="in_review">In review campaigns</option>
            <option value="approved">Approved campaigns</option>
            <option value="scheduled">Scheduled campaigns</option>
            <option value="published">Published campaigns</option>
            <option value="archived">Archived campaigns</option>
          </select>
          <select className={selectClass} defaultValue={contentStatus} name="contentStatus">
            <option value="all">All draft states</option>
            <option value="draft">Draft only</option>
            <option value="in_review">In review only</option>
            <option value="approved">Approved only</option>
            <option value="scheduled">Scheduled only</option>
            <option value="published">Published only</option>
            <option value="archived">Archived only</option>
          </select>
          <select className={selectClass} defaultValue={channel} name="channel">
            <option value="all">All channels</option>
            <option value="tiktok">TikTok</option>
            <option value="pinterest">Pinterest</option>
            <option value="instagram">Instagram</option>
            <option value="email">Email</option>
            <option value="landing_page">Landing page</option>
          </select>
          <select className={selectClass} defaultValue={view} name="view">
            <option value="active">Active view</option>
            <option value="archived">Archived view</option>
            <option value="all">Everything</option>
          </select>
          <button
            className="rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(101,85,176,0.12)]"
            type="submit"
          >
            Filter queue
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-ink transition hover:border-brand/35"
            href="/admin/social-media"
          >
            Reset
          </Link>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Surface>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Visible campaigns</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{filteredCampaigns.length}</p>
          </Surface>
          <Surface>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Visible drafts</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{filteredItems.length}</p>
          </Surface>
          <Surface>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Upcoming on calendar</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{upcomingCalendar.length}</p>
          </Surface>
          <Surface>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Visible archived drafts</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{visibleArchivedCount}</p>
          </Surface>
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardPanel title="Brand voice" description="The tone system all generated social drafts should follow.">
          <form action={updateSocialMediaBrandProfileAction} className="grid gap-4">
            <input name="returnTo" type="hidden" value={currentReturnTo} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tone">Tone</Label>
                <textarea className={textAreaClass} defaultValue={social.brandProfile.tone} id="tone" name="tone" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audience">Audience</Label>
                <textarea className={textAreaClass} defaultValue={social.brandProfile.audience} id="audience" name="audience" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="signaturePhrases">Signature phrases</Label>
                <Input defaultValue={social.brandProfile.signaturePhrases} id="signaturePhrases" name="signaturePhrases" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ctaStyle">CTA style</Label>
                <Input defaultValue={social.brandProfile.ctaStyle} id="ctaStyle" name="ctaStyle" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postingGoalPerWeek">Posts/week goal</Label>
                <Input defaultValue={social.brandProfile.postingGoalPerWeek} id="postingGoalPerWeek" max={100} min={0} name="postingGoalPerWeek" required type="number" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="focusMetrics">Focus metrics</Label>
              <Input defaultValue={social.brandProfile.focusMetrics} id="focusMetrics" name="focusMetrics" required />
            </div>
            <div className="flex flex-col gap-3 rounded-3xl bg-canvas px-4 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-ink-muted">
                {social.brandProfile.updatedByName ?? social.brandProfile.updatedByEmail ?? "Not recorded yet"} / {formatAdminDateTime(social.brandProfile.updatedAt)}
              </p>
              <SubmitButton pendingLabel="Saving voice..." variant="secondary">
                Save brand voice
              </SubmitButton>
            </div>
          </form>
        </DashboardPanel>

        <div className="grid gap-4">
          <DashboardPanel title="Generate from theme" description="Use AI to create a campaign plus channel drafts in one step.">
            <form action={generateSocialMediaCampaignAction} className="grid gap-4">
              <input name="returnTo" type="hidden" value={currentReturnTo} />
              <div className="grid gap-2">
                <Label htmlFor="generate-theme">Party theme</Label>
                <Input id="generate-theme" name="theme" placeholder="Backyard birthday brunch with cheerful spring colors" required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="audienceHint">Audience hint</Label>
                  <Input id="audienceHint" name="audienceHint" placeholder="Parents planning low-stress birthdays" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="objectiveHint">Objective hint</Label>
                  <Input id="objectiveHint" name="objectiveHint" placeholder="Drive saves and affiliate clicks" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="generate-sourceEventType">Source event type</Label>
                  <Input id="generate-sourceEventType" name="sourceEventType" placeholder="birthday" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="generate-scheduledWeekOf">Week of</Label>
                  <Input id="generate-scheduledWeekOf" name="scheduledWeekOf" type="date" />
                </div>
              </div>
              <SubmitButton pendingLabel="Generating campaign...">
                <Sparkles className="size-4" />
                Generate campaign from theme
              </SubmitButton>
            </form>
          </DashboardPanel>

          <DashboardPanel title="Manual campaign" description="Create a campaign by hand when you want tighter control before drafting.">
            <form action={createSocialMediaCampaignAction} className="grid gap-4">
              <input name="returnTo" type="hidden" value={currentReturnTo} />
              <div className="grid gap-2">
                <Label htmlFor="manual-theme">Party theme</Label>
                <Input id="manual-theme" name="theme" placeholder="Summer pool party for busy moms" required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="campaign-audience">Audience</Label>
                  <Input id="campaign-audience" name="audience" placeholder="Parents planning easy weekend parties" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="objective">Objective</Label>
                  <Input id="objective" name="objective" placeholder="Drive saves and shopping clicks" required />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select className={selectClass} defaultValue="medium" id="priority" name="priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-sourceEventType">Source event type</Label>
                  <Input id="manual-sourceEventType" name="sourceEventType" placeholder="birthday" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="manual-scheduledWeekOf">Week of</Label>
                  <Input id="manual-scheduledWeekOf" name="scheduledWeekOf" type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea className={textAreaClass} id="notes" name="notes" placeholder="Include affiliate-ready tableware roundups and a quick invite CTA." />
              </div>
              <SubmitButton pendingLabel="Creating campaign...">Create campaign</SubmitButton>
            </form>
          </DashboardPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardPanel title="Social analytics" description="Production mix, AI usage, and upcoming calendar items.">
          <div className="grid gap-3 md:grid-cols-2">
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">AI generation</p>
              <p className="mt-3 text-sm text-ink-muted">
                Cost: <span className="font-semibold text-ink">{formatAdminCurrency(social.analytics.aiGenerations.estimatedCostUsd)}</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Avg latency: <span className="font-semibold text-ink">{social.analytics.aiGenerations.averageLatencyMs} ms</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Fallbacks: <span className="font-semibold text-ink">{social.analytics.aiGenerations.fallbackCount}</span>
              </p>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Status mix</p>
              <div className="mt-3 space-y-2">
                {social.analytics.byStatus.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">{statusLabel[item.label] ?? item.label}</span>
                    <span className="font-semibold text-ink">{item.count}</span>
                  </div>
                ))}
              </div>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Channel coverage</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {social.analytics.byChannel.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{channelLabel[item.label] ?? item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-ink">{item.count}</p>
                  </div>
                ))}
              </div>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Planner snapshot</p>
              <div className="mt-3 space-y-2">
                {upcomingCalendar.length ? (
                  upcomingCalendar.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl bg-canvas px-3 py-3">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {item.publishOn} / {channelLabel[item.channel]}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-muted">No scheduled items in the current filter.</p>
                )}
              </div>
            </Surface>
            <Surface>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Performance</p>
              <p className="mt-3 text-sm text-ink-muted">
                Impressions: <span className="font-semibold text-ink">{performanceTotals.impressions}</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                CTR: <span className="font-semibold text-ink">{performanceCtr}%</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Conversion rate: <span className="font-semibold text-ink">{performanceConversionRate}%</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Revenue: <span className="font-semibold text-ink">{formatAdminCurrency(performanceTotals.revenue)}</span>
              </p>
            </Surface>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Calendar planner" description="Adjust upcoming publish dates without opening each draft card.">
          <div className="space-y-3">
            {upcomingCalendar.length ? (
              upcomingCalendar.map((item) => (
                <Surface key={item.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{item.title}</p>
                        <Badge status={item.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {item.campaignTheme} / {channelLabel[item.channel]}
                      </p>
                    </div>
                    <form action={rescheduleSocialMediaContentItemAction} className="grid gap-3 sm:grid-cols-[180px_auto]">
                      <input name="contentItemId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <Input defaultValue={item.publishOn ?? ""} name="publishOn" type="date" />
                      <SubmitButton pendingLabel="Rescheduling..." variant="secondary">
                        Save date
                      </SubmitButton>
                    </form>
                  </div>
                </Surface>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
                Nothing is on the calendar for the current filter set yet.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardPanel title="Content creator" description="Add a manual draft with asset-studio fields.">
          {campaignOptions.length ? (
            <form action={createSocialMediaContentItemAction} className="grid gap-4" encType="multipart/form-data">
              <input name="returnTo" type="hidden" value={currentReturnTo} />
              <div className="grid gap-2">
                <Label htmlFor="campaignId">Campaign</Label>
                <select className={selectClass} id="campaignId" name="campaignId">
                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.theme}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="channel">Channel</Label>
                  <select className={selectClass} defaultValue="instagram" id="channel" name="channel">
                    <option value="tiktok">TikTok</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">Email</option>
                    <option value="landing_page">Landing page</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="publishOn">Publish date</Label>
                  <Input id="publishOn" name="publishOn" type="date" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="3 backyard brunch ideas hosts can steal" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="formatDetail">Format detail</Label>
                  <Input id="formatDetail" name="formatDetail" placeholder="Carousel, 5 slides, save-focused CTA" required />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="callToAction">CTA</Label>
                  <Input id="callToAction" name="callToAction" placeholder="Save this for your next party" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hashtags">Hashtags</Label>
                  <Input id="hashtags" name="hashtags" placeholder="#partyideas #hostingtips #partygenie" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="visualDirection">Visual direction</Label>
                <textarea className={textAreaClass} id="visualDirection" name="visualDirection" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imagePrompt">Image prompt</Label>
                <textarea className={textAreaClass} id="imagePrompt" name="imagePrompt" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assetNotes">Asset notes</Label>
                <textarea className={textAreaClass} id="assetNotes" name="assetNotes" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="referenceLinks">Reference links</Label>
                <textarea className={textAreaClass} id="referenceLinks" name="referenceLinks" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assetFile">Upload asset</Label>
                <Input accept="image/png,image/jpeg,image/webp,image/gif" id="assetFile" name="assetFile" type="file" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="copy">Draft copy</Label>
                <textarea className={`${textAreaClass} min-h-40`} id="copy" name="copy" required />
              </div>
              <SubmitButton pendingLabel="Saving draft...">Add content item</SubmitButton>
            </form>
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              Create a campaign first, then attach channel drafts here.
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Recent activity" description="A running audit trail for campaign generation, approvals, edits, scheduling changes, and archive/delete actions.">
          <div className="space-y-3">
            {filteredActivity.length ? (
              filteredActivity.map((entry) => (
                <Surface key={entry.id}>
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{entry.summary}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {entry.actorName ?? entry.actorEmail ?? "Admin action"} / {entry.action.replaceAll("_", " ")}
                      </p>
                    </div>
                    <p className="text-sm text-ink-muted">{formatAdminDateTime(entry.createdAt)}</p>
                  </div>
                </Surface>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
                No recent activity matches the current filter set yet.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title="Active campaigns" description="Regenerate, duplicate, archive, bulk-approve, bulk-schedule, or delete campaigns directly from the queue.">
        <div className="space-y-3">
          {activeCampaigns.length ? (
            activeCampaigns.map((campaign) => (
              <Surface key={campaign.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-ink">{campaign.theme}</p>
                      <Badge status={campaign.status} />
                      <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                        {campaign.priority} priority
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">{campaign.audience} / {campaign.objective}</p>
                    <p className="mt-2 text-sm text-ink-muted">
                      {campaign.scheduledWeekOf ? `Week of ${campaign.scheduledWeekOf} / ` : ""}
                      {campaign.contentCount} content item{campaign.contentCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 text-sm text-ink-muted">
                      Created by {campaign.createdByName ?? campaign.createdByEmail ?? "unknown"} / updated {formatAdminDateTime(campaign.updatedAt)}
                    </p>
                    {campaign.notes ? <p className="mt-2 text-sm leading-6 text-ink-muted">{campaign.notes}</p> : null}
                    {campaign.generationSummary ? <p className="mt-2 text-sm leading-6 text-ink">{campaign.generationSummary}</p> : null}
                  </div>
                  <div className="grid gap-2 rounded-3xl bg-canvas p-4 sm:grid-cols-2">
                    <form action={updateSocialMediaCampaignStatusAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="status" type="hidden" value="in_review" />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <SubmitButton className="w-full justify-center" pendingLabel="Saving..." variant="secondary">
                        Move to review
                      </SubmitButton>
                    </form>
                    <form action={regenerateSocialMediaCampaignAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <ConfirmSubmitButton
                        className="w-full justify-center"
                        confirmMessage={`Regenerate ${campaign.theme}? This will replace the campaign draft set with fresh AI outputs.`}
                        pendingLabel="Regenerating..."
                        variant="secondary"
                      >
                        <RefreshCcw className="size-4" />
                        Regenerate
                      </ConfirmSubmitButton>
                    </form>
                    <form action={duplicateSocialMediaCampaignAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <SubmitButton className="w-full justify-center" pendingLabel="Duplicating..." variant="secondary">
                        <CopyPlus className="size-4" />
                        Duplicate
                      </SubmitButton>
                    </form>
                    <form action={bulkUpdateSocialMediaCampaignContentStatusAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="status" type="hidden" value="approved" />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <SubmitButton className="w-full justify-center" pendingLabel="Approving..." variant="secondary">
                        Approve all
                      </SubmitButton>
                    </form>
                    <form action={bulkUpdateSocialMediaCampaignContentStatusAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="status" type="hidden" value="scheduled" />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <SubmitButton className="w-full justify-center" pendingLabel="Scheduling..." variant="secondary">
                        Schedule all
                      </SubmitButton>
                    </form>
                    <form action={archiveSocialMediaCampaignAction}>
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <ConfirmSubmitButton
                        className="w-full justify-center rounded-2xl border border-border bg-white text-ink shadow-none hover:bg-white"
                        confirmMessage={`Archive ${campaign.theme}? The campaign will move out of the active queue, but stay available for reference.`}
                        pendingLabel="Archiving..."
                        variant="ghost"
                      >
                        Archive
                      </ConfirmSubmitButton>
                    </form>
                    <form action={deleteSocialMediaCampaignAction} className="sm:col-span-2">
                      <input name="campaignId" type="hidden" value={campaign.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <ConfirmSubmitButton
                        className="w-full justify-center rounded-2xl border border-[rgba(214,72,112,0.25)] bg-[rgba(255,255,255,0.9)] text-[#b42345] shadow-none hover:bg-[rgba(255,240,245,1)]"
                        confirmMessage={`Delete ${campaign.theme}? This permanently removes the campaign and all linked drafts.`}
                        pendingLabel="Deleting..."
                        variant="ghost"
                      >
                        Delete campaign
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                  <form action={planSocialMediaCampaignScheduleAction} className="mt-4 grid gap-3 rounded-3xl bg-canvas p-4 md:grid-cols-[200px_auto]">
                    <input name="campaignId" type="hidden" value={campaign.id} />
                    <input name="returnTo" type="hidden" value={currentReturnTo} />
                    <Input defaultValue={campaign.scheduledWeekOf ?? ""} name="scheduledWeekOf" type="date" />
                    <SubmitButton pendingLabel="Planning calendar..." variant="secondary">
                      Plan campaign week
                    </SubmitButton>
                  </form>
                </div>
              </Surface>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              No active campaigns match the current filter set.
            </div>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Content queue" description="Every draft supports editing, asset fields, status updates, and single-item regeneration.">
        <div className="space-y-3">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <details key={item.id} className="rounded-3xl border border-border bg-white/70 p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{item.title}</p>
                        <Badge status={item.status} />
                        <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                          {channelLabel[item.channel]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-muted">{item.campaignTheme} / {item.formatDetail}</p>
                      <p className="mt-2 text-sm text-ink-muted">
                        {item.publishOn ? `Publish on ${item.publishOn} / ` : ""}
                        {formatAdminDateTime(item.updatedAt)}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{item.copy}</p>
                    </div>
                    <form action={updateSocialMediaContentStatusAction} className="grid gap-3 rounded-3xl bg-canvas p-4 sm:grid-cols-[1fr_auto]">
                      <input name="contentItemId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <select className={selectClass} defaultValue={item.status} name="status">
                        <option value="draft">Draft</option>
                        <option value="in_review">In review</option>
                        <option value="approved">Approved</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                      <SubmitButton pendingLabel="Saving..." variant="secondary">
                        Update
                      </SubmitButton>
                    </form>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
                  <form action={updateSocialMediaContentItemAction} className="grid gap-4" encType="multipart/form-data">
                    <input name="contentItemId" type="hidden" value={item.id} />
                    <input name="status" type="hidden" value={item.status} />
                    <input name="returnTo" type="hidden" value={currentReturnTo} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`title-${item.id}`}>Title</Label>
                        <Input defaultValue={item.title} id={`title-${item.id}`} name="title" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`format-${item.id}`}>Format detail</Label>
                        <Input defaultValue={item.formatDetail} id={`format-${item.id}`} name="formatDetail" required />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`publish-${item.id}`}>Publish date</Label>
                        <Input defaultValue={item.publishOn ?? ""} id={`publish-${item.id}`} name="publishOn" type="date" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`cta-${item.id}`}>CTA</Label>
                        <Input defaultValue={item.callToAction} id={`cta-${item.id}`} name="callToAction" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`hashtags-${item.id}`}>Hashtags</Label>
                      <Input defaultValue={item.hashtags} id={`hashtags-${item.id}`} name="hashtags" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`copy-${item.id}`}>Draft copy</Label>
                      <textarea className={`${textAreaClass} min-h-40`} defaultValue={item.copy} id={`copy-${item.id}`} name="copy" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`visual-${item.id}`}>Visual direction</Label>
                      <textarea className={textAreaClass} defaultValue={item.visualDirection} id={`visual-${item.id}`} name="visualDirection" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`image-${item.id}`}>Image prompt</Label>
                      <textarea className={textAreaClass} defaultValue={item.imagePrompt} id={`image-${item.id}`} name="imagePrompt" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`asset-${item.id}`}>Asset notes</Label>
                      <textarea className={textAreaClass} defaultValue={item.assetNotes} id={`asset-${item.id}`} name="assetNotes" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`links-${item.id}`}>Reference links</Label>
                      <textarea className={textAreaClass} defaultValue={item.referenceLinks} id={`links-${item.id}`} name="referenceLinks" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`asset-file-${item.id}`}>Replace asset</Label>
                      <Input accept="image/png,image/jpeg,image/webp,image/gif" id={`asset-file-${item.id}`} name="assetFile" type="file" />
                    </div>
                    {item.assetPublicUrl ? (
                      <div className="rounded-3xl border border-border bg-canvas p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Stored asset</p>
                        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img alt={`${item.title} asset`} className="h-24 w-24 rounded-2xl object-cover" src={item.assetPublicUrl} />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{item.assetFileName || "Uploaded asset"}</p>
                            <a className="mt-1 block break-all text-sm text-brand underline-offset-2 hover:underline" href={item.assetPublicUrl} rel="noreferrer" target="_blank">
                              Open asset
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <SubmitButton pendingLabel="Saving item..." variant="secondary">
                      Save edits
                    </SubmitButton>
                  </form>
                  <div className="grid gap-3">
                    <form action={regenerateSocialMediaContentItemAction}>
                      <input name="contentItemId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <ConfirmSubmitButton
                        className="w-full justify-center"
                        confirmMessage={`Regenerate ${item.title}? This replaces the current draft copy with a fresh AI pass.`}
                        pendingLabel="Regenerating..."
                        variant="secondary"
                      >
                        <RefreshCcw className="size-4" />
                        Regenerate draft
                      </ConfirmSubmitButton>
                    </form>
                    <form action={rescheduleSocialMediaContentItemAction} className="grid gap-3 rounded-3xl bg-canvas p-4">
                      <input name="contentItemId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <Label htmlFor={`planner-${item.id}`}>Quick reschedule</Label>
                      <Input defaultValue={item.publishOn ?? ""} id={`planner-${item.id}`} name="publishOn" type="date" />
                      <SubmitButton className="w-full justify-center" pendingLabel="Rescheduling..." variant="secondary">
                        Save publish date
                      </SubmitButton>
                    </form>
                    <form action={updateSocialMediaPerformanceAction} className="grid gap-3 rounded-3xl bg-canvas p-4">
                      <input name="contentItemId" type="hidden" value={item.id} />
                      <input name="returnTo" type="hidden" value={currentReturnTo} />
                      <div className="grid gap-2">
                        <Label htmlFor={`published-url-${item.id}`}>Published URL</Label>
                        <Input defaultValue={item.publishedUrl} id={`published-url-${item.id}`} name="publishedUrl" placeholder="https://www.instagram.com/p/..." />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor={`impressions-${item.id}`}>Impressions</Label>
                          <Input defaultValue={item.manualImpressions} id={`impressions-${item.id}`} min={0} name="manualImpressions" type="number" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`clicks-${item.id}`}>Clicks</Label>
                          <Input defaultValue={item.manualClicks} id={`clicks-${item.id}`} min={0} name="manualClicks" type="number" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`conversions-${item.id}`}>Conversions</Label>
                          <Input defaultValue={item.manualConversions} id={`conversions-${item.id}`} min={0} name="manualConversions" type="number" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`revenue-${item.id}`}>Revenue</Label>
                          <Input defaultValue={item.manualRevenueUsd} id={`revenue-${item.id}`} min={0} name="manualRevenueUsd" step="0.01" type="number" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`performance-notes-${item.id}`}>Performance notes</Label>
                        <textarea className={textAreaClass} defaultValue={item.performanceNotes} id={`performance-notes-${item.id}`} name="performanceNotes" />
                      </div>
                      <SubmitButton className="w-full justify-center" pendingLabel="Saving metrics..." variant="secondary">
                        Save performance
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </details>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              No social drafts match the current filter set.
            </div>
          )}
        </div>
      </DashboardPanel>

      {archivedCampaigns.length ? (
        <DashboardPanel title="Archived campaigns" description="Archived work stays visible for reference without cluttering the active queue.">
          <div className="space-y-3">
            {archivedCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl bg-canvas px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{campaign.theme}</p>
                  <Badge status="archived" />
                </div>
                <p className="mt-1 text-sm text-ink-muted">{campaign.audience} / {campaign.objective}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Archived {formatAdminDateTime(campaign.archivedAt)} / updated {formatAdminDateTime(campaign.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      ) : null}
    </AdminShell>
  );
}
