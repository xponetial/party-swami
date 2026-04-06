"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const planTierSchema = z.object({
  userId: z.string().uuid(),
  planTier: z.enum(["free", "pro", "admin"]),
});

const templateControlSchema = z.object({
  packSlug: z.string().min(1),
  templateId: z.string().min(1),
  isActive: z.coerce.boolean(),
});

export async function updateAdminUserPlanTierAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = planTierSchema.safeParse({
    userId: formData.get("userId"),
    planTier: formData.get("planTier"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid plan tier update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ plan_tier: parsed.data.planTier })
    .eq("id", parsed.data.userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/dashboard");
}

export async function updateTemplateControlAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = templateControlSchema.safeParse({
    packSlug: formData.get("packSlug"),
    templateId: formData.get("templateId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid template control update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("template_admin_controls").upsert(
    {
      pack_slug: parsed.data.packSlug,
      template_id: parsed.data.templateId,
      is_active: parsed.data.isActive,
    },
    { onConflict: "pack_slug,template_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/templates");
  revalidatePath("/events/new");
  revalidatePath("/dashboard");
}
