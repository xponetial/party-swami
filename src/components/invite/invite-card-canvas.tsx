import Image from "next/image";
import type { InviteDesignData } from "@/lib/invite-design";
import type { InviteTemplate } from "@/lib/invite-template-types";

function getPosition(area: InviteTemplate["textSafeAreas"]["title"]) {
  switch (area) {
    case "upper_center":
      return "top-[18%]";
    case "top_center":
      return "top-[14%]";
    case "center":
    case "middle_center":
      return "top-1/2";
    case "lower_center":
      return "top-[86%]";
    case "bottom_center":
      return "top-[92%]";
    default:
      return "top-1/2";
  }
}

function getFontClasses(fontStyle: string) {
  if (fontStyle.includes("serif")) {
    return {
      title: "font-serif tracking-[0.08em]",
      details: "font-serif",
      cta: "font-serif tracking-[0.24em]",
    };
  }

  if (fontStyle.includes("rounded")) {
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

function compactCopy(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function InviteCardCanvas({
  template,
  design,
  alt,
  maxWidth = 340,
}: {
  template: InviteTemplate;
  design: InviteDesignData;
  alt: string;
  maxWidth?: number;
}) {
  const accents = template.overlay.text_colors;
  const fonts = getFontClasses(template.overlay.font_style);
  const previewMessage = compactCopy(design.fields.messageText, maxWidth >= 390 ? 420 : 320);

  return (
    <div
      className="relative mx-auto aspect-[2/3] w-full overflow-hidden rounded-[2rem] border border-white/60 shadow-party"
      style={{ maxWidth }}
    >
      <Image alt={alt} className="object-cover" fill sizes={`${maxWidth}px`} src={template.assetPath} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,30,0.12)_0%,rgba(14,19,60,0.06)_30%,rgba(8,12,36,0.34)_100%)]" />
      <div className="absolute inset-x-5 top-5 rounded-full border border-white/15 bg-[#080c24]/70 px-4 py-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.34em] text-white/80 backdrop-blur-md">
        Party Genie
      </div>

      <div
        className={`absolute left-1/2 w-[76%] -translate-x-1/2 -translate-y-1/2 text-center ${getPosition(
          template.textSafeAreas.title,
        )} ${fonts.title}`}
        style={{ color: accents[0] }}
      >
        <p className="text-[0.72rem] uppercase tracking-[0.32em] opacity-90">{design.fields.subtitle}</p>
        <h3 className="mt-3 text-3xl font-semibold leading-tight">{design.fields.title}</h3>
      </div>

      <div
        className={`absolute left-1/2 top-[60%] w-[84%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.6rem] border border-white/16 bg-[#080c24]/46 px-6 py-6 text-center text-[0.8rem] leading-[1.28rem] shadow-[0_18px_45px_rgba(8,12,36,0.32)] backdrop-blur-[6px] ${fonts.details}`}
        style={{ color: accents[0] }}
      >
        <p
          style={{
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: maxWidth >= 390 ? 11 : 9,
            display: "-webkit-box",
            overflow: "hidden",
          }}
        >
          {previewMessage}
        </p>
      </div>

      <div
        className={`absolute left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/24 bg-[linear-gradient(135deg,rgba(37,146,255,0.26),rgba(139,70,255,0.24))] px-4 py-3 text-center text-[0.68rem] font-semibold uppercase shadow-[0_14px_28px_rgba(17,28,84,0.26)] backdrop-blur-sm ${getPosition(
          template.textSafeAreas.cta,
        )} ${fonts.cta}`}
        style={{ color: accents[1] }}
      >
        {design.fields.ctaText}
      </div>
    </div>
  );
}
