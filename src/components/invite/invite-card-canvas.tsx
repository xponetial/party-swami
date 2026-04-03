import Image from "next/image";
import type { InviteDesignData } from "@/lib/invite-design";
import { compactInviteCopy, getInviteCardLayout } from "@/lib/invite-card-layout";
import type { InviteTemplate } from "@/lib/invite-template-types";

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
  const layout = getInviteCardLayout(template);
  const previewMessage = compactInviteCopy(design.fields.messageText, maxWidth >= 390 ? 420 : 320);

  return (
    <div
      className="relative mx-auto aspect-[2/3] w-full overflow-hidden rounded-[2rem] border border-white/60 shadow-party"
      style={{ maxWidth }}
    >
      <Image alt={alt} className="object-cover" fill sizes={`${maxWidth}px`} src={template.assetPath} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,30,0.12)_0%,rgba(14,19,60,0.06)_30%,rgba(8,12,36,0.34)_100%)]" />
      <div className="absolute inset-x-5 top-5 rounded-full border border-white/15 bg-[#080c24]/70 px-4 py-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.34em] text-white/80 backdrop-blur-md">
        AI Party Genie
      </div>

      <div
        className={`absolute left-1/2 w-[76%] -translate-x-1/2 -translate-y-1/2 text-center ${layout.previewFonts.title}`}
        style={{ color: layout.accents[0], top: `${layout.titleTop}%` }}
      >
        <p className="text-[0.72rem] uppercase tracking-[0.32em] opacity-90">{design.fields.subtitle}</p>
        <h3 className="mt-3 text-3xl font-semibold leading-tight">{design.fields.title}</h3>
      </div>

      <div
        className={`absolute left-1/2 w-[84%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.6rem] border border-white/16 bg-[#080c24]/46 px-6 py-6 text-center text-[0.8rem] leading-[1.28rem] shadow-[0_18px_45px_rgba(8,12,36,0.32)] backdrop-blur-[6px] ${layout.previewFonts.details}`}
        style={{ color: layout.accents[0], top: `${layout.detailsTop}%` }}
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
        className={`absolute left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/24 bg-[linear-gradient(135deg,rgba(37,146,255,0.26),rgba(139,70,255,0.24))] px-4 py-3 text-center text-[0.68rem] font-semibold uppercase shadow-[0_14px_28px_rgba(17,28,84,0.26)] backdrop-blur-sm ${layout.previewFonts.cta}`}
        style={{ color: layout.accents[1], top: `${layout.ctaTop}%` }}
      >
        {design.fields.ctaText}
      </div>
    </div>
  );
}
