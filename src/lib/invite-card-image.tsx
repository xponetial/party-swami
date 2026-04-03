import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeInviteDesignData, type InviteDesignData } from "@/lib/invite-design";
import {
  compactInviteCopy,
  formatTitleForCard,
  getInviteCardLayout,
  getTitleFontSize,
} from "@/lib/invite-card-layout";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";
import {
  findInviteTemplate,
  type InviteTemplate,
  type InviteTemplateCategory,
} from "@/lib/invite-template-types";

export type PublicInviteImageRecord = {
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  theme: string | null;
  invite_copy: string | null;
  design_json: InviteDesignData | null;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategoryKey(categoryHint: string, categories: InviteTemplateCategory[]) {
  const normalized = slugify(categoryHint);

  return (
    categories.find((category) => normalized.includes(category.key))?.key ??
    categories.find((category) => category.key.includes(normalized))?.key ??
    categories[0]?.key ??
    ""
  );
}

function resolveTemplate(
  categories: InviteTemplateCategory[],
  design: InviteDesignData,
  eventType: string,
): InviteTemplate | null {
  return (
    findInviteTemplate(categories, {
      templateId: design.templateId,
      packSlug: design.packSlug,
    }) ??
    findInviteTemplate(categories, {
      templateId: design.templateId,
      packSlug: null,
    }) ??
    categories.find((category) => category.key === inferCategoryKey(design.categoryLabel || eventType, categories))
      ?.templates[0] ??
    categories.find((category) => category.key === inferCategoryKey(eventType, categories))?.templates[0] ??
    categories[0]?.templates[0] ??
    null
  );
}

function getImageMimeType(assetPath: string) {
  const extension = path.extname(assetPath).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

async function getTemplateBackgroundDataUri(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const absoluteAssetPath = path.join(process.cwd(), "public", normalizedAssetPath);
  const fileBuffer = await readFile(absoluteAssetPath);
  const mimeType = getImageMimeType(assetPath);

  return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
}

export async function createInviteCardImageResponse(invite: PublicInviteImageRecord) {
  const templateCategories = await getInviteTemplateCatalog();
  const fallbackDesign: InviteDesignData = {
    templateId: "email-fallback-template",
    packSlug: "email-fallback-pack",
    categoryKey: invite.event_type.trim().toLowerCase(),
    categoryLabel: invite.event_type,
    fields: {
      title: invite.title,
      subtitle: invite.theme?.trim() || invite.event_type,
      dateText: invite.event_date
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(invite.event_date))
        : "Date coming soon",
      locationText: invite.location?.trim() || "Location coming soon",
      messageText: invite.invite_copy ?? `You're invited to ${invite.title}.`,
      ctaText: "RSVP with your private link",
    },
  };
  const design = invite.design_json
    ? normalizeInviteDesignData(invite.design_json, fallbackDesign)
    : fallbackDesign;
  const template = resolveTemplate(templateCategories, design, invite.event_type);
  const backgroundUrl = template ? await getTemplateBackgroundDataUri(template.assetPath) : null;
  const layout = template ? getInviteCardLayout(template) : null;
  const message = compactInviteCopy(design.fields.messageText, 360);
  const titleFontSize = getTitleFontSize(design.fields.title);
  const formattedTitle = formatTitleForCard(design.fields.title);
  const titleTop = layout?.titleTop ?? 18;
  const detailsTop = layout?.detailsTop ?? 60;
  const ctaTop = layout?.ctaTop ?? 86;
  const titleColor = layout?.accents[0] ?? "#ffffff";
  const ctaColor = layout?.accents[1] ?? "#ffd869";
  const titleFontFamily = layout?.emailTitleFontFamily ?? "Georgia, serif";
  const titleLetterSpacing = layout?.emailTitleLetterSpacing ?? "0.04em";
  const eyebrowLetterSpacing = layout?.emailEyebrowLetterSpacing ?? "0.16em";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at top right, rgba(37,146,255,0.18), transparent 22%), radial-gradient(circle at top left, rgba(139,70,255,0.2), transparent 24%), linear-gradient(180deg, #060a1e 0%, #0e1537 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            borderRadius: 48,
            display: "flex",
            height: 1120,
            overflow: "hidden",
            position: "relative",
            width: 760,
          }}
        >
          {backgroundUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              height="1120"
              src={backgroundUrl}
              style={{
                height: "100%",
                left: 0,
                objectFit: "cover",
                position: "absolute",
                top: 0,
                width: "100%",
              }}
              width="760"
            />
          ) : (
            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,12,36,0.88) 0%, rgba(37,146,255,0.52) 52%, rgba(139,70,255,0.62) 100%)",
                inset: 0,
                position: "absolute",
              }}
            />
          )}

          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(4,8,28,0.28) 0%, rgba(7,12,34,0.18) 24%, rgba(8,12,36,0.12) 42%, rgba(6,10,30,0.48) 100%)",
              inset: 0,
              position: "absolute",
            }}
          />

          <div
            style={{
              alignItems: "center",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
              inset: 0,
              padding: "64px 56px 56px",
              position: "absolute",
              textAlign: "center",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "rgba(8,12,36,0.76)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                color: "#ffffff",
                display: "flex",
                fontSize: 17,
                fontWeight: 700,
                justifyContent: "center",
                letterSpacing: "0.34em",
                minHeight: 44,
                textTransform: "uppercase",
                width: 260,
              }}
            >
              AI Party Genie
            </div>

            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                justifyContent: "center",
                left: "50%",
                position: "absolute",
                top: `${titleTop}%`,
                transform: "translate(-50%, -50%)",
                width: "76%",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  color: titleColor,
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                  justifyContent: "center",
                  letterSpacing: eyebrowLetterSpacing,
                  opacity: 0.92,
                  textAlign: "center",
                  textTransform: "uppercase",
                  width: "100%",
                }}
              >
                {design.fields.subtitle}
              </div>
              <div
                style={{
                  alignItems: "center",
                  color: titleColor,
                  display: "flex",
                  fontFamily: titleFontFamily,
                  fontSize: titleFontSize,
                  fontWeight: 700,
                  justifyContent: "center",
                  letterSpacing: titleLetterSpacing,
                  lineHeight: 1.04,
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                  wordBreak: "break-word",
                }}
              >
                {formattedTitle}
              </div>
            </div>

            <div
              style={{
                background: "rgba(8, 12, 36, 0.48)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 34,
                color: titleColor,
                display: "flex",
                flexDirection: "column",
                fontSize: 22,
                lineHeight: 1.45,
                left: "50%",
                maxHeight: 300,
                overflow: "hidden",
                padding: "28px 32px",
                position: "absolute",
                textAlign: "center",
                top: `${detailsTop}%`,
                transform: "translate(-50%, -50%)",
                width: "84%",
                whiteSpace: "pre-wrap",
              }}
            >
              {message}
            </div>

            <div
              style={{
                alignItems: "center",
                background: "linear-gradient(135deg, rgba(37,146,255,0.28), rgba(139,70,255,0.32))",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 999,
                color: "#ffd869",
                display: "flex",
                fontSize: 22,
                fontWeight: 700,
                justifyContent: "center",
                letterSpacing: "0.22em",
                left: "50%",
                minHeight: 88,
                padding: "0 26px",
                position: "absolute",
                textAlign: "center",
                top: `${ctaTop}%`,
                transform: "translate(-50%, -50%)",
                textTransform: "uppercase",
                width: "70%",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  color: ctaColor,
                  display: "flex",
                  justifyContent: "center",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                {design.fields.ctaText}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 1200,
    },
  );
}

export async function createInviteCardEmailAttachment(invite: PublicInviteImageRecord) {
  const imageResponse = await createInviteCardImageResponse(invite);
  const arrayBuffer = await imageResponse.arrayBuffer();

  return {
    filename: "invite-card.png",
    content: Buffer.from(arrayBuffer).toString("base64"),
    contentType: "image/png",
    contentId: "invite-card",
  };
}
