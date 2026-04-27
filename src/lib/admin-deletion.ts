import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type UserForDeletion = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string | null;
};

export type DeletionResult = {
  success: boolean;
  steps: string[];
  error?: string;
};

export async function lookupUserByEmail(email: string): Promise<UserForDeletion | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("admin_lookup_user_by_email", { p_email: email });
  if (error || !data || data.length === 0) return null;

  const row = data[0] as { id: string; email: string; created_at: string };

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", row.id)
    .maybeSingle<{ full_name: string | null }>();

  return {
    id: row.id,
    email: row.email,
    fullName: profile?.full_name ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function deleteUserData(
  targetUserId: string,
  performedByAdminId: string,
): Promise<DeletionResult> {
  const admin = createSupabaseAdminClient();
  const steps: string[] = [];

  // Fetch the auth user to capture the email for the audit record
  const { data: authData, error: fetchError } = await admin.auth.admin.getUserById(targetUserId);
  if (fetchError || !authData.user) {
    return { success: false, steps, error: "User not found in auth system" };
  }

  const targetEmail = authData.user.email ?? "";
  const emailHash = createHash("sha256").update(targetEmail.toLowerCase()).digest("hex");

  // Create the pending deletion log
  const { data: log } = await admin
    .from("user_deletion_logs")
    .insert({
      target_user_id: targetUserId,
      target_email_hash: emailHash,
      performed_by_admin_id: performedByAdminId,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  const logId = log?.id ?? null;

  const finalizeLog = async (status: "completed" | "failed", errorDetail?: string) => {
    if (!logId) return;
    await admin
      .from("user_deletion_logs")
      .update({
        status,
        steps_completed: steps,
        error_detail: errorDetail ?? null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", logId);
  };

  try {
    // Step 1: Anonymize marketplace_leads — these survive deletion because consumer_id is set null,
    // but contact_name/email/phone would remain as PII without this step.
    const anonymizedEmail = `deleted_user_${targetUserId}@partyswami.com`;
    await admin
      .from("marketplace_leads")
      .update({
        contact_name: "Deleted User",
        contact_email: anonymizedEmail,
        contact_phone: null,
      })
      .eq("consumer_id", targetUserId);
    steps.push("anonymized_marketplace_leads");

    // Step 2: Delete the auth user.
    // Cascade rules handle: profiles, events, vendors, planners, party_plans, guests,
    // guest_messages, invites, invite_generated_images, shopping_lists, shopping_items,
    // tasks, timeline_items, plan_versions, ai_generations, marketplace_leads (vendor/planner side),
    // user_usage_monthly, user_image_monthly_allowances, user_image_pack_grants.
    // analytics_events and audit_logs are preserved with user_id set null.
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      await finalizeLog("failed", deleteError.message);
      return { success: false, steps, error: deleteError.message };
    }
    steps.push("deleted_auth_user");

    // Step 3: Write a permanent compliance audit entry.
    // user_id is null here because the auth user no longer exists.
    await admin.from("audit_logs").insert({
      user_id: null,
      action: "user_data_deleted",
      metadata: {
        target_user_id: targetUserId,
        target_email_hash: emailHash,
        performed_by_admin_id: performedByAdminId,
        steps_completed: [...steps, "audit_log_written"],
      },
    });
    steps.push("audit_log_written");

    await finalizeLog("completed");
    return { success: true, steps };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during deletion";
    await finalizeLog("failed", message);
    return { success: false, steps, error: message };
  }
}
