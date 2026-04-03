import type { InviteTemplate, SafeArea } from "@/lib/invite-template-types";

type FontFlavor = "serif" | "rounded" | "sans";

export function getSafeAreaTopPercent(area: SafeArea) {
  switch (area) {
    case "upper_center":
      return 18;
    case "top_center":
      return 14;
    case "center":
    case "middle_center":
      return 50;
    case "lower_center":
      return 86;
    case "bottom_center":
      return 92;
    default:
      return 50;
  }
}

export function getFontFlavor(fontStyle: string): FontFlavor {
  if (fontStyle.includes("serif")) {
    return "serif";
  }

  if (fontStyle.includes("rounded")) {
    return "rounded";
  }

  return "sans";
}

export function getPreviewFontClasses(fontStyle: string) {
  const flavor = getFontFlavor(fontStyle);

  if (flavor === "serif") {
    return {
      title: "font-serif tracking-[0.08em]",
      details: "font-serif",
      cta: "font-serif tracking-[0.24em]",
    };
  }

  if (flavor === "rounded") {
    return {
      title: "font-sans tracking-[0.04em]",
      details: "font-sans",
      cta: "font-sans tracking-[0.16em]",
    };
  }

  return {
    title: "font-sans tracking-[0.06em]",
    details: "font-sans",
    cta: "font-sans tracking-[0.18em]",
  };
}

export function getEmailFontFamily(fontStyle: string) {
  const flavor = getFontFlavor(fontStyle);

  if (flavor === "serif") {
    return "Georgia, serif";
  }

  return "Arial, sans-serif";
}

export function getEmailTitleLetterSpacing(fontStyle: string) {
  const flavor = getFontFlavor(fontStyle);

  if (flavor === "serif") {
    return "0.04em";
  }

  if (flavor === "rounded") {
    return "0.01em";
  }

  return "0.02em";
}

export function getEmailEyebrowLetterSpacing(fontStyle: string) {
  const flavor = getFontFlavor(fontStyle);

  if (flavor === "serif") {
    return "0.22em";
  }

  if (flavor === "rounded") {
    return "0.12em";
  }

  return "0.16em";
}

export function compactInviteCopy(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function getTitleFontSize(title: string) {
  const length = title.trim().length;

  if (length > 34) {
    return 54;
  }

  if (length > 24) {
    return 62;
  }

  return 72;
}

export function formatTitleForCard(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 2) {
    return title.trim();
  }

  const midpoint = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, midpoint).join(" ");
  const secondLine = words.slice(midpoint).join(" ");

  return `${firstLine}\n${secondLine}`;
}

export function getInviteCardLayout(template: InviteTemplate) {
  const titleTop = getSafeAreaTopPercent(template.textSafeAreas.title);
  const detailsTop = getSafeAreaTopPercent(template.textSafeAreas.details);
  const ctaTop = getSafeAreaTopPercent(template.textSafeAreas.cta);

  return {
    titleTop,
    detailsTop,
    ctaTop,
    accents: template.overlay.text_colors,
    fontFlavor: getFontFlavor(template.overlay.font_style),
    previewFonts: getPreviewFontClasses(template.overlay.font_style),
    emailTitleFontFamily: getEmailFontFamily(template.overlay.font_style),
    emailTitleLetterSpacing: getEmailTitleLetterSpacing(template.overlay.font_style),
    emailEyebrowLetterSpacing: getEmailEyebrowLetterSpacing(template.overlay.font_style),
  };
}
