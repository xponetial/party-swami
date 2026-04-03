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

function getTitleLines(title: string) {
  return formatTitleForCard(title)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getTemplateBackground(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const absoluteAssetPath = path.join(process.cwd(), "public", normalizedAssetPath);

  return readFile(absoluteAssetPath);
}

function getInviteFontPath() {
  return path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "compiled",
    "@vercel",
    "og",
    "Geist-Regular.ttf",
  );
}

function buildFrameSvg() {
  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canvasBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#eef3ff" />
          <stop offset="100%" stop-color="#edf2ff" />
        </linearGradient>
      </defs>

      <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" rx="34" fill="url(#canvasBg)" />
      <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${FRAME_RADIUS}" fill="#131a4a" />
    </svg>
  `.trim();
}

function buildOverlaySvg(params: {
  detailsTop: number;
  ctaTop: number;
}) {
  const {
    detailsTop,
    ctaTop,
  } = params;
  const detailsBoxWidth = Math.round(IMAGE_WIDTH * 0.84);
  const detailsBoxHeight = 188;
  const detailsBoxX = Math.round((CANVAS_WIDTH - detailsBoxWidth) / 2);
  const detailsBoxY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * detailsTop) / 100 - detailsBoxHeight / 2);
  const ctaWidth = Math.round(IMAGE_WIDTH * 0.7);
  const ctaHeight = 84;
  const ctaX = Math.round((CANVAS_WIDTH - ctaWidth) / 2);
  const ctaY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * ctaTop) / 100 - ctaHeight / 2);

  return `
    <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
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

      <rect x="${IMAGE_X}" y="${IMAGE_Y}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="18" fill="rgba(255,255,255,0.08)" />
      <rect x="${IMAGE_X}" y="${IMAGE_Y}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="18" fill="url(#imageShade)" />

      <rect
        x="${detailsBoxX}"
        y="${detailsBoxY}"
        width="${detailsBoxWidth}"
        height="${detailsBoxHeight}"
        rx="28"
        fill="rgba(8,12,36,0.48)"
        stroke="rgba(255,255,255,0.18)"
      />

      <rect
        x="${ctaX}"
        y="${ctaY}"
        width="${ctaWidth}"
        height="${ctaHeight}"
        rx="42"
        fill="url(#ctaFill)"
        stroke="rgba(255,255,255,0.2)"
      />
    </svg>
  `.trim();
}

function escapePango(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function renderTextBuffer(params: {
  text: string;
  width: number;
  fontSize: number;
  color: string;
  fontPath: string;
}) {
  const { text, width, fontSize, color, fontPath } = params;

  return sharp({
    text: {
      text: `<span foreground="${color}">${escapePango(text)}</span>`,
      font: `InviteGeist ${fontSize}`,
      fontfile: fontPath,
      width,
      align: "center",
      rgba: true,
      wrap: "word-char",
    },
  })
    .png()
    .toBuffer();
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
  const fontPath = getInviteFontPath();
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
    detailsTop,
    ctaTop,
  });
  const frameSvg = buildFrameSvg();
  const titleLines = getTitleLines(design.fields.title);
  const titleFontSize = getTitleFontSize(design.fields.title);
  const titleCenterX = IMAGE_X + IMAGE_WIDTH / 2;
  const subtitleTop = Math.round(IMAGE_Y + (IMAGE_HEIGHT * titleTop) / 100 - 34);
  const titleTopY = subtitleTop + 44;
  const detailsBoxWidth = Math.round(IMAGE_WIDTH * 0.84);
  const detailsBoxX = Math.round((CANVAS_WIDTH - detailsBoxWidth) / 2);
  const detailsBoxY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * detailsTop) / 100 - 94);
  const ctaWidth = Math.round(IMAGE_WIDTH * 0.7);
  const ctaX = Math.round((CANVAS_WIDTH - ctaWidth) / 2);
  const ctaY = Math.round(IMAGE_Y + (IMAGE_HEIGHT * ctaTop) / 100 - 42);
  const eyebrowBuffer = await renderTextBuffer({
    text: design.fields.subtitle.toUpperCase(),
    width: IMAGE_WIDTH - 80,
    fontSize: 19,
    color: titleColor,
    fontPath,
  });
  const titleBuffer = await renderTextBuffer({
    text: titleLines.join("\n"),
    width: IMAGE_WIDTH - 60,
    fontSize: titleFontSize,
    color: titleColor,
    fontPath,
  });
  const messageBuffer = await renderTextBuffer({
    text: message,
    width: detailsBoxWidth - 56,
    fontSize: 21,
    color: titleColor,
    fontPath,
  });
  const ctaBuffer = await renderTextBuffer({
    text: design.fields.ctaText.toUpperCase(),
    width: ctaWidth - 36,
    fontSize: 22,
    color: ctaColor,
    fontPath,
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
        input: Buffer.from(frameSvg),
        left: 0,
        top: 0,
      },
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
      {
        input: eyebrowBuffer,
        left: Math.round(titleCenterX - (IMAGE_WIDTH - 80) / 2),
        top: subtitleTop,
      },
      {
        input: titleBuffer,
        left: Math.round(titleCenterX - (IMAGE_WIDTH - 60) / 2),
        top: titleTopY,
      },
      {
        input: messageBuffer,
        left: detailsBoxX + 28,
        top: detailsBoxY + 28,
      },
      {
        input: ctaBuffer,
        left: ctaX + 18,
        top: ctaY + 22,
      },
    ])
    .png()
    .toBuffer();
}
