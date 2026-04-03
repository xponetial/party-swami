import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1200;
const CARD_X = 28;
const CARD_Y = 64;
const CARD_WIDTH = 744;
const CARD_HEIGHT = 1072;
const FRAME_RADIUS = 34;
const IMAGE_INSET = 18;
const IMAGE_X = CARD_X + IMAGE_INSET;
const IMAGE_Y = CARD_Y + IMAGE_INSET;
const IMAGE_WIDTH = CARD_WIDTH - IMAGE_INSET * 2;
const IMAGE_HEIGHT = CARD_HEIGHT - IMAGE_INSET * 2;

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const remainingWords = words.slice(lines.join(" ").split(/\s+/).filter(Boolean).length);
  if (remainingWords.length && lines.length) {
    const lastLine = `${lines[lines.length - 1]} ${remainingWords.join(" ")}`.trim();
    lines[lines.length - 1] =
      lastLine.length > maxCharsPerLine ? `${lastLine.slice(0, maxCharsPerLine - 3).trimEnd()}...` : lastLine;
  }

  return lines.slice(0, maxLines);
}

function getTitleLines(title: string) {
  return formatTitleForCard(title)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toSvgTspans(lines: string[], x: number, dy: number) {
  return lines
    .map((line, index) => {
      const offset = index === 0 ? 0 : dy;
      return `<tspan x="${x}" dy="${offset}">${escapeXml(line)}</tspan>`;
    })
    .join("");
}

async function getTemplateBackground(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const absoluteAssetPath = path.join(process.cwd(), "public", normalizedAssetPath);

  return readFile(absoluteAssetPath);
}

function buildOverlaySvg(params: {
  title: string;
  subtitle: string;
  message: string;
  ctaText: string;
  titleTop: number;
  detailsTop: number;
  ctaTop: number;
  titleColor: string;
  ctaColor: string;
  titleFontFamily: string;
  titleLetterSpacing: string;
  eyebrowLetterSpacing: string;
}) {
  const {
    title,
    subtitle,
    message,
    ctaText,
    titleTop,
    detailsTop,
    ctaTop,
    titleColor,
    ctaColor,
    titleFontFamily,
    titleLetterSpacing,
    eyebrowLetterSpacing,
  } = params;

  const titleLines = getTitleLines(title);
  const titleFontSize = getTitleFontSize(title);
  const titleLineHeight = Math.round(titleFontSize * 1.08);
  const titleCenterX = IMAGE_X + IMAGE_WIDTH / 2;
  const titleBaseY = IMAGE_Y + (IMAGE_HEIGHT * titleTop) / 100 - (titleLines.length - 1) * (titleLineHeight / 2);
  const detailLines = wrapText(message, 34, 4);
  const detailTextX = IMAGE_X + IMAGE_WIDTH / 2;
  const detailsBoxWidth = Math.round(IMAGE_WIDTH * 0.84);
  const detailsBoxHeight = 120 + Math.max(0, detailLines.length - 1) * 34;
  const detailsBoxX = Math.round((CANVAS_WIDTH - detailsBoxWidth) / 2);
  const detailsBoxY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * detailsTop) / 100 - detailsBoxHeight / 2);
  const detailsTextY = detailsBoxY + 38;
  const ctaWidth = Math.round(IMAGE_WIDTH * 0.7);
  const ctaHeight = 84;
  const ctaX = Math.round((CANVAS_WIDTH - ctaWidth) / 2);
  const ctaY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * ctaTop) / 100 - ctaHeight / 2);

  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canvasBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#eef3ff" />
          <stop offset="100%" stop-color="#edf2ff" />
        </linearGradient>
        <linearGradient id="imageShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(4,8,28,0.18)" />
          <stop offset="42%" stop-color="rgba(8,12,36,0.08)" />
          <stop offset="100%" stop-color="rgba(6,10,30,0.32)" />
        </linearGradient>
        <linearGradient id="ctaFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(37,146,255,0.36)" />
          <stop offset="100%" stop-color="rgba(139,70,255,0.34)" />
        </linearGradient>
      </defs>

      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" rx="34" fill="url(#canvasBg)" />
      <text x="${CARD_X}" y="28" fill="#6f63d9" font-family="sans-serif" font-size="15" letter-spacing="5" text-transform="uppercase">
        AI PARTY GENIE INVITATION
      </text>

      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${FRAME_RADIUS}" fill="#131a4a" />
      <rect x="${IMAGE_X}" y="${IMAGE_Y}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="18" fill="rgba(255,255,255,0.08)" />
      <rect x="${IMAGE_X}" y="${IMAGE_Y}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="18" fill="url(#imageShade)" />

      <text
        x="${titleCenterX}"
        y="${titleBaseY}"
        fill="${titleColor}"
        font-family="sans-serif"
        font-size="19"
        font-weight="700"
        letter-spacing="${eyebrowLetterSpacing}"
        text-anchor="middle"
        opacity="0.94"
      >
        ${escapeXml(subtitle.toUpperCase())}
      </text>

      <text
        x="${titleCenterX}"
        y="${titleBaseY + 42}"
        fill="${titleColor}"
        font-family="${titleFontFamily}"
        font-size="${titleFontSize}"
        font-weight="700"
        letter-spacing="${titleLetterSpacing}"
        text-anchor="middle"
      >
        ${toSvgTspans(titleLines, titleCenterX, titleLineHeight)}
      </text>

      <rect
        x="${detailsBoxX}"
        y="${detailsBoxY}"
        width="${detailsBoxWidth}"
        height="${detailsBoxHeight}"
        rx="28"
        fill="rgba(8,12,36,0.48)"
        stroke="rgba(255,255,255,0.18)"
      />

      <text
        x="${detailTextX}"
        y="${detailsTextY}"
        fill="${titleColor}"
        font-family="sans-serif"
        font-size="21"
        font-weight="500"
        text-anchor="middle"
      >
        ${toSvgTspans(detailLines, detailTextX, 34)}
      </text>

      <rect
        x="${ctaX}"
        y="${ctaY}"
        width="${ctaWidth}"
        height="${ctaHeight}"
        rx="42"
        fill="url(#ctaFill)"
        stroke="rgba(255,255,255,0.2)"
      />

      <text
        x="${ctaX + ctaWidth / 2}"
        y="${ctaY + 50}"
        fill="${ctaColor}"
        font-family="sans-serif"
        font-size="22"
        font-weight="700"
        letter-spacing="3"
        text-anchor="middle"
      >
        ${escapeXml(ctaText.toUpperCase())}
      </text>
    </svg>
  `.trim();
}

export async function createInviteCardImagePng(invite: PublicInviteImageRecord) {
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
  const layout = template ? getInviteCardLayout(template) : null;
  const titleTop = layout?.titleTop ?? 18;
  const detailsTop = layout?.detailsTop ?? 60;
  const ctaTop = layout?.ctaTop ?? 86;
  const titleColor = layout?.accents[0] ?? "#ffffff";
  const ctaColor = layout?.accents[1] ?? "#ffd869";
  const titleFontFamily = layout?.emailTitleFontFamily ?? "Georgia, serif";
  const titleLetterSpacing = layout?.emailTitleLetterSpacing ?? "0.04em";
  const eyebrowLetterSpacing = layout?.emailEyebrowLetterSpacing ?? "0.16em";
  const message = compactInviteCopy(design.fields.messageText, 140);
  const backgroundBuffer = template
    ? await getTemplateBackground(template.assetPath)
    : await sharp({
        create: {
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          channels: 4,
          background: "#28366f",
        },
      })
        .png()
        .toBuffer();

  const resizedBackground = await sharp(backgroundBuffer)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();

  const overlaySvg = buildOverlaySvg({
    title: design.fields.title,
    subtitle: design.fields.subtitle,
    message,
    ctaText: design.fields.ctaText,
    titleTop,
    detailsTop,
    ctaTop,
    titleColor,
    ctaColor,
    titleFontFamily,
    titleLetterSpacing,
    eyebrowLetterSpacing,
  });

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: "#eef3ff",
    },
  })
    .composite([
      {
        input: resizedBackground,
        left: IMAGE_X,
        top: IMAGE_Y,
      },
      {
        input: Buffer.from(overlaySvg),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
}
