import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  InviteTemplate,
  InviteTemplateCategory,
  OverlayRecommendation,
  SafeArea,
} from "@/lib/invite-template-types";

type GenericManifest = {
  version?: string;
  holiday?: string;
  templates?: Array<{
    template_id: string;
    category?: string;
    style: string;
    asset: string;
    orientation?: "vertical";
    text_safe_areas?: {
      title: SafeArea;
      details: SafeArea;
      cta: SafeArea;
    };
  }>;
};

type CodexManifest = {
  pack_id?: string;
  name?: string;
  version?: string;
  files?: Array<{
    file: string;
    template_id: string;
    style: string;
    category?: string;
    text_safe_areas?: {
      title: SafeArea;
      details: SafeArea;
      cta: SafeArea;
    };
    overlay_recommendations?: OverlayRecommendation;
  }>;
};

type TemplateAdminControl = {
  pack_slug: string;
  template_id: string;
  is_active: boolean;
  notes: string | null;
};

function slugifyLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const CATEGORY_OVERLAY_DEFAULTS: Record<string, OverlayRecommendation> = {
  anniversary: { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
  "baby-shower": { text_colors: ["#6B5B95", "#F4B6C2"], font_style: "rounded sans serif" },
  birthday: { text_colors: ["#FFFFFF", "#FFD54F"], font_style: "rounded sans serif" },
  "bridal-shower": { text_colors: ["#FFFFFF", "#F7D6E0"], font_style: "serif elegant" },
  christmas: { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
  diwali: { text_colors: ["#FFF6D5", "#FFB300"], font_style: "serif elegant" },
  easter: { text_colors: ["#5B4B8A", "#F4B6C2"], font_style: "rounded sans serif" },
  eid: { text_colors: ["#FFFFFF", "#D4AF37"], font_style: "serif elegant" },
  "fathers-day": { text_colors: ["#FFFFFF", "#D4AF37"], font_style: "clean sans serif" },
  graduation: { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
  halloween: { text_colors: ["#FFF5E6", "#FF8F00"], font_style: "rounded sans serif" },
  hanukkah: { text_colors: ["#FFFFFF", "#A7C7E7"], font_style: "serif elegant" },
  housewarming: { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "clean sans serif" },
  "4th-of-july": { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
  "mother-s-day": { text_colors: ["#FFFFFF", "#F4B6C2"], font_style: "serif elegant" },
  "new-year": { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
  "pool-party": { text_colors: ["#FFFFFF", "#4DD0E1"], font_style: "rounded sans serif" },
  "st-patrick-s-day": { text_colors: ["#FFFFFF", "#D4AF37"], font_style: "serif elegant" },
  sympathy: { text_colors: ["#FFFFFF", "#D7CCC8"], font_style: "serif elegant" },
  thanksgiving: { text_colors: ["#FFF5E6", "#FFB74D"], font_style: "serif elegant" },
  "valentine-s-day": { text_colors: ["#FFFFFF", "#F48FB1"], font_style: "serif elegant" },
  wedding: { text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" },
};

function inferOverlay(categoryLabel: string, style: string): OverlayRecommendation {
  const categoryKey = slugifyLabel(categoryLabel);
  const categoryDefault =
    CATEGORY_OVERLAY_DEFAULTS[categoryKey] ??
    ({ text_colors: ["#FFFFFF", "#F4D27A"], font_style: "serif elegant" } satisfies OverlayRecommendation);

  if (/modern|minimal|clean/i.test(style)) {
    return {
      text_colors: categoryDefault.text_colors,
      font_style: "clean sans serif",
    };
  }

  if (/fun|playful|pool|party|colorful/i.test(style)) {
    return {
      text_colors: categoryDefault.text_colors,
      font_style: "rounded sans serif",
    };
  }

  return categoryDefault;
}

function normalizeCategoryLabel(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeTemplate(
  packSlug: string,
  packLabel: string,
  item: {
    template_id: string;
    style: string;
    assetPath: string;
    categoryLabel: string;
    textSafeAreas?: {
      title: SafeArea;
      details: SafeArea;
      cta: SafeArea;
    };
    overlay?: OverlayRecommendation;
  },
): InviteTemplate {
  const categoryLabel = normalizeCategoryLabel(item.categoryLabel);

  return {
    templateId: item.template_id,
    style: titleCase(item.style),
    assetPath: `/invite-packs/${packSlug}/${item.assetPath.replace(/\\/g, "/")}`,
    categoryLabel,
    categoryKey: slugifyLabel(categoryLabel),
    packSlug,
    packLabel,
    orientation: "vertical",
    textSafeAreas: item.textSafeAreas ?? {
      title: "upper_center",
      details: "middle_center",
      cta: "lower_center",
    },
    overlay: item.overlay ?? inferOverlay(categoryLabel, item.style),
  };
}

function isCodexManifest(manifest: GenericManifest | CodexManifest): manifest is CodexManifest {
  return "files" in manifest;
}

function parseManifest(packSlug: string, manifest: GenericManifest | CodexManifest) {
  if (isCodexManifest(manifest) && manifest.files?.length) {
    const packLabel =
      manifest.name?.trim() ||
      titleCase(packSlug.replace(/_pack(_v\d+)?$/, ""));

    return manifest.files.map((item) =>
      normalizeTemplate(packSlug, packLabel, {
        template_id: item.template_id,
        style: item.style,
        assetPath: item.file,
        categoryLabel: item.category ?? packLabel,
        textSafeAreas: item.text_safe_areas,
        overlay: item.overlay_recommendations,
      }),
    );
  }

  const packLabel =
    (!isCodexManifest(manifest) ? manifest.holiday?.trim() : null) ||
    titleCase(packSlug.replace(/_pack(_v\d+)?$/, ""));
  const genericTemplates = isCodexManifest(manifest) ? [] : (manifest.templates ?? []);

  return genericTemplates.map((item) =>
    normalizeTemplate(packSlug, packLabel, {
      template_id: item.template_id,
      style: item.style,
      assetPath: item.asset,
      categoryLabel: item.category ?? packLabel,
      textSafeAreas: item.text_safe_areas,
    }),
  );
}

async function getTemplateAdminControls() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("template_admin_controls")
      .select("pack_slug, template_id, is_active, notes")
      .returns<TemplateAdminControl[]>();

    if (error) {
      return new Map<string, TemplateAdminControl>();
    }

    return new Map((data ?? []).map((item) => [`${item.pack_slug}:${item.template_id}`, item] as const));
  } catch {
    return new Map<string, TemplateAdminControl>();
  }
}

export const getInviteTemplateCatalog = cache(async (includeInactive = false): Promise<InviteTemplateCategory[]> => {
  const invitePacksDir = path.join(process.cwd(), "public", "invite-packs");
  const packDirs = await fs.readdir(invitePacksDir, { withFileTypes: true });
  const templates: InviteTemplate[] = [];
  const adminControls = await getTemplateAdminControls();

  for (const packDir of packDirs) {
    if (!packDir.isDirectory()) continue;

    const manifestPath = path.join(invitePacksDir, packDir.name, "manifest.json");
    const manifestText = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestText) as GenericManifest | CodexManifest;
    templates.push(...parseManifest(packDir.name, manifest));
  }

  const grouped = new Map<string, InviteTemplateCategory>();

  for (const template of templates) {
    const control = adminControls.get(`${template.packSlug}:${template.templateId}`);
    if (!includeInactive && control?.is_active === false) {
      continue;
    }

    const existing = grouped.get(template.categoryKey);
    if (existing) {
      existing.templates.push(template);
      continue;
    }

    grouped.set(template.categoryKey, {
      key: template.categoryKey,
      label: template.categoryLabel,
      templates: [template],
    });
  }

  return [...grouped.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((category) => ({
      ...category,
      templates: category.templates.sort((a, b) => a.style.localeCompare(b.style)),
    }));
});
