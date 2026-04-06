import {
  BadgeCheck,
  CalendarRange,
  Clock3,
  FileClock,
  Megaphone,
  Rocket,
  Send,
  Sparkles,
} from "lucide-react";
import {
  createSocialMediaCampaignAction,
  createSocialMediaContentItemAction,
  deleteSocialMediaCampaignAction,
  generateSocialMediaCampaignAction,
  updateSocialMediaBrandProfileAction,
  updateSocialMediaCampaignStatusAction,
  updateSocialMediaContentStatusAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatAdminDateTime, getAdminSocialMediaData, requireAdminAccess } from "@/lib/admin";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

const channelLabel: Record<string, string> = {
  tiktok: "TikTok",
  pinterest: "Pinterest",
  instagram: "Instagram",
  email: "Email",
  landing_page: "Landing page",
};

const textAreaClass =
  "min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10";

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "published"
      ? "bg-accent-soft text-accent"
      : status === "approved"
        ? "bg-[rgba(23,184,255,0.14)] text-brand"
        : status === "scheduled"
          ? "bg-[rgba(255,191,71,0.22)] text-ink"
          : "bg-canvas text-ink-muted";

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${className}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

export default async function AdminSocialMediaPage() {
  const [{ profile }, social] = await Promise.all([
    requireAdminAccess(),
    getAdminSocialMediaData(),
  ]);

  return (
    <AdminShell
      currentSection="/admin/social-media"
      title="Social media AI studio"
      description="Run Party Genie's internal campaign engine: define brand voice, generate campaigns from a theme, draft channel content, and move assets through review."
      adminName={profile?.full_name}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardMetricCard
          detail="Campaigns currently tracked in the admin studio."
          icon={Megaphone}
          label="Campaigns"
          value={String(social.metrics.campaigns)}
        />
        <DashboardMetricCard
          detail="Drafts and platform-specific content items across all campaigns."
          icon={FileClock}
          label="Content items"
          value={String(social.metrics.contentItems)}
        />
        <DashboardMetricCard
          detail="Content currently waiting for admin review before publish."
          icon={Clock3}
          label="Approval queue"
          value={String(social.metrics.approvalQueue)}
        />
        <DashboardMetricCard
          detail="Items already placed on the calendar with a target publish date."
          icon={CalendarRange}
          label="Scheduled"
          value={String(social.metrics.scheduledItems)}
        />
        <DashboardMetricCard
          detail="Finished content that has made it through the workflow."
          icon={Send}
          label="Published"
          value={String(social.metrics.publishedItems)}
        />
        <DashboardMetricCard
          detail="Weekly target driven by the current brand profile settings."
          icon={Rocket}
          label="Posts/week goal"
          value={String(social.metrics.postingGoalPerWeek)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardPanel
          title="Brand voice control"
          description="These settings define how social drafts should sound, who they are for, and what action each post should invite."
        >
          <form action={updateSocialMediaBrandProfileAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tone">Tone</Label>
                <textarea
                  className={textAreaClass}
                  defaultValue={social.brandProfile.tone}
                  id="tone"
                  name="tone"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audience">Audience</Label>
                <textarea
                  className={textAreaClass}
                  defaultValue={social.brandProfile.audience}
                  id="audience"
                  name="audience"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="signaturePhrases">Signature phrases</Label>
                <Input
                  defaultValue={social.brandProfile.signaturePhrases}
                  id="signaturePhrases"
                  name="signaturePhrases"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ctaStyle">CTA style</Label>
                <Input
                  defaultValue={social.brandProfile.ctaStyle}
                  id="ctaStyle"
                  name="ctaStyle"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="postingGoalPerWeek">Posts per week goal</Label>
                <Input
                  defaultValue={social.brandProfile.postingGoalPerWeek}
                  id="postingGoalPerWeek"
                  max={100}
                  min={0}
                  name="postingGoalPerWeek"
                  required
                  type="number"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="focusMetrics">Focus metrics</Label>
              <Input
                defaultValue={social.brandProfile.focusMetrics}
                id="focusMetrics"
                name="focusMetrics"
                required
              />
            </div>

            <div className="flex flex-col gap-3 rounded-3xl bg-canvas px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Current voice owner</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {social.brandProfile.updatedByName ?? social.brandProfile.updatedByEmail ?? "Not recorded yet"} / Last updated{" "}
                  {formatAdminDateTime(social.brandProfile.updatedAt)}
                </p>
              </div>
              <SubmitButton pendingLabel="Saving voice..." variant="secondary">
                Save brand voice
              </SubmitButton>
            </div>
          </form>
        </DashboardPanel>

        <div className="grid gap-4">
          <DashboardPanel
            title="Generate campaign from theme"
            description="Use the saved brand voice plus a single party theme to generate a ready-for-review campaign and channel drafts."
          >
            <form action={generateSocialMediaCampaignAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="generate-theme">Party theme</Label>
                <Input
                  id="generate-theme"
                  name="theme"
                  placeholder="Backyard birthday brunch with cheerful spring colors"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="audienceHint">Audience hint</Label>
                  <Input
                    id="audienceHint"
                    name="audienceHint"
                    placeholder="Parents planning low-stress birthdays"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="objectiveHint">Objective hint</Label>
                  <Input
                    id="objectiveHint"
                    name="objectiveHint"
                    placeholder="Drive saves and affiliate clicks"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="generate-sourceEventType">Source event type</Label>
                  <Input
                    id="generate-sourceEventType"
                    name="sourceEventType"
                    placeholder="birthday"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="generate-scheduledWeekOf">Week of</Label>
                  <Input id="generate-scheduledWeekOf" name="scheduledWeekOf" type="date" />
                </div>
              </div>

              <div className="rounded-3xl bg-canvas px-4 py-4 text-sm leading-6 text-ink-muted">
                The generator creates one campaign plus five review-ready drafts across TikTok, Pinterest, Instagram, email, and landing-page copy.
              </div>

              <SubmitButton pendingLabel="Generating campaign...">
                <Sparkles className="size-4" />
                Generate campaign from theme
              </SubmitButton>
            </form>
          </DashboardPanel>

          <DashboardPanel
            title="Campaign builder"
            description="Create a campaign manually when you want tighter control over the brief before drafting content."
          >
            <form action={createSocialMediaCampaignAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="manual-theme">Party theme</Label>
                <Input id="manual-theme" name="theme" placeholder="Summer pool party for busy moms" required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="campaign-audience">Audience</Label>
                  <Input
                    id="campaign-audience"
                    name="audience"
                    placeholder="Parents planning easy weekend parties"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="objective">Objective</Label>
                  <Input
                    id="objective"
                    name="objective"
                    placeholder="Drive saves and shopping clicks"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                    defaultValue="medium"
                    id="priority"
                    name="priority"
                  >
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
                <textarea
                  className={textAreaClass}
                  id="notes"
                  name="notes"
                  placeholder="Include affiliate-ready tableware roundups and a quick invite CTA."
                />
              </div>

              <SubmitButton pendingLabel="Creating campaign...">Create campaign</SubmitButton>
            </form>
          </DashboardPanel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Active campaigns"
          description="These are the campaign briefs currently moving through draft, review, scheduling, and publish."
        >
          <div className="space-y-3">
            {social.campaigns.length ? (
              social.campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-3xl border border-border bg-white/70 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-ink">{campaign.theme}</p>
                        <StatusBadge status={campaign.status} />
                        <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                          {campaign.priority} priority
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">
                        {campaign.audience} / {campaign.objective}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">
                        {campaign.sourceEventType ? `${campaign.sourceEventType} / ` : ""}
                        {campaign.scheduledWeekOf ? `Week of ${campaign.scheduledWeekOf} / ` : ""}
                        {campaign.contentCount} content item{campaign.contentCount === 1 ? "" : "s"}
                      </p>
                      {campaign.notes ? (
                        <p className="mt-2 text-sm leading-6 text-ink-muted">{campaign.notes}</p>
                      ) : null}
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-muted">
                        Updated {formatAdminDateTime(campaign.updatedAt)} / {campaign.createdByName ?? campaign.createdByEmail ?? "Admin"}
                      </p>
                    </div>

                    <div className="grid gap-3 rounded-3xl bg-canvas p-4">
                      <form
                        action={updateSocialMediaCampaignStatusAction}
                        className="grid gap-3 sm:grid-cols-[1fr_auto]"
                      >
                        <input name="campaignId" type="hidden" value={campaign.id} />
                        <select
                          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                          defaultValue={campaign.status}
                          name="status"
                        >
                          <option value="draft">Draft</option>
                          <option value="in_review">In review</option>
                          <option value="approved">Approved</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="published">Published</option>
                        </select>
                        <SubmitButton pendingLabel="Saving..." variant="secondary">
                          Update
                        </SubmitButton>
                      </form>

                      <form action={deleteSocialMediaCampaignAction}>
                        <input name="campaignId" type="hidden" value={campaign.id} />
                        <SubmitButton
                          className="w-full justify-center rounded-2xl border border-[rgba(214,72,112,0.25)] bg-[rgba(255,255,255,0.9)] text-[#b42345] shadow-none hover:bg-[rgba(255,240,245,1)]"
                          pendingLabel="Deleting..."
                          variant="ghost"
                        >
                          Delete campaign
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
                No campaigns yet. Create the first brief or generate one from a theme to start the social workflow.
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Draft a content item"
          description="Add a platform-specific draft to an existing campaign so the approval queue and calendar can start filling up."
        >
          {social.campaigns.length ? (
            <form action={createSocialMediaContentItemAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="campaignId">Campaign</Label>
                <select
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                  id="campaignId"
                  name="campaignId"
                >
                  {social.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.theme}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="channel">Channel</Label>
                  <select
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                    defaultValue="instagram"
                    id="channel"
                    name="channel"
                  >
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
                  <Label htmlFor="title">Working title</Label>
                  <Input id="title" name="title" placeholder="3 backyard brunch ideas hosts can steal" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="formatDetail">Format detail</Label>
                  <Input
                    id="formatDetail"
                    name="formatDetail"
                    placeholder="Carousel, 5 slides, save-focused CTA"
                    required
                  />
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
                <textarea
                  className={textAreaClass}
                  id="visualDirection"
                  name="visualDirection"
                  placeholder="Bright overhead table shots, punchy prop closeups, playful typography overlays."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="copy">Draft copy</Label>
                <textarea
                  className={`${textAreaClass} min-h-40`}
                  id="copy"
                  name="copy"
                  placeholder="Hosts do not need a huge budget to make a party feel intentional..."
                  required
                />
              </div>

              <SubmitButton pendingLabel="Saving draft...">Add content item</SubmitButton>
            </form>
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              Create a campaign first, then attach TikTok, Pinterest, Instagram, email, or landing-page drafts to it here.
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Content queue"
        description="A working list of recent content drafts with quick status controls for review, approval, scheduling, and publish."
      >
        <div className="space-y-3">
          {social.contentItems.length ? (
            social.contentItems.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-white/70 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <StatusBadge status={item.status} />
                      <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                        {channelLabel[item.channel]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      {item.campaignTheme} / {item.formatDetail}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      {item.publishOn ? `Publish on ${item.publishOn} / ` : ""}
                      Updated {formatAdminDateTime(item.updatedAt)}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{item.copy}</p>
                    {item.callToAction ? (
                      <p className="mt-2 text-sm leading-6 text-ink">
                        <span className="font-semibold">CTA:</span> {item.callToAction}
                      </p>
                    ) : null}
                    {item.hashtags ? (
                      <p className="mt-2 text-sm leading-6 text-ink-muted">{item.hashtags}</p>
                    ) : null}
                  </div>

                  <form
                    action={updateSocialMediaContentStatusAction}
                    className="grid gap-3 rounded-3xl bg-canvas p-4 sm:grid-cols-[1fr_auto]"
                  >
                    <input name="contentItemId" type="hidden" value={item.id} />
                    <select
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                      defaultValue={item.status}
                      name="status"
                    >
                      <option value="draft">Draft</option>
                      <option value="in_review">In review</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </select>
                    <SubmitButton pendingLabel="Saving..." variant="secondary">
                      Update
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              No social drafts yet. Add the first content item from the campaign builder panel above.
            </div>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Operating guidance"
        description="A simple internal rule set so this section stays useful before auto-posting and richer analytics arrive."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Every campaign should start with a clear theme, audience, and monetizable objective.",
            "Move drafts into review before approval so the queue stays intentional and audit-friendly.",
            "Use scheduling as the source of truth for upcoming work until publishing automation is added.",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-canvas px-4 py-4">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 size-4 text-brand" />
                <p className="text-sm leading-6 text-ink">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
